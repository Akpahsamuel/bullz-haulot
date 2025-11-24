

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✓ Loaded .env file');
  }
} catch (e) {

  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('✓ Loaded .env file (manual)');
    }
  } catch (e2) {
  
  }
}


let SuiClient, getFullnodeUrl, Transaction, Ed25519Keypair, fromB64;
try {
  const parentNodeModules = path.resolve(__dirname, '../bullz-client-app/node_modules');
  
  const suiClientModule = require(path.join(parentNodeModules, '@mysten/sui/client'));
  SuiClient = suiClientModule.SuiClient;
  getFullnodeUrl = suiClientModule.getFullnodeUrl;
  
  const suiKeypairModule = require(path.join(parentNodeModules, '@mysten/sui/keypairs/ed25519'));
  Ed25519Keypair = suiKeypairModule.Ed25519Keypair;
  
  const suiUtilsModule = require(path.join(parentNodeModules, '@mysten/sui/utils'));
  fromB64 = suiUtilsModule.fromB64;
  
  const suiTxModule = require(path.join(parentNodeModules, '@mysten/sui/transactions'));
  Transaction = suiTxModule.Transaction;
  
  console.log('✓ Sui SDK loaded from parent directory');
} catch (e) {
  console.error('❌ Failed to load Sui SDK:', e.message);
  console.error('   Error details:', e.stack);
  console.error('   Make sure @mysten/sui is installed in bullz-client-app');
  process.exit(1);
}


const constantsPath = path.join(__dirname, '../bullz-client-app/src/constantsId.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

const testnetMatch = constantsContent.match(/testnet:\s*\{([\s\S]*?)\},/);
if (!testnetMatch) {
  throw new Error('Could not find testnet constants');
}

const testnetBlock = testnetMatch[1];
const PACKAGE_ID = testnetBlock.match(/packageId:\s*"([^"]+)"/)?.[1];
const ADMIN_CAP_ID = testnetBlock.match(/adminCapId:\s*"([^"]+)"/)?.[1];
const COMPETITION_STATE_ID = testnetBlock.match(/competitionStateId:\s*"([^"]+)"/)?.[1];
const SQUAD_REGISTRY_ID = testnetBlock.match(/squadRegistryId:\s*"([^"]+)"/)?.[1];
const USER_REGISTRY_ID = testnetBlock.match(/userRegistryId:\s*"([^"]+)"/)?.[1];

if (!PACKAGE_ID || !ADMIN_CAP_ID || !COMPETITION_STATE_ID || !SQUAD_REGISTRY_ID || !USER_REGISTRY_ID) {
  throw new Error('Missing required constants. Please check constantsId.ts');
}


const COMPETITION_DURATION_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 5 * 60 * 1000;
const LOCK_OFFSET_MS = 1 * 60 * 1000;


const PRIVATE_KEY_BASE64 = process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY_BASE64) {
  throw new Error('PRIVATE_KEY_BASE64 environment variable is required');
}

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

function createSigner(privateKeyBase64) {
  try {
    let keyBytes = fromB64(privateKeyBase64);
    
    if (keyBytes.length === 33) {
      keyBytes = keyBytes.slice(1);
    } else if (keyBytes.length !== 32) {
      throw new Error(`Invalid key length: ${keyBytes.length} bytes. Expected 32 bytes (or 33 with flag byte)`);
    }
    
    return Ed25519Keypair.fromSecretKey(keyBytes);
  } catch (error) {
    throw new Error(`Failed to parse private key: ${error.message}`);
  }
}

const signer = createSigner(PRIVATE_KEY_BASE64);
const adminAddress = signer.getPublicKey().toSuiAddress();
console.log(`✓ Admin address: ${adminAddress}\n`);

