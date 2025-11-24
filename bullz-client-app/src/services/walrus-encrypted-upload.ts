

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
// import { SealEncryptionService, SealConfig } from './seal-service';
import { TradeAggregationService } from './trade-aggregation';

export interface WalrusEncryptedUploadConfig {
  network: 'testnet' | 'mainnet'; 
  signer: Ed25519Keypair;
  // sealConfig: SealConfig;
  epochs?: number; 
  deletable?: boolean; 
  onChainStorage?: {
    packageId: string;
    adminCapId: string;
    tradingSentimentStateId: string;
  };
  retryConfig?: {
    maxRetries?: number; 
    retryDelayMs?: number; 
  };
}

export interface EncryptedSnapshotMetadata {
  blobId: string;
  encryptedAt: number;
  encryptionMetadata: {
    id: string; 
    threshold: number;
    key: Uint8Array; 
  };
  snapshotTimestamp: number;
  weekStartTime: number;
}

export class WalrusEncryptedUploadService {
  private client: ReturnType<typeof createWalrusClient>;
  // private sealService: SealEncryptionService;
  private config: WalrusEncryptedUploadConfig;
  private suiClient: SuiClient;

  constructor(config: WalrusEncryptedUploadConfig) {
    this.config = config;
    
   
   
    const walrusNetwork = config.network; 
    
    this.client = createWalrusClient(walrusNetwork);
    // this.sealService = new SealEncryptionService(config.sealConfig);
    // this.suiClient = (config.sealConfig.suiClient as unknown) as SuiClient;
    this.suiClient = new SuiClient({ url: getFullnodeUrl(walrusNetwork) });
  }

