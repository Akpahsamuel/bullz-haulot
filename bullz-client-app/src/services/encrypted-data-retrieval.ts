

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { walrus } from '@mysten/walrus';
import { fromHex } from '@mysten/sui/utils';
import { SealEncryptionService, SealConfig } from './seal-service';
import type { Signer } from '@mysten/sui/cryptography';
import { AccessControlMiddleware, AccessCheckResult } from './access-control-middleware';

export interface EncryptedDataRetrievalConfig {
  network: 'testnet' | 'mainnet'; 
  suiClient: SuiClient;
  sealConfig: SealConfig;
  packageId: string;
  tradingSentimentStateId: string;
  subscriptionRegistryId: string;
  subscriptionConfigId: string;
}

export interface TradingSentimentData {
  assets: Array<{
    symbol: string;
    totalSharesTraded: number;
    uniqueBuyers: number;
    uniqueBuyersThisWeek: number;
    sharesBought: number;
    sharesSold: number;
    avgSharesPerUser: number;
    tradingVolume5M: number;
    tradingVolume1H: number;
    tradingVolume24H: number;
    tradingVolume1W: number;
    buyCount: number;
    sellCount: number;
    rank: number;
  }>;
  weekStartTime: number;
  lastUpdateTime: number;
}

export class EncryptedDataRetrievalService {
  private config: EncryptedDataRetrievalConfig;
  private walrusClient: ReturnType<typeof createWalrusClient>;
  private sealService: SealEncryptionService;
  private accessControl: AccessControlMiddleware;

  constructor(config: EncryptedDataRetrievalConfig) {
    this.config = config;
    this.walrusClient = createWalrusClient(config.network);
    this.sealService = new SealEncryptionService(config.sealConfig);
    
    
    this.accessControl = new AccessControlMiddleware({
      suiClient: config.suiClient,
      packageId: config.packageId,
      subscriptionRegistryId: config.subscriptionRegistryId,
      subscriptionConfigId: config.subscriptionConfigId,
      tradingSentimentStateId: config.tradingSentimentStateId,
      rateLimitConfig: {
        maxRequestsPerMinute: 60,
        maxRequestsPerHour: 300,
        windowMs: 60000,
      },
    });
  }

  /**
   * Check if user has subscription access
   * @deprecated Use checkAccess() instead for comprehensive access control
   */
  async checkSubscriptionAccess(userAddress: string): Promise<boolean> {
    const accessResult = await this.accessControl.checkAccess(userAddress);
    return accessResult.hasAccess;
  }

 
  async checkAccess(userAddress: string): Promise<AccessCheckResult> {
    return this.accessControl.checkAccess(userAddress);
  }

  
  async getLatestBlobId(): Promise<{
    blobId: string;
    encryptionId: string;
    encryptionThreshold: number;
    version: number;
    timestamp: number;
  }> {
    try {
      const state = await this.config.suiClient.getObject({
        id: this.config.tradingSentimentStateId,
        options: {
          showContent: true,
        },
      });

      if (!state.data || !('content' in state.data) || !state.data.content) {
        throw new Error('Failed to fetch TradingSentimentState');
      }

      if (state.data.content.dataType !== 'moveObject') {
        throw new Error('TradingSentimentState is not a moveObject');
      }

      const fields = (state.data.content as unknown as {
        dataType: 'moveObject';
        fields: {
          latest_blob_id: string;
          encryption_id: string;
          encryption_threshold: string;
          version: string;
          last_update_ts_ms: string;
        };
      }).fields;

      return {
        blobId: fields.latest_blob_id,
        encryptionId: fields.encryption_id,
        encryptionThreshold: parseInt(fields.encryption_threshold),
        version: parseInt(fields.version),
        timestamp: parseInt(fields.last_update_ts_ms),
      };
    } catch (error) {
      console.error('Error getting latest blob ID:', error);
      throw error;
    }
  }

