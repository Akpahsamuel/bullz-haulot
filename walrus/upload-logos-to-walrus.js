#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=10';
const LOGOS_DIR = path.join(__dirname, 'bullz-logos');

function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`Uploading ${fileName}...`);
  
  try {
    const result = execSync(
      `curl -s -X PUT "${WALRUS_PUBLISHER_URL}" --upload-file "${filePath}"`,
      { encoding: 'utf-8' }
    );
    
    const response = JSON.parse(result);
    
    if (response.newlyCreated && response.newlyCreated.blobObject) {
      const blobId = response.newlyCreated.blobObject.blobId;
      const storage = response.newlyCreated.blobObject.storage;
      if (storage) {
        const epochs = storage.endEpoch - storage.startEpoch;
        console.log(`✓ ${fileName} extended to ${epochs} epochs - Blob ID: ${blobId} (epochs: ${storage.startEpoch}-${storage.endEpoch})`);
      } else {
        console.log(`✓ ${fileName} uploaded/extended - Blob ID: ${blobId}`);
      }
      return blobId;
    } else if (response.alreadyCertified && response.alreadyCertified.blobId) {
      const blobId = response.alreadyCertified.blobId;
      console.log(`✓ ${fileName} already certified for 10 epochs - Blob ID: ${blobId}`);
      return blobId;
    } else {
      console.error(`✗ Failed to upload ${fileName}:`, result);
      return null;
    }
  } catch (error) {
    console.error(`✗ Error uploading ${fileName}:`, error.message);
    return null;
  }
}

function main() {
  console.log('Starting Walrus logo epoch extension to 10 epochs...\n');
  
  if (!fs.existsSync(LOGOS_DIR)) {
    console.error(`Error: Directory ${LOGOS_DIR} not found`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(LOGOS_DIR)
    .filter(file => file.toLowerCase().endsWith('.png'))
    .sort();
  
  console.log(`Found ${files.length} logo files to upload\n`);
  
  const blobMap = {};
  
  for (const file of files) {
    const filePath = path.join(LOGOS_DIR, file);
    const assetName = file.replace(/\.png$/i, '');
    const blobId = uploadFile(filePath);
    
    if (blobId) {
      blobMap[assetName] = blobId;
    }
    
    execSync('sleep 0.1');
  }
  
  // Output the final map
  console.log('\n' + '='.repeat(80));
  console.log('UPLOAD COMPLETE - BLOB MAP');
  console.log('='.repeat(80) + '\n');
  
  console.log(JSON.stringify(blobMap, null, 2));
  
  const outputFile = path.join(__dirname, 'walrus-logo-blobs.json');
  fs.writeFileSync(outputFile, JSON.stringify(blobMap, null, 2));
  console.log(`\n✓ Blob map saved to: ${outputFile}`);
  
  const successful = Object.keys(blobMap).length;
  const failed = files.length - successful;
  console.log(`\nSummary: ${successful} successful, ${failed} failed`);
}

main();