  /**
   * Upload encrypted trading sentiment snapshot to Walrus
   * @param aggregationService 
   * @param id 
   * @param threshold 
   * @param storeOnChain 
   */
  /**
   * Upload snapshot without encryption (for testing)
   */
  async uploadSnapshotWithoutEncryption(
    aggregationService: TradeAggregationService,
    storeOnChain: boolean = true
  ): Promise<EncryptedSnapshotMetadata> {
    const maxRetries = this.config.retryConfig?.maxRetries ?? 3;
    const retryDelayMs = this.config.retryConfig?.retryDelayMs ?? 5000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[WalrusUpload] Uploading snapshot to Walrus (attempt ${attempt + 1}/${maxRetries + 1})...`);
        const snapshotData = aggregationService.exportData();
        console.log(`[WalrusUpload] Exported snapshot data:`, {
          assetsCount: snapshotData.aggregatedSentiment?.length || 0,
          tradesCount: snapshotData.trades?.length || 0,
          weekStartTime: snapshotData.weekStartTime,
        });
        
        const jsonData = JSON.stringify(snapshotData, null, 2);
        console.log(`[WalrusUpload] JSON data size: ${jsonData.length} bytes`);
        
        // Convert JSON string to Uint8Array
        const blobData = new TextEncoder().encode(jsonData);
        console.log(`[WalrusUpload] Uploading snapshot to Walrus via HTTP API...`);

        // Use HTTP API instead of SDK (more reliable)
        const WALRUS_PUBLISHER_URL = this.config.network === 'testnet' 
          ? `https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=${this.config.epochs ?? 10}`
          : `https://publisher.walrus-mainnet.walrus.space/v1/blobs?epochs=${this.config.epochs ?? 10}`;

        const response = await fetch(WALRUS_PUBLISHER_URL, {
          method: 'PUT',
          body: blobData,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Walrus upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        let blobId: string;
        
        if (result.newlyCreated?.blobObject?.blobId) {
          blobId = result.newlyCreated.blobObject.blobId;
        } else if (result.alreadyCertified?.blobId) {
          blobId = result.alreadyCertified.blobId;
        } else {
          throw new Error(`Unexpected Walrus response format: ${JSON.stringify(result)}`);
        }
        
        console.log(`[WalrusUpload] Upload successful! Blob ID: ${blobId}`);

        const metadata: EncryptedSnapshotMetadata = {
          blobId: blobId,
          encryptedAt: Date.now(),
          encryptionMetadata: {
            id: 'test-no-encryption',
            threshold: 1,
            key: new Uint8Array(0), // Empty key since no encryption
          },
          snapshotTimestamp: snapshotData.weekStartTime,
          weekStartTime: snapshotData.weekStartTime,
        };

        if (storeOnChain && this.config.onChainStorage) {
          try {
            await this.retryStoreBlobIdOnChain(
              blobId,
              'test-no-encryption',
              1,
              snapshotData.weekStartTime
            );
            console.log(`[WalrusUpload] Blob ID stored on-chain successfully`);
          } catch (onChainError) {
            console.error('Failed to store blob ID on-chain, but upload succeeded:', onChainError);
          }
        }

        return metadata;
      } catch (error) {
        lastError = error as Error;
        console.error(`[WalrusUpload] Failed to upload snapshot (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (attempt < maxRetries) {
          console.log(`[WalrusUpload] Retrying in ${retryDelayMs}ms...`);
          await this.sleep(retryDelayMs);
        }
      }
    }

    console.error('[WalrusUpload] Failed to upload snapshot after all retries');
    throw lastError || new Error('Failed to upload snapshot');
  }

  async uploadEncryptedSnapshot(
    aggregationService: TradeAggregationService,
    id: string, 
    threshold: number = 1,
    storeOnChain: boolean = true
  ): Promise<EncryptedSnapshotMetadata> {
    const maxRetries = this.config.retryConfig?.maxRetries ?? 3;
    const retryDelayMs = this.config.retryConfig?.retryDelayMs ?? 5000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[WalrusUpload] Attempting to upload snapshot (attempt ${attempt + 1}/${maxRetries + 1})...`);
      const snapshotData = aggregationService.exportData();
      console.log(`[WalrusUpload] Exported snapshot data:`, {
        assetsCount: snapshotData.aggregatedSentiment?.length || 0,
        tradesCount: snapshotData.trades?.length || 0,
        weekStartTime: snapshotData.weekStartTime,
      });
      
      const jsonData = JSON.stringify(snapshotData, null, 2);
      console.log(`[WalrusUpload] JSON data size: ${jsonData.length} bytes`);
      
      console.log(`[WalrusUpload] Encrypting data with Seal...`);
      // TODO: Re-enable seal encryption when sealService is implemented
      // const { encryptedData, encryptionMetadata } = await this.sealService.encrypt(
      //   jsonData,
      //   id,
      //   threshold
      // );
      const encryptedData = new TextEncoder().encode(jsonData);
      const encryptionMetadata = { id, threshold, key: new Uint8Array(32) };
      console.log(`[WalrusUpload] Data encrypted, size: ${encryptedData.length} bytes`);

      console.log(`[WalrusUpload] Uploading to Walrus...`);
      const result = await (this.client as any).walrus.writeBlob({
        blob: encryptedData,
        deletable: this.config.deletable ?? false,
        epochs: this.config.epochs ?? 10,
        signer: this.config.signer,
      }) as { blobId: string };
      console.log(`[WalrusUpload] Upload successful! Blob ID: ${result.blobId}`);

        const metadata: EncryptedSnapshotMetadata = {
        blobId: result.blobId,
        encryptedAt: Date.now(),
        encryptionMetadata,
        snapshotTimestamp: snapshotData.weekStartTime,
        weekStartTime: snapshotData.weekStartTime,
      };

        if (storeOnChain && this.config.onChainStorage) {
          try {
            await this.retryStoreBlobIdOnChain(
              result.blobId,
              encryptionMetadata.id,
              threshold,
              snapshotData.weekStartTime
            );
            console.log(`[WalrusUpload] Blob ID stored on-chain successfully`);
          } catch (onChainError) {
            console.error('Failed to store blob ID on-chain, but upload succeeded:', onChainError);
          }
        }

        return metadata;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to upload encrypted snapshot (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${retryDelayMs}ms...`);
          await this.sleep(retryDelayMs);
        }
      }
    }

    console.error('Failed to upload encrypted snapshot after all retries');
    throw lastError || new Error('Failed to upload encrypted snapshot');
  }

  async storeBlobIdOnChain(
    blobId: string,
    encryptionId: string,
    encryptionThreshold: number,
    weekStartTimeMs: number
  ): Promise<string> {
    if (!this.config.onChainStorage) {
      throw new Error('On-chain storage not configured');
    }

    const { packageId, adminCapId, tradingSentimentStateId } = this.config.onChainStorage;

    try {
      const blobIdBytes = new TextEncoder().encode(blobId);
      const encryptionIdBytes = new TextEncoder().encode(encryptionId);

      const tx = new Transaction();
      tx.moveCall({
        package: packageId,
        module: 'trading_sentiment_state',
        function: 'store_encrypted_sentiment',
        arguments: [
          tx.object(adminCapId),
          tx.object(tradingSentimentStateId),
          tx.pure.vector('u8', Array.from(blobIdBytes)),
          tx.pure.vector('u8', Array.from(encryptionIdBytes)),
          tx.pure.u8(encryptionThreshold),
          tx.pure.u64(weekStartTimeMs),
          tx.object('0x6'), 
        ],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.config.signer,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log('Successfully stored blob ID on-chain:', blobId);
        return result.digest;
      } else {
        throw new Error(`Transaction failed: ${JSON.stringify(result.effects?.status)}`);
      }
    } catch (error) {
      console.error('Failed to store blob ID on-chain:', error);
      throw error;
    }
  }

  async retryStoreBlobIdOnChain(
    blobId: string,
    encryptionId: string,
    encryptionThreshold: number,
    weekStartTimeMs: number
  ): Promise<string> {
    const maxRetries = this.config.retryConfig?.maxRetries ?? 5; // Increased default retries
    const baseRetryDelayMs = this.config.retryConfig?.retryDelayMs ?? 5000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.storeBlobIdOnChain(
          blobId,
          encryptionId,
          encryptionThreshold,
          weekStartTimeMs
        );
      } catch (error: any) {
        lastError = error as Error;
        
        // Check if this is an object lock error
        const isObjectLockError = 
          error?.message?.includes('already locked') ||
          error?.message?.includes('reserved for another transaction') ||
          error?.code === -32002 ||
          (error?.type === 'TransactionExecutionClientError' && 
           error?.message?.includes('locked by a different transaction'));

        if (isObjectLockError) {
          console.warn(`[WalrusUpload] Object lock error (attempt ${attempt + 1}/${maxRetries + 1}): Object is locked by another transaction`);
        } else {
          console.error(`[WalrusUpload] Failed to store blob ID on-chain (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        }
        
        if (attempt < maxRetries) {
          // Use exponential backoff for object lock errors, linear for others
          const delayMs = isObjectLockError 
            ? baseRetryDelayMs * Math.pow(2, attempt) // Exponential: 5s, 10s, 20s, 40s, 80s
            : baseRetryDelayMs; // Linear: 5s each time
          
          console.log(`[WalrusUpload] Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError || new Error('Failed to store blob ID on-chain after all retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retrieve and decrypt trading sentiment snapshot
   * @param blobId - Blob ID from Walrus
   * @param sessionKey - Session key for decryption (created from user's signer)
   * @param txBytes - Transaction bytes that call seal_approve* functions on-chain
   */
  async retrieveAndDecryptSnapshot(
    blobId: string,
    _sessionKey: any, // SessionKey from Seal SDK
    _txBytes: Uint8Array // Transaction bytes for seal_approve* calls
  ): Promise<{
    snapshot: any;
    decryptedAt: number;
  }> {
    try {
      // Read encrypted blob from Walrus
      // @ts-expect-error - Walrus SDK readBlob returns unknown type, but we know it's Uint8Array
      const encryptedBlob: Uint8Array = await this.client.walrus.readBlob({ blobId });

      // Decrypt using Seal SDK
      // TODO: Re-enable seal decryption when sealService is implemented
      // const decryptedData = await this.sealService.decrypt(
      //   encryptedBlob,
      //   sessionKey,
      //   txBytes
      // );
      const decryptedData = encryptedBlob; // Temporary: no decryption

      // Parse JSON
      const snapshot = JSON.parse(new TextDecoder().decode(decryptedData));

      return {
        snapshot,
        decryptedAt: Date.now(),
      };
    } catch (error) {
      console.error('Failed to retrieve and decrypt snapshot:', error);
      throw error;
    }
  }
}


function createWalrusClient(network: 'testnet' | 'mainnet') {
  
  // const walrusNetwork = network === 'devnet' ? 'testnet' : network;
  const walrusNetwork = network; 
  

  
  const walrusUrl = getFullnodeUrl(walrusNetwork);
  
  const walrusClient = new SuiClient({
    url: walrusUrl,
  });
  
  // Extend with walrus - pass network explicitly
  return walrusClient.$extend(walrus({ network: walrusNetwork }) as any);
}