async function startCompetitionAndLock() {
  console.log('='.repeat(80));
  console.log('Starting Competition & Locking Participants');
  console.log('='.repeat(80) + '\n');
  
  try {
    const weekIndex = Math.floor(Date.now() / 1000);
    const lockOffsetMs = LOCK_OFFSET_MS;
    const endOffsetMs = COMPETITION_DURATION_MS;
    
    console.log(`Week Index: ${weekIndex}`);
    console.log(`Lock Offset: ${lockOffsetMs}ms (${lockOffsetMs / 1000}s)`);
    console.log(`End Offset: ${endOffsetMs}ms (${endOffsetMs / 1000}s)`);
    console.log();
    
    const tx = new Transaction();
    
    tx.moveCall({
      package: PACKAGE_ID,
      module: 'weekly_competition',
      function: 'start_weekly_competition',
      arguments: [
        tx.object(ADMIN_CAP_ID),
        tx.object(COMPETITION_STATE_ID),
        tx.pure.u64(weekIndex),
        tx.pure.u64(lockOffsetMs),
        tx.pure.u64(endOffsetMs),
        tx.object('0x6'),
      ],
    });
    
    tx.moveCall({
      package: PACKAGE_ID,
      module: 'weekly_competition',
      function: 'lock_participants',
      arguments: [
        tx.object(ADMIN_CAP_ID),
        tx.object(COMPETITION_STATE_ID),
        tx.object(SQUAD_REGISTRY_ID),
        tx.object(USER_REGISTRY_ID),
        tx.object('0x6'),
      ],
    });
    
    console.log('Building transaction...');
    const result = await client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    
    console.log(`✓ Transaction executed: ${result.digest}`);
    console.log(`✓ Competition started and participants locked`);
    
    console.log('⏳ Waiting for transaction to finalize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log();
    
    return { weekIndex, digest: result.digest };
  } catch (error) {
    console.error('❌ Error starting competition:', error.message);
    throw error;
  }
}


async function endCompetition() {
  console.log('='.repeat(80));
  console.log('Ending Competition');
  console.log('='.repeat(80) + '\n');
  
  try {
    const tx = new Transaction();
    
    tx.moveCall({
      package: PACKAGE_ID,
      module: 'weekly_competition',
      function: 'finalize_competition',
      arguments: [
        tx.object(ADMIN_CAP_ID),
        tx.object(COMPETITION_STATE_ID),
        tx.object(SQUAD_REGISTRY_ID),
        tx.object('0x6'),
      ],
    });
    
    console.log('Building transaction...');
    const result = await client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    
    console.log(`✓ Transaction executed: ${result.digest}`);
    console.log(`✓ Competition finalized\n`);
    
    return result.digest;
  } catch (error) {
    console.error('❌ Error ending competition:', error.message);
    throw error;
  }
}

async function uploadSnapshot() {
  console.log('='.repeat(80));
  console.log('Uploading Snapshot to Walrus');
  console.log('='.repeat(80) + '\n');
  
  try {
    process.env.COMPETITION_STATE_ID = COMPETITION_STATE_ID;
    execSync('node upload-competition-snapshot.js', {
      stdio: 'inherit',
      cwd: __dirname,
    });
    console.log('\n✓ Snapshot uploaded to Walrus\n');
  } catch (error) {
    console.error('\n❌ Error uploading snapshot:', error.message);
    console.error('   Continuing cycle despite snapshot upload failure...\n');
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    console.log(`⏳ Waiting ${minutes}m ${remainingSeconds}s...`);
    
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 1000;
      const remaining = ms - elapsed;
      if (remaining <= 0) {
        clearInterval(interval);
        resolve();
      } else {
        const remSeconds = Math.floor(remaining / 1000);
        const remMinutes = Math.floor(remSeconds / 60);
        const remSecs = remSeconds % 60;
        process.stdout.write(`\r   ${remMinutes}m ${remSecs}s remaining...`);
      }
    }, 1000);
  });
}

async function runCompetitionCycle(cycleNumber) {
  console.log('\n' + '╔'.repeat(40));
  console.log(`║  COMPETITION CYCLE #${cycleNumber}`);
  console.log('╚'.repeat(40) + '\n');
  
  try {
    const { weekIndex, digest } = await startCompetitionAndLock();
    
    await uploadSnapshot();
    
    console.log(`\n⏳ Competition running for ${COMPETITION_DURATION_MS / 1000 / 60} minutes...\n`);
    await wait(COMPETITION_DURATION_MS);
    
    await endCompetition();
    
    console.log(`\n⏳ Cooldown period: ${COOLDOWN_MS / 1000 / 60} minutes...\n`);
    await wait(COOLDOWN_MS);
    
    console.log(`\n✅ Cycle #${cycleNumber} completed\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ Error in cycle #${cycleNumber}:`, error.message);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          Automated Competition Service                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  console.log('📋 Configuration:');
  console.log(`   Package ID: ${PACKAGE_ID}`);
  console.log(`   Admin Cap ID: ${ADMIN_CAP_ID}`);
  console.log(`   Competition State ID: ${COMPETITION_STATE_ID}`);
  console.log(`   Squad Registry ID: ${SQUAD_REGISTRY_ID}`);
  console.log(`   User Registry ID: ${USER_REGISTRY_ID}`);
  console.log(`   Competition Duration: ${COMPETITION_DURATION_MS / 1000 / 60} minutes`);
  console.log(`   Cooldown Period: ${COOLDOWN_MS / 1000 / 60} minutes`);
  console.log(`   Lock Offset: ${LOCK_OFFSET_MS / 1000} seconds`);
  console.log();
  
  let cycleNumber = 1;
  
  while (true) {
    const success = await runCompetitionCycle(cycleNumber);
    
    if (success) {
      cycleNumber++;
    } else {
      console.log('\n⚠️  Waiting 30 seconds before retrying...\n');
      await wait(30000);
    }
  }
}


process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { startCompetitionAndLock, endCompetition, uploadSnapshot };

