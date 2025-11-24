

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let SuiClient, getFullnodeUrl;
try {
  const parentNodeModules = path.resolve(__dirname, '../bullz-client-app/node_modules');
  const suiClientPath = path.join(parentNodeModules, '@mysten/sui/client');
  const suiModule = require(suiClientPath);
  SuiClient = suiModule.SuiClient;
  getFullnodeUrl = suiModule.getFullnodeUrl;
  } catch (e) {
    try {
    const suiModule = require('@mysten/sui/client');
    SuiClient = suiModule.SuiClient;
    getFullnodeUrl = suiModule.getFullnodeUrl;
  } catch (e2) {
    SuiClient = null;
    getFullnodeUrl = null;
  }
}

const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=10';
const COMPETITION_STATE_ID = process.env.COMPETITION_STATE_ID || '0xeedecfd97b9e23479037b675a83761b2f53a8274b667f2c763f250bc735dcbc8';

const constantsPath = path.join(__dirname, '../bullz-client-app/src/constantsId.ts');
let ASSET_REGISTRY_ID = null;
try {
  const constantsContent = fs.readFileSync(constantsPath, 'utf8');
  const testnetMatch = constantsContent.match(/testnet:\s*\{([\s\S]*?)\},/);
  if (testnetMatch) {
    const testnetBlock = testnetMatch[1];
    ASSET_REGISTRY_ID = testnetBlock.match(/assetRegistryId:\s*"([^"]+)"/)?.[1];
  }
} catch (e) {
  console.warn('⚠️  Could not load asset registry ID from constants');
}

function getCompetitionState() {
  console.log(`Fetching competition state from Sui...`);
  console.log(`Competition State ID: ${COMPETITION_STATE_ID}\n`);
  
  try {
    const result = execSync(
      `sui client object ${COMPETITION_STATE_ID} --json`,
      { encoding: 'utf-8' }
    );
    
    const objectData = JSON.parse(result);
    
    const content = objectData.content || objectData.data?.content;
    
    if (!content || content.dataType !== 'moveObject') {
      throw new Error('Could not access competition state object');
    }

    return content.fields;
  } catch (error) {
    console.error('Error fetching competition state:', error.message);
    throw error;
  }
}

function uploadToWalrus(jsonData) {
  console.log('Uploading snapshot to Walrus...');
  
  try {
    const tempFile = path.join(__dirname, 'temp-snapshot.json');
    fs.writeFileSync(tempFile, JSON.stringify(jsonData, null, 2));
    
    const result = execSync(
      `curl -s -X PUT "${WALRUS_PUBLISHER_URL}" --upload-file "${tempFile}"`,
      { encoding: 'utf-8' }
    );
    
    fs.unlinkSync(tempFile);
    
    const response = JSON.parse(result);
    
    if (response.newlyCreated && response.newlyCreated.blobObject) {
      const blobId = response.newlyCreated.blobObject.blobId;
      const storage = response.newlyCreated.blobObject.storage;
      if (storage) {
        const epochs = storage.endEpoch - storage.startEpoch;
        console.log(`✓ Snapshot uploaded - Blob ID: ${blobId} (epochs: ${storage.startEpoch}-${storage.endEpoch})`);
      } else {
        console.log(`✓ Snapshot uploaded - Blob ID: ${blobId}`);
      }
      return blobId;
    } else if (response.alreadyCertified && response.alreadyCertified.blobId) {
      const blobId = response.alreadyCertified.blobId;
      console.log(`✓ Snapshot already certified - Blob ID: ${blobId}`);
      return blobId;
    } else {
      console.error(`✗ Failed to upload snapshot:`, result);
      return null;
    }
  } catch (error) {
    console.error(`✗ Error uploading snapshot:`, error.message);
    return null;
  }
}

async function getUserVaultBalance(client, assetRegistryId, userAddress, symbol) {
  try {
    const registry = await client.getObject({ 
      id: assetRegistryId, 
      options: { showContent: true } 
    });
    const vaultsTableId = registry.data.content.fields.vaults.fields.id.id;
    
    const vaultField = await client.getDynamicFieldObject({
      parentId: vaultsTableId,
      name: { type: '0x1::string::String', value: symbol }
    });
    const vaultId = vaultField.data.content.fields.value;
    
    const vault = await client.getObject({ 
      id: vaultId, 
      options: { showContent: true } 
    });
    const userBalancesTableId = vault.data.content.fields.user_balances.fields.id.id;
    
    try {
      const userBalanceField = await client.getDynamicFieldObject({
        parentId: userBalancesTableId,
        name: { type: 'address', value: userAddress }
      });
      return userBalanceField.data.content.fields.value || '0';
    } catch (e) {
      return '0';
    }
  } catch (e) {
    console.warn(`⚠️  Could not fetch balance for ${symbol}: ${e.message}`);
    return '0';
  }
}

