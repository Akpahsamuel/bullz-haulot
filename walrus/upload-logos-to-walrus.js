#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=10';
const LOGOS_DIR = path.join(__dirname, '..', 'Fanpool');
const ASSET_URLS_FILE = path.join(__dirname, 'asset-image-urls.json');

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
  console.log('Starting Fanpool images upload to Walrus (10 epochs)...\n');
  
  if (!fs.existsSync(LOGOS_DIR)) {
    console.error(`Error: Directory ${LOGOS_DIR} not found`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(LOGOS_DIR)
    .filter(file => {
      const ext = file.toLowerCase();
      return ext.endsWith('.svg') || ext.endsWith('.png') || ext.endsWith('.jpg') || 
             ext.endsWith('.jpeg') || ext.endsWith('.webp');
    })
    .sort();
  
  console.log(`Found ${files.length} image files to upload\n`);
  
  // Load existing asset URLs
  let assetUrls = {};
  if (fs.existsSync(ASSET_URLS_FILE)) {
    try {
      const fileContent = fs.readFileSync(ASSET_URLS_FILE, 'utf-8').trim();
      if (fileContent) {
        assetUrls = JSON.parse(fileContent);
        console.log(`Loaded ${Object.keys(assetUrls).length} existing entries from asset-image-urls.json\n`);
      }
    } catch (error) {
      console.log('Starting with empty asset URLs (file was empty or invalid)\n');
    }
  }
  
  let uploaded = 0;
  let skipped = 0;
  
  for (const file of files) {
    const filePath = path.join(LOGOS_DIR, file);
    const assetName = file.replace(/\.(svg|png|jpg|jpeg|webp)$/i, '');
    
    // Check if already uploaded
    if (assetUrls[assetName]) {
      console.log(`⊘ ${file} - already exists, skipping...`);
      skipped++;
      continue;
    }
    
    const blobId = uploadFile(filePath);
    
    if (blobId) {
      const walrusUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
      assetUrls[assetName] = walrusUrl;
      uploaded++;
    }
    
    execSync('sleep 0.1');
  }
  
  // Sort the asset URLs alphabetically by key
  const sortedAssetUrls = Object.keys(assetUrls)
    .sort()
    .reduce((acc, key) => {
      acc[key] = assetUrls[key];
      return acc;
    }, {});
  
  // Save updated asset URLs
  fs.writeFileSync(ASSET_URLS_FILE, JSON.stringify(sortedAssetUrls, null, 2));
  
  // Output the final map
  console.log('\n' + '='.repeat(80));
  console.log('UPLOAD COMPLETE');
  console.log('='.repeat(80) + '\n');
  
  console.log(`✓ Asset URLs updated in: ${ASSET_URLS_FILE}`);
  console.log(`\nSummary:`);
  console.log(`  - New uploads: ${uploaded}`);
  console.log(`  - Skipped (already exist): ${skipped}`);
  console.log(`  - Total entries: ${Object.keys(sortedAssetUrls).length}`);
}

main();

