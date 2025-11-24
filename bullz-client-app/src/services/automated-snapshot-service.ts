

import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { TradeEventListener } from './trade-event-listener';
import { TradeAggregationService } from './trade-aggregation';
import { WalrusEncryptedUploadService, WalrusEncryptedUploadConfig } from './walrus-encrypted-upload';
// import { SealConfig } from './seal-service';

export interface AutomatedSnapshotConfig {
  
  suiClient: SuiClient;
  network: 'testnet' | 'mainnet'; 
  
  
  packageId: string;
  adminCapId: string;
  tradingSentimentStateId: string;
  
  
  adminSigner: Ed25519Keypair;
  
  
  // sealConfig: SealConfig;
  
  
  snapshotIntervalMs?: number; // How often to create snapshots (default: 5 minutes)
  identityId?: string; 
  encryptionThreshold?: number; 
  
  
  walrusEpochs?: number; 
  walrusDeletable?: boolean; 
  
  
    maxRetries?: number; 
  retryDelayMs?: number; 
  
 
  onSnapshotCreated?: (metadata: { blobId: string; version: number; timestamp: number }) => void;
  onError?: (error: Error) => void;
}

export class AutomatedSnapshotService {
  private config: Required<Omit<AutomatedSnapshotConfig, 'onSnapshotCreated' | 'onError'>> & {
    onSnapshotCreated?: (metadata: { blobId: string; version: number; timestamp: number }) => void;
    onError?: (error: Error) => void;
  };
  private tradeEventListener: TradeEventListener;
  private aggregationService: TradeAggregationService;
  private uploadService: WalrusEncryptedUploadService;
  private snapshotInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastSnapshotTime: number = 0;

  constructor(config: AutomatedSnapshotConfig) {
   
    this.config = {
      snapshotIntervalMs: config.snapshotIntervalMs ?? 5 * 60 * 1000, 
      identityId: config.identityId ?? this.generateIdentityId(),
      encryptionThreshold: config.encryptionThreshold ?? 1,
      walrusEpochs: config.walrusEpochs ?? 10,
      walrusDeletable: config.walrusDeletable ?? false,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 5000,
      onSnapshotCreated: config.onSnapshotCreated,
      onError: config.onError,
      ...config,
    };

   
    this.tradeEventListener = new TradeEventListener(this.config.suiClient, {
      packageId: this.config.packageId,
      network: this.config.network,
      onTrade: (event) => {
        this.aggregationService.addTrade(event);
      },
      onError: (error) => {
        console.error('Trade event listener error:', error);
        this.config.onError?.(error);
      },
    });

   
    this.aggregationService = new TradeAggregationService();

   
    const uploadConfig: WalrusEncryptedUploadConfig = {
      network: this.config.network,
      signer: this.config.adminSigner,
      // sealConfig: this.config.sealConfig,
      epochs: this.config.walrusEpochs,
      deletable: this.config.walrusDeletable,
      onChainStorage: {
        packageId: this.config.packageId,
        adminCapId: this.config.adminCapId,
        tradingSentimentStateId: this.config.tradingSentimentStateId,
      },
      retryConfig: {
        maxRetries: this.config.maxRetries,
        retryDelayMs: this.config.retryDelayMs,
      },
    };
    this.uploadService = new WalrusEncryptedUploadService(uploadConfig);
  }


  
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Automated snapshot service is already running');
      return;
    }

    console.log('Starting automated snapshot service...');
    this.isRunning = true;

    try {
      await this.tradeEventListener.startListening();
      console.log('Trade event listener started');
    } catch (error) {
      console.error('Failed to start trade event listener:', error);
      this.isRunning = false;
      throw error;
    }

    // Create initial snapshot
    console.log('[SnapshotService] Creating initial snapshot...');
    try {
      await this.createSnapshot();
      console.log('[SnapshotService] Initial snapshot created successfully');
    } catch (error) {
      console.error('[SnapshotService] Failed to create initial snapshot:', error);
      // Don't throw - allow service to continue running and retry on next interval
      this.config.onError?.(error as Error);
    }

    this.snapshotInterval = setInterval(() => {
      this.createSnapshot().catch((error) => {
        console.error('Error creating scheduled snapshot:', error);
        this.config.onError?.(error);
      });
    }, this.config.snapshotIntervalMs);

    console.log(`Automated snapshot service started (interval: ${this.config.snapshotIntervalMs}ms)`);
  }

  stop(): void {
    if (!this.isRunning) {
      console.warn('Automated snapshot service is not running');
      return;
    }

    console.log('Stopping automated snapshot service...');
    this.isRunning = false;

    this.tradeEventListener.stopListening();

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    console.log('Automated snapshot service stopped');
  }

  async createSnapshot(): Promise<{
    blobId: string;
    version: number;
    timestamp: number;
  }> {
    try {
      const aggregatedSentiment = this.aggregationService.getAggregatedSentiment();
      console.log(`[SnapshotService] Creating snapshot...`);
      console.log(`[SnapshotService] Total assets tracked: ${aggregatedSentiment.length}`);
      console.log(`[SnapshotService] Total trades in aggregation: ${this.aggregationService.getTradeCount()}`);
      const startTime = Date.now();

      // Upload to Walrus without encryption
      const metadata = await this.uploadService.uploadSnapshotWithoutEncryption(
        this.aggregationService,
        true 
      );

      const snapshotInfo = {
        blobId: metadata.blobId,
        version: 0, 
        timestamp: metadata.encryptedAt,
      };

      this.lastSnapshotTime = snapshotInfo.timestamp;
      const duration = Date.now() - startTime;

      console.log(`Snapshot created successfully in ${duration}ms:`, snapshotInfo);

      
      this.config.onSnapshotCreated?.(snapshotInfo);

      return snapshotInfo;
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }


  getStatus(): {
    isRunning: boolean;
    lastSnapshotTime: number;
    snapshotIntervalMs: number;
    assetCount: number;
  } {
    const sentiment = this.aggregationService.getAggregatedSentiment();
    return {
      isRunning: this.isRunning,
      lastSnapshotTime: this.lastSnapshotTime,
      snapshotIntervalMs: this.config.snapshotIntervalMs,
      assetCount: sentiment.length,
    };
  }


  getAggregatedSentiment() {
    return this.aggregationService.getAggregatedSentiment();
  }


  private generateIdentityId(): string {
   
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).substring(2, 10);
    return `0x${timestamp}${random}`;
  }

  /**
   * Clean up old snapshots (keeps last N snapshots)
   * Note: This is a placeholder - actual cleanup would need to track blob IDs
   */
  async cleanupOldSnapshots(keepLastN: number = 10): Promise<void> {
    // TODO: Implement cleanup logic
    // This would require tracking blob IDs and calling Walrus delete API
    console.log(`Cleanup old snapshots (keeping last ${keepLastN}) - not implemented yet`);
  }
}

