#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const WALRUS_AGGREGATOR_BASE = 'https://aggregator.walrus-testnet.walrus.space/v1';
const BLOB_MAP_FILE = path.join(__dirname, 'walrus-logo-blobs.json');
const OUTPUT_FILE = path.join(__dirname, 'asset-image-urls.json');

function readBlobMap() {
  if (!fs.existsSync(BLOB_MAP_FILE)) {
    console.error(`Error: ${BLOB_MAP_FILE} not found`);
    console.error('Please run upload-logos-to-walrus.js first');
    process.exit(1);
  }
  
  const content = fs.readFileSync(BLOB_MAP_FILE, 'utf-8');
  return JSON.parse(content);
}

function generateImageUrls(blobMap) {
  const imageUrlMap = {};
  
  for (const [assetName, blobId] of Object.entries(blobMap)) {
    const imageUrl = `${WALRUS_AGGREGATOR_BASE}/${blobId}`;
    imageUrlMap[assetName] = imageUrl;
  }
  
  return imageUrlMap;
}

function generateMoveCodeSnippets(imageUrlMap) {
  const snippets = [];
  
  for (const [assetName, imageUrl] of Object.entries(imageUrlMap)) {
    let symbol = assetName.toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');
    
    if (assetName === 'cake-token 1') symbol = 'CAKE';
    if (assetName === 'Vector-1') symbol = 'VECTOR1';
    if (assetName === 'Vector') symbol = 'VECTOR';
    
    const snippet = `// Register ${assetName}
asset_registry::register_asset(
    &admin_cap,
    &mut registry,
    string::utf8(b"${symbol}"),
    string::utf8(b"${assetName}"),
    string::utf8(b"${assetName} asset"),
    string::utf8(b"${imageUrl}"),
    1_000_000,
    0,
    string::utf8(b"Crypto"),
    ctx
);`;
    
    snippets.push({
      assetName,
      symbol,
      imageUrl,
      moveCode: snippet
    });
  }
  
  return snippets;
}

function main() {
  console.log('='.repeat(80));
  console.log('GENERATING ASSET IMAGE URLS FOR register_asset');
  console.log('='.repeat(80) + '\n');
  
  const blobMap = readBlobMap();
  console.log(`Found ${Object.keys(blobMap).length} assets\n`);
  
  const imageUrlMap = generateImageUrls(blobMap);
  
  const moveSnippets = generateMoveCodeSnippets(imageUrlMap);
  
  const output = {
    aggregatorBase: WALRUS_AGGREGATOR_BASE,
    imageUrls: imageUrlMap,
    moveCodeSnippets: moveSnippets,
    usage: {
      description: 'Use these image_url values in register_asset() calls',
      example: 'image_url parameter should be the full Walrus aggregator URL',
      note: 'Each blob ID is accessible via: https://aggregator.walrus-testnet.walrus.space/v1/<BLOB_ID>'
    }
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`✓ Asset image URLs saved to: ${OUTPUT_FILE}\n`);
  
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nGenerated ${Object.keys(imageUrlMap).length} image URLs`);
  console.log(`\nExample usage in register_asset():`);
  console.log(`\n  image_url: "${imageUrlMap['BTC']}"`);
  console.log(`\nFull Move code example:`);
  console.log(moveSnippets[0].moveCode);
  console.log(`\n✓ All URLs and Move code snippets saved to: ${OUTPUT_FILE}`);
  console.log(`\nYou can now use these image_url values when calling register_asset()`);
}

main();