  /**
   * Build transaction bytes for seal_approve* calls
   * This creates a transaction that approves decryption for the user
   */
  async buildSealApproveTransaction(
    encryptionId: string,
    userAddress: string,
    signer: Signer
  ): Promise<Uint8Array> {
    try {
      // Create session key first
      await this.sealService.createSessionKey(
        signer,
        60 // 60 minutes TTL
      );

      // Build transaction to call seal_approve* functions
      // Note: This depends on the Seal package structure
      // For now, we'll create a placeholder transaction
      // In production, this should call the actual seal_approve functions
      const tx = new Transaction();
      
      // The actual seal_approve call would go here
      // This is a placeholder - actual implementation depends on Seal package structure
      // Note: encryptionId is a hex string (identity ID) that needs to be converted to vector<u8>
      // userAddress is an address string
      tx.moveCall({
        target: `${this.config.sealConfig.packageId}::seal::approve`,
        arguments: [
          tx.pure.vector('u8', Array.from(fromHex(encryptionId))),
          tx.pure.address(userAddress),
        ],
      });

      // Build transaction bytes
      const txBytes = await tx.build({ client: this.config.suiClient });
      return txBytes;
    } catch (error) {
      console.error('Error building seal approve transaction:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt trading sentiment data
   * @param userAddress - User's address for subscription check
   * @param signer - User's signer for creating session key
   */
  async retrieveAndDecryptSentimentData(
    userAddress: string,
    signer: Signer
  ): Promise<TradingSentimentData> {
    try {
      // Step 1: Check access using middleware (subscription, rate limiting, etc.)
      const accessResult = await this.checkAccess(userAddress);
      if (!accessResult.hasAccess) {
        const errorMessage = accessResult.message || 'Access denied';
        const error = new Error(errorMessage);
        (error as any).accessResult = accessResult;
        throw error;
      }

      // Step 2: Get latest blob ID and encryption metadata
      const { blobId, encryptionId } = await this.getLatestBlobId();
      
      if (!blobId || blobId === '') {
        throw new Error('No sentiment data available');
      }

      // Step 3: Fetch encrypted blob from Walrus
      // @ts-expect-error - Walrus SDK readBlob returns unknown type, but we know it's Uint8Array
      const encryptedBlob: Uint8Array = await this.walrusClient.walrus.readBlob({ blobId });

      // Step 4: Create session key
      const sessionKey = await this.sealService.createSessionKey(signer, 60);

      // Step 5: Build transaction bytes for seal_approve*
      // Note: The actual seal_approve call should be made on-chain before decryption
      // This is a placeholder - in production, build the actual transaction
      // that calls seal_approve functions from the Seal package
      let txBytes: Uint8Array;
      try {
        txBytes = await this.buildSealApproveTransaction(encryptionId, userAddress, signer);
      } catch (error) {
        console.warn('Could not build seal_approve transaction, using empty bytes:', error);
        // For now, use empty bytes - in production this must be properly implemented
        txBytes = new Uint8Array(0);
      }

      // Step 6: Decrypt data
      const decryptedData = await this.sealService.decrypt(
        encryptedBlob,
        sessionKey,
        txBytes
      );

      // Step 7: Parse JSON
      const snapshot = JSON.parse(new TextDecoder().decode(decryptedData));

      // Transform exported data structure to expected format
      // exportData() returns { aggregatedSentiment, weekStartTime, trades }
      // We need to map it to { assets, weekStartTime, lastUpdateTime }
      const aggregatedSentiment = snapshot.aggregatedSentiment || snapshot.assets || [];
      const assets = Array.isArray(aggregatedSentiment) 
        ? aggregatedSentiment.map((asset: any) => ({
            symbol: asset.symbol || '',
            totalSharesTraded: asset.totalSharesTraded || 0,
            uniqueBuyers: asset.uniqueBuyersCount || asset.uniqueBuyers || 0,
            uniqueBuyersThisWeek: asset.uniqueBuyersThisWeekCount || asset.uniqueBuyersThisWeek || 0,
            sharesBought: asset.sharesBought || 0,
            sharesSold: asset.sharesSold || 0,
            avgSharesPerUser: asset.avgSharesPerUser || 0,
            tradingVolume5M: asset.tradingVolume5M || 0,
            tradingVolume1H: asset.tradingVolume1H || 0,
            tradingVolume24H: asset.tradingVolume24H || 0,
            tradingVolume1W: asset.tradingVolume1W || 0,
            buyCount: asset.buyCount || 0,
            sellCount: asset.sellCount || 0,
            rank: asset.rank || 0,
          }))
        : [];
      
      return {
        assets,
        weekStartTime: snapshot.weekStartTime || Date.now(),
        lastUpdateTime: snapshot.lastUpdateTime || Date.now(),
      };
    } catch (error) {
      console.error('Error retrieving and decrypting sentiment data:', error);
      throw error;
    }
  }

 
  async getSentimentMetadata(): Promise<{
    version: number;
    timestamp: number;
    hasData: boolean;
  }> {
    try {
      const { version, timestamp, blobId } = await this.getLatestBlobId();
      
      return {
        version,
        timestamp,
        hasData: blobId !== '',
      };
    } catch (error) {
      console.error('Error getting sentiment metadata:', error);
      throw error;
    }
  }
}


function createWalrusClient(network: 'testnet' | 'mainnet') {
  // Walrus client requires network parameter to be passed explicitly
  const client = new SuiClient({
    url: getFullnodeUrl(network),
  });
 
  return client.$extend(walrus({ network }) as any);
}

