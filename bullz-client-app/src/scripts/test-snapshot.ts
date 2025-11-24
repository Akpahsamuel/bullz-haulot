#!/usr/bin/env tsx
/**
 * Test Snapshot Creation
 * 
 * Creates a single snapshot for testing purposes
 * - Initializes the service
 * - Listens to trades for a short period
 * - Creates one snapshot
 * - Exits
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
  identityId?: string;
  encryptionThreshold?: number;
  listenDurationMs?: number; 
}

function loadConfig(): SnapshotServiceConfig {
  const network = (process.env.NETWORK || process.env.VITE_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';
  
  if (!['testnet', 'mainnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}. Must be testnet or mainnet`);
  }

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || process.env.VITE_ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) {
    throw new Error('ADMIN_PRIVATE_KEY or VITE_ADMIN_PRIVATE_KEY environment variable is required');
  }

  const encryptionThreshold = process.env.ENCRYPTION_THRESHOLD
    ? parseInt(process.env.ENCRYPTION_THRESHOLD, 10)
    : undefined;

  return {
    network,
    adminPrivateKey,
    identityId: process.env.IDENTITY_ID,
    encryptionThreshold,
    listenDurationMs: process.env.LISTEN_DURATION_MS 
      ? parseInt(process.env.LISTEN_DURATION_MS, 10)
      : 30000, // Default: 30 seconds
  };
}

/*
function createSealConfig(network: 'testnet' | 'mainnet', suiClient: SuiClient): SealConfig {
  const sealPackageId = process.env.VITE_SEAL_PACKAGE_ID || 
    (network === 'testnet' 
      ? '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682'
      : network === 'mainnet'
      ? '0xa212c4c6c7183b911d0be8768f4cb1df7a383025b5d0ba0c014009f0f30f5f8d'
      : '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682');

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
    
    if (keyBytes.length === 33) {
      keyBytes = keyBytes.slice(1);
    } else if (keyBytes.length !== 32) {
      throw new Error(`Invalid key length: ${keyBytes.length} bytes. Expected 32 bytes (or 33 with flag byte)`);
    }
    
    return Ed25519Keypair.fromSecretKey(keyBytes);
  } catch (error) {
    try {
      const hexKey = privateKey.startsWith('0x') 
        ? privateKey.slice(2)
        : privateKey;
      const keyBytes = Uint8Array.from(Buffer.from(hexKey, 'hex'));
      
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
  console.log('🧪 Testing Snapshot Creation...\n');

  try {
    const config = loadConfig();
    
    console.log(`📋 Configuration:`);
    console.log(`   Network: ${config.network}`);
    console.log(`   Listen Duration: ${config.listenDurationMs}ms`);
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

    const suiClient = new SuiClient({
      url: getFullnodeUrl(config.network),
    });
    console.log(`✅ Sui client initialized for ${config.network}\n`);

    const adminSigner = createAdminSigner(config.adminPrivateKey);
    const adminAddress = adminSigner.toSuiAddress();
    console.log(`✅ Admin signer created`);
    console.log(`   Address: ${adminAddress}\n`);

    // const sealSuiClient = suiClient;
    // const sealConfig = createSealConfig(config.network, sealSuiClient);
    // console.log(`✅ Seal config initialized`);
    // console.log(`   Package ID: ${sealConfig.packageId}`);
    // console.log(`   Key Servers: ${sealConfig.serverConfigs.length}`);
    // console.log(`   Verify Key Servers: ${sealConfig.verifyKeyServers}\n`);

    const snapshotService = new AutomatedSnapshotService({
      suiClient,
      network: config.network,
      packageId: networkConstants.packageId,
      adminCapId: networkConstants.adminCapId,
      tradingSentimentStateId: networkConstants.tradingSentimentStateId,
      adminSigner,
      // sealConfig,
      identityId: config.identityId,
      encryptionThreshold: config.encryptionThreshold,
      snapshotIntervalMs: 999999999, 
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

    
    console.log('🔄 Starting trade event listener...\n');
    await snapshotService.start();

    
    console.log(`⏳ Listening for trades for ${config.listenDurationMs}ms...`);
    console.log(`   (This allows trades to accumulate before creating snapshot)\n`);
    
    await new Promise(resolve => setTimeout(resolve, config.listenDurationMs!));

   
    const statusBefore = snapshotService.getStatus();
    const sentimentBefore = snapshotService.getAggregatedSentiment();
    
    console.log(`\n📊 Status before snapshot:`);
    console.log(`   Assets Tracked: ${statusBefore.assetCount}`);
    console.log(`   Trades Collected: ${sentimentBefore.reduce((sum, asset) => sum + asset.buyCount + asset.sellCount, 0)}`);
    if (sentimentBefore.length > 0) {
      console.log(`   Top Assets:`);
      sentimentBefore.slice(0, 5).forEach((asset, idx) => {
        const tradeCount = asset.buyCount + asset.sellCount;
        console.log(`     ${idx + 1}. ${asset.symbol}: ${asset.tradingVolume24H} volume (24h), ${tradeCount} trades`);
      });
    }
    console.log('');

   
    console.log('📸 Creating snapshot...\n');
    const snapshotInfo = await snapshotService.createSnapshot();

    console.log('\n' + '='.repeat(80));
    console.log('✅ SNAPSHOT TEST COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nSnapshot Details:`);
    console.log(`   Blob ID: ${snapshotInfo.blobId}`);
    console.log(`   Version: ${snapshotInfo.version}`);
    console.log(`   Timestamp: ${new Date(snapshotInfo.timestamp).toISOString()}`);
    console.log(`   Assets: ${statusBefore.assetCount}`);
    console.log(`   Total Trades: ${sentimentBefore.reduce((sum, asset) => sum + asset.buyCount + asset.sellCount, 0)}`);
    console.log('');

   
    snapshotService.stop();
    console.log('✅ Service stopped');

  } catch (error) {
    console.error('\n❌ Failed to test snapshot:', error);
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

