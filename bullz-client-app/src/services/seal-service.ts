/**
 * Seal SDK Service
 * 
 * Handles encryption/decryption of trading sentiment data using Seal SDK
 * Reference: https://www.npmjs.com/package/@mysten/seal
 */

import { SealClient, SessionKey } from '@mysten/seal';
import type { SealCompatibleClient, SealClientExtensionOptions } from '@mysten/seal';

export interface SealConfig extends SealClientExtensionOptions {
  suiClient: SealCompatibleClient;
  packageId: string; // Seal package ID on Sui
  threshold?: number; // Number of approvals needed (default: 1)
}

export class SealEncryptionService {
  private client: SealClient | null = null;
  private config: SealConfig;

  constructor(config: SealConfig) {
    if (!config.suiClient || !config.packageId || !config.serverConfigs) {
      throw new Error('SealConfig requires suiClient, packageId, and serverConfigs');
    }
    this.config = config;
  }

  /**
   * Initialize Seal client
   */
  async initialize(): Promise<void> {
    try {
      // Initialize Seal client with configuration
      this.client = new SealClient(this.config);
    } catch (error) {
      console.error('Failed to initialize Seal client:', error);
      throw error;
    }
  }

  /**
   * Encrypt data before storing on Walrus
   * @param data - Data to encrypt (string or Uint8Array)
   * @param id - Identity/access control ID (hex string) - determines who can decrypt
   * @param threshold - Number of approvals needed (default: 1)
   */
  async encrypt(
    data: Uint8Array | string,
    id: string,
    threshold: number = this.config.threshold || 1
  ): Promise<{
    encryptedData: Uint8Array;
    encryptionMetadata: {
      id: string;
      threshold: number;
      key: Uint8Array; // Backup key for recovery
    };
  }> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      // Convert string to Uint8Array if needed
      const dataBytes = typeof data === 'string' 
        ? new TextEncoder().encode(data)
        : data;

      // Encrypt using Seal SDK
      // API: encrypt({ threshold, packageId, id, data })
      const result = await this.client!.encrypt({
        threshold,
        packageId: this.config.packageId,
        id,
        data: dataBytes,
      });

      return {
        encryptedData: result.encryptedObject,
        encryptionMetadata: {
          id,
          threshold,
          key: result.key, // Store backup key securely
        },
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data retrieved from Walrus
   * @param encryptedData - Encrypted data from Walrus
   * @param sessionKey - Session key for decryption (created from user's keypair)
   * @param txBytes - Transaction bytes that call seal_approve* functions on-chain
   */
  async decrypt(
    encryptedData: Uint8Array,
    sessionKey: SessionKey,
    txBytes: Uint8Array
  ): Promise<Uint8Array> {
    if (!this.client) {
      await this.initialize();
    }

    try {
      // Decrypt using Seal SDK
      // API: decrypt({ data, sessionKey, txBytes })
      const decryptedData = await this.client!.decrypt({
        data: encryptedData,
        sessionKey,
        txBytes,
      });

      return decryptedData;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Create a session key for decryption
   * This is needed before calling decrypt()
   * @param signer - User's signer for creating session key
   * @param ttlMin - Time to live in minutes (default: 60)
   */
  async createSessionKey(signer: any, ttlMin: number = 60): Promise<SessionKey> {
    if (!this.client) {
      await this.initialize();
    }
    return SessionKey.create({
      address: await signer.getPublicKey().toSuiAddress(),
      packageId: this.config.packageId,
      ttlMin,
      signer,
      suiClient: this.config.suiClient,
    });
  }
}

