#!/usr/bin/env tsx
/**
 * Automated Snapshot Service Startup Script
 * 
 * Starts the automated trading sentiment snapshot service that:
 * - Listens to trade events on-chain
 * - Aggregates trades every 5 minutes
 * - Creates encrypted snapshots
 * - Uploads to Walrus
 * - Stores blob IDs on-chain
 */

import { config } from 'dotenv';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { CONSTANTS_ID } from '../constantsId';
import { AutomatedSnapshotService } from '../services/automated-snapshot-service';
// import { SealConfig } from '../services/seal-service';

config({ path: '.env' });

interface SnapshotServiceConfig {
  network: 'testnet' | 'mainnet'; 
  adminPrivateKey: string;
  snapshotIntervalMs?: number;
  identityId?: string;
  encryptionThreshold?: number;
}

function loadConfig(): SnapshotServiceConfig {
 
  // const network = (process.env.NETWORK || process.env.VITE_SUI_NETWORK || 'devnet') as 'devnet' | 'testnet' | 'mainnet';
  const network = (process.env.NETWORK || process.env.VITE_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';
  

  // if (!['devnet', 'testnet', 'mainnet'].includes(network)) {
  //   throw new Error(`Invalid network: ${network}. Must be devnet, testnet, or mainnet`);
  // }
  if (!['testnet', 'mainnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}. Must be testnet or mainnet`);
  }

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || process.env.VITE_ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) {
    throw new Error('ADMIN_PRIVATE_KEY or VITE_ADMIN_PRIVATE_KEY environment variable is required');
  }

  const snapshotIntervalMs = process.env.SNAPSHOT_INTERVAL_MS 
    ? parseInt(process.env.SNAPSHOT_INTERVAL_MS, 10)
    : undefined;

  const encryptionThreshold = process.env.ENCRYPTION_THRESHOLD
    ? parseInt(process.env.ENCRYPTION_THRESHOLD, 10)
    : undefined;

  return {
    network,
    adminPrivateKey,
    snapshotIntervalMs,
    identityId: process.env.IDENTITY_ID,
    encryptionThreshold,
  };
}

/*
function createSealConfig(network: 'testnet' | 'mainnet', suiClient: SuiClient): SealConfig {
  const sealPackageId = process.env.VITE_SEAL_PACKAGE_ID || 
    (network === 'testnet' 
      ? '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682'
      : network === 'mainnet'
      ? '0xa212c4c6c7183b911d0be8768f4cb1df7a383025b5d0ba0c014009f0f30f5f8d'
      : '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682'); // devnet uses testnet Seal

  const serverConfigsStr = process.env.VITE_SEAL_SERVER_CONFIGS;
  if (!serverConfigsStr) {
    throw new Error('VITE_SEAL_SERVER_CONFIGS environment variable is required');
  }

  let serverConfigs: Array<{ objectId: string; weight: number }>;
  try {
    serverConfigs = JSON.parse(serverConfigsStr);
  } catch (error) {
    throw new Error(`Failed to parse VITE_SEAL_SERVER_CONFIGS: ${error}`);
  }

  if (!Array.isArray(serverConfigs) || serverConfigs.length === 0) {
    throw new Error('VITE_SEAL_SERVER_CONFIGS must be a non-empty array');
  }

  for (const config of serverConfigs) {
    if (!config.objectId || typeof config.objectId !== 'string') {
      throw new Error('Each server config must have an objectId string');
    }
    if (typeof config.weight !== 'number' || config.weight < 1) {
      throw new Error('Each server config must have a weight >= 1');
    }
  }

  const sealConfig: SealConfig = {
    suiClient: suiClient as any, 
    packageId: sealPackageId,
    serverConfigs,
    verifyKeyServers: process.env.VITE_SEAL_VERIFY_KEY_SERVERS === 'true',
    threshold: 1, 
  };

  if (process.env.VITE_SEAL_API_KEY) {
    (sealConfig as any).apiKey = process.env.VITE_SEAL_API_KEY;
  }
  if (process.env.VITE_SEAL_API_KEY_NAME) {
    (sealConfig as any).apiKeyName = process.env.VITE_SEAL_API_KEY_NAME;
  }

  return sealConfig;
}
*/

function createAdminSigner(privateKey: string): Ed25519Keypair {
  try {
    let keyBytes = fromB64(privateKey);
    
    // Handle base64 key with flag byte (Sui format: 33 bytes = 1 flag + 32 key bytes)
    // Ed25519Keypair.fromSecretKey expects exactly 32 bytes
    if (keyBytes.length === 33) {
      // Strip the flag byte (first byte)
      keyBytes = keyBytes.slice(1);
    } else if (keyBytes.length !== 32) {
      throw new Error(`Invalid key length: ${keyBytes.length} bytes. Expected 32 bytes (or 33 with flag byte)`);
    }
    
    return Ed25519Keypair.fromSecretKey(keyBytes);
  } catch (error) {
    // If base64 fails, try hex format
    try {
      const hexKey = privateKey.startsWith('0x') 
        ? privateKey.slice(2)
        : privateKey;
      const keyBytes = Uint8Array.from(Buffer.from(hexKey, 'hex'));
      
      // Handle hex key with flag byte
      if (keyBytes.length === 33) {
        return Ed25519Keypair.fromSecretKey(keyBytes.slice(1));
      } else if (keyBytes.length !== 32) {
        throw new Error(`Invalid hex key length: ${keyBytes.length} bytes. Expected 32 bytes (or 33 with flag byte)`);
      }
      
      return Ed25519Keypair.fromSecretKey(keyBytes);
    } catch (hexError) {
      throw new Error(`Failed to parse private key. Must be base64 or hex format. Base64 error: ${error}. Hex error: ${hexError}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting Automated Snapshot Service...\n');

  try {
    const config = loadConfig();
    
   
    // const effectiveNetwork = config.network === 'devnet' ? 'testnet' : config.network;
    const effectiveNetwork = config.network; 
    
    console.log(`📋 Configuration:`);
    // console.log(`   Network: ${config.network}${config.network === 'devnet' ? ' (using testnet for Walrus)' : ''}`);
    console.log(`   Network: ${config.network}`);
    console.log(`   Snapshot Interval: ${config.snapshotIntervalMs ? `${config.snapshotIntervalMs}ms` : '5 minutes (default)'}`);
    console.log(`   Encryption Threshold: ${config.encryptionThreshold || '1 (default)'}\n`);

    const networkConstants = CONSTANTS_ID[config.network];
    if (!networkConstants) {
      throw new Error(`No constants found for network: ${config.network}`);
    }

    if (networkConstants.packageId.includes('TODO') || 
        networkConstants.adminCapId.includes('TODO') ||
        networkConstants.tradingSentimentStateId.includes('TODO')) {
      throw new Error(`Missing required constants for ${config.network}. Please update constantsId.ts`);
    }

    console.log(`📦 Contract IDs:`);
    console.log(`   Package ID: ${networkConstants.packageId}`);
    console.log(`   Admin Cap ID: ${networkConstants.adminCapId}`);
    console.log(`   Trading Sentiment State ID: ${networkConstants.tradingSentimentStateId}\n`);

  
    // Use devnet client for on-chain operations
    const suiClient = new SuiClient({
      url: getFullnodeUrl(config.network),
    });
    console.log(`✅ Sui client initialized for ${config.network}\n`);

    
    const adminSigner = createAdminSigner(config.adminPrivateKey);
    const adminAddress = adminSigner.toSuiAddress();
    console.log(`✅ Admin signer created`);
    console.log(`   Address: ${adminAddress}\n`);

    
    // const sealSuiClient = config.network === 'devnet'
    //   ? new SuiClient({ url: getFullnodeUrl('testnet') })
    //   : suiClient;    
    // const sealSuiClient = suiClient;
    
    // const sealConfig = createSealConfig(effectiveNetwork, sealSuiClient);
    // console.log(`✅ Seal config initialized`);
    // console.log(`   Package ID: ${sealConfig.packageId}`);
    // console.log(`   Key Servers: ${sealConfig.serverConfigs.length}`);
    // console.log(`   Verify Key Servers: ${sealConfig.verifyKeyServers}\n`);

   
    const snapshotService = new AutomatedSnapshotService({
      suiClient,
      network: effectiveNetwork, // Use testnet for Walrus if devnet
      packageId: networkConstants.packageId,
      adminCapId: networkConstants.adminCapId,
      tradingSentimentStateId: networkConstants.tradingSentimentStateId,
      adminSigner,
      // sealConfig,
      snapshotIntervalMs: config.snapshotIntervalMs,
      identityId: config.identityId,
      encryptionThreshold: config.encryptionThreshold,
      onSnapshotCreated: (metadata) => {
        console.log(`\n✅ Snapshot created successfully:`);
        console.log(`   Blob ID: ${metadata.blobId}`);
        console.log(`   Version: ${metadata.version}`);
        console.log(`   Timestamp: ${new Date(metadata.timestamp).toISOString()}\n`);
      },
      onError: (error) => {
        console.error(`\n❌ Error in snapshot service:`, error);
      },
    });

    
    console.log('🔄 Starting snapshot service...\n');
    await snapshotService.start();

  
    const statusInterval = setInterval(() => {
      const status = snapshotService.getStatus();
      const sentiment = snapshotService.getAggregatedSentiment();
      
      console.log(`\n📊 Service Status:`);
      console.log(`   Running: ${status.isRunning ? '✅' : '❌'}`);
      console.log(`   Last Snapshot: ${status.lastSnapshotTime > 0 ? new Date(status.lastSnapshotTime).toISOString() : 'Never'}`);
      console.log(`   Snapshot Interval: ${status.snapshotIntervalMs}ms`);
      console.log(`   Assets Tracked: ${status.assetCount}`);
      if (sentiment.length > 0) {
        console.log(`   Top Assets:`);
        sentiment.slice(0, 5).forEach((asset, idx) => {
          const tradeCount = asset.buyCount + asset.sellCount;
          console.log(`     ${idx + 1}. ${asset.symbol}: ${asset.tradingVolume24H} volume (24h), ${tradeCount} trades`);
        });
      }
      console.log('');
    }, 60000); // Every minute

    
    const shutdown = async () => {
      console.log('\n\n🛑 Shutting down snapshot service...');
      clearInterval(statusInterval);
      snapshotService.stop();
      console.log('✅ Service stopped gracefully');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log('✅ Snapshot service is running!');
    console.log('   Press Ctrl+C to stop\n');

  } catch (error) {
    console.error('\n❌ Failed to start snapshot service:', error);
    if (error instanceof Error) {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}


main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