async function enrichParticipantsWithBalances(participants) {
  if (!SuiClient || !ASSET_REGISTRY_ID) {
    console.warn('⚠️  Cannot fetch vault balances - SDK or asset registry ID not available');
    return participants;
  }

  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  const enriched = [];

  for (const participant of participants) {
    const p = participant.fields || participant;
    
    const owner = p.owner;
    if (!owner) {
      console.warn('⚠️  Participant missing owner, skipping');
      continue;
    }
    
    let symbols = p.symbols || [];
    if (symbols.fields && Array.isArray(symbols.fields)) {
      symbols = symbols.fields;
    } else if (!Array.isArray(symbols)) {
      symbols = [];
    }
    
    let quantities = p.quantities || [];
    if (quantities.fields && Array.isArray(quantities.fields)) {
      quantities = quantities.fields;
    } else if (!Array.isArray(quantities)) {
      quantities = [];
    }
    
    const balances = {};
    
    const uniqueSymbols = [...new Set(symbols)];
    console.log(`  Fetching balances for ${owner} (${uniqueSymbols.length} assets)...`);
    for (const symbol of uniqueSymbols) {
      const balance = await getUserVaultBalance(client, ASSET_REGISTRY_ID, owner, symbol);
      balances[symbol] = balance;
    }
    
    enriched.push({
      owner: owner,
      squadId: p.squad_id,
      symbols: symbols,
      quantities: quantities,
      vaultBalances: balances,
      joinedTsMs: p.joined_ts_ms,
    });
  }

  return enriched;
}

async function createSnapshot(fields) {
  const snapshot = {
    timestamp: new Date().toISOString(),
    competitionStateId: COMPETITION_STATE_ID,
    weekIndex: fields.week_index,
    startTsMs: fields.start_ts_ms,
    lockTsMs: fields.lock_ts_ms,
    endTsMs: fields.end_ts_ms,
    active: fields.active,
    locked: fields.locked,
    participants: [],
  };

  let rawParticipants = [];
  if (fields.participants) {
    if (Array.isArray(fields.participants)) {
      rawParticipants = fields.participants;
    } else if (fields.participants.fields && Array.isArray(fields.participants.fields)) {
      rawParticipants = fields.participants.fields;
    }
  }

  snapshot.participants = await enrichParticipantsWithBalances(rawParticipants);

  if (fields.asset_points && Array.isArray(fields.asset_points)) {
    snapshot.assetPoints = fields.asset_points.map((ap) => ({
      symbol: ap.symbol || ap.fields?.symbol,
      points: ap.points || ap.fields?.points,
    }));
  }

  return snapshot;
}

async function main() {
  console.log('='.repeat(80));
  console.log('Competition Snapshot Upload to Walrus');
  console.log('='.repeat(80) + '\n');

  try {
    const fields = getCompetitionState();
    
    console.log('Fetching vault balances for participants...\n');
    const snapshot = await createSnapshot(fields);
    
    console.log(`✓ Found ${snapshot.participants.length} participants`);
    console.log(`✓ Competition week: ${snapshot.weekIndex}`);
    console.log(`✓ Locked: ${snapshot.locked}`);
    console.log(`✓ Active: ${snapshot.active}`);
    
    if (snapshot.participants.length > 0) {
      console.log('\nParticipant Balances:');
      snapshot.participants.forEach((p, i) => {
        console.log(`  ${i + 1}. Owner: ${p.owner}`);
        if (p.vaultBalances) {
          Object.entries(p.vaultBalances).forEach(([symbol, balance]) => {
            console.log(`     ${symbol}: ${balance}`);
          });
        }
      });
    }
    console.log();

    const blobId = uploadToWalrus(snapshot);

    if (blobId) {
      console.log('\n' + '='.repeat(80));
      console.log('UPLOAD SUCCESSFUL');
      console.log('='.repeat(80));
      console.log(`\nSnapshot Blob ID: ${blobId}`);
      console.log(`Walrus URL: https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`);
      console.log(`\nSnapshot Summary:`);
      console.log(`  - Week Index: ${snapshot.weekIndex}`);
      console.log(`  - Participants: ${snapshot.participants.length}`);
      console.log(`  - Start Time: ${new Date(Number(snapshot.startTsMs)).toISOString()}`);
      console.log(`  - Lock Time: ${new Date(Number(snapshot.lockTsMs)).toISOString()}`);
      console.log(`  - End Time: ${new Date(Number(snapshot.endTsMs)).toISOString()}`);
      
      const outputFile = path.join(__dirname, 'competition-snapshots.json');
      let snapshots = {};
      if (fs.existsSync(outputFile)) {
        snapshots = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      }
      snapshots[`week_${snapshot.weekIndex}`] = {
        blobId,
        timestamp: snapshot.timestamp,
        participantCount: snapshot.participants.length,
        walrusUrl: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`,
      };
      fs.writeFileSync(outputFile, JSON.stringify(snapshots, null, 2));
      console.log(`\n✓ Snapshot metadata saved to: ${outputFile}`);
    } else {
      console.error('\n✗ Failed to upload snapshot to Walrus');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n✗ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { createSnapshot, uploadToWalrus, enrichParticipantsWithBalances };
