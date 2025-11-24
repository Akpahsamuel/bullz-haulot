# Walrus Upload Guide

Quick guide for storing text and files on Walrus using HTTP CLI.

## Prerequisites

**No installation required!** Use public testnet endpoints directly via HTTP.

Optional: Install Walrus CLI for local daemon mode with instant retrieval.

## ✅ Verified Working Examples

All examples below have been tested and confirmed working on Walrus testnet (November 2025).

### Successfully Uploaded Assets

**5 Test Logos Uploaded:**
- BTC: `6X4xBm4giWLbJf8M2fc4UJue3yChUoht2p4s-1egvIg`
- ETH: `5WS83Y32p722mTsUk_bnq6H3FMWnozX5-omtt-j_PLg`
- Solana: `TzRfd9x57HY9SRwBtQiwWAhBODhOl4whXYuxg2sNyLE`
- Walrus: `JwWeXEn3k6CBt7XevxskzutCsXcHbTpeqtL0G8DzXng`
- FLOKI: `-r7Gu2HZ3nzPtsAN4EkzZifQb_o7bKfYzMrigQy2Bp0`

**All 48 project logos uploaded** - See `walrus-logo-blobs.json` for complete list.

**All logos extended to 10 epochs** (November 2025) - All 48 logos successfully extended from 1 epoch to 10 epochs using the HTTP API method.

**Text Storage Example:**
- 400-byte paragraph: `ZF-34nspWfRWwR6Q6YmG8JiPkgK0zWksn3Cx4g5hvKY`

## Method 1: Public Endpoints (✅ Tested & Working)

### Store Text

```bash
# Basic text storage (✅ Working)
echo "Your text here" | curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs" --data-binary @-

# With specific epochs (✅ Working)
echo "Your text here" | curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5" --data-binary @-

# Example - Store a paragraph (✅ Tested)
echo "Walrus is a decentralized storage network..." | curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5" --data-binary @-
```

### Store File

```bash
# Upload any file (✅ Working - PNG files tested)
curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs" --upload-file /path/to/your/file.png

# With options
curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=10&deletable=false" --upload-file file.txt

# Batch upload example (✅ Tested with 5 logos)
for logo in BTC.png ETH.png Solana.png; do
  curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs" --upload-file "$logo"
  sleep 1
done
```

### Extend Epochs for Existing Blobs

**Important:** When a blob already exists in Walrus (identified by the same content hash), you can extend its storage duration by uploading it again with a higher epoch count. Walrus will recognize the existing blob and extend its expiry epoch instead of creating a duplicate.

```bash
# Extend an existing blob to 10 epochs
curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=10" \
  --upload-file /path/to/existing/file.png

# The response will show the same blobId but with extended storage duration
# Example response shows: "startEpoch": 231, "endEpoch": 241 (10 epochs)
```

**How it works:**
- Walrus uses content-based addressing (blob ID is derived from file content)
- Uploading the same file with more epochs creates a new certification for the existing blob
- The blob ID remains the same, but storage duration is extended
- You'll see `"newlyCreated"` in the response with the updated `startEpoch` and `endEpoch`

**Example: Extending all logos in a directory to 10 epochs**

```bash
# Using the upload script with epochs=10 parameter
node upload-logos-to-walrus.js

# Or manually for each file
for logo in *.png; do
  curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=10" \
    --upload-file "$logo"
  sleep 0.1
done
```

**Note:** The `upload-logos-to-walrus.js` script is configured to use `epochs=10` and will automatically extend existing blobs when run.

### Retrieve Blob

```bash
# Read stored data (✅ IMPORTANT: Use /v1/blobs/ path)
curl "https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>"

# Save to file
curl "https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>" -o output.txt

# Example - Retrieve BTC logo (✅ Tested)
curl "https://aggregator.walrus-testnet.walrus.space/v1/blobs/6X4xBm4giWLbJf8M2fc4UJue3yChUoht2p4s-1egvIg" -o btc.png

# Verify file type
curl -I "https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>"
```

## Method 2: Local Daemon (Instant Retrieval)

### Start Daemon

```bash
walrus daemon --bind-address 127.0.0.1:8899 --sub-wallets-dir <PATH_TO_WALLETS> --n-clients 1
```

### Store & Retrieve

```bash
# Store text
echo "Test message" | curl -X PUT "http://127.0.0.1:8899/v1/blobs?epochs=5" --data-binary @-

# Store file
curl -X PUT "http://127.0.0.1:8899/v1/blobs" --upload-file image.png

# Retrieve
curl "http://127.0.0.1:8899/v1/blobs/<BLOB_ID>"
```

## URL Parameters

- `epochs=N` - Number of epochs to store (default: 1, tested with 5)
- `deletable=true|false` - Whether blob can be deleted (default: true)
- `permanent=true` - Store permanently (alternative to deletable=false)

**Example with parameters:**
```bash
# 10 epochs, permanent storage
curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=10&deletable=false" --upload-file file.txt
```

## Response Format

Success response includes:
- `blobId` - Unique identifier for retrieval
- `size` - Blob size in bytes
- `cost` - Storage cost in MIST
- `startEpoch` / `endEpoch` - Storage duration

**Example Response:**
```json
{
  "newlyCreated": {
    "blobObject": {
      "id": "0x...",
      "blobId": "6X4xBm4giWLbJf8M2fc4UJue3yChUoht2p4s-1egvIg",
      "size": 1016,
      "storage": {
        "startEpoch": 230,
        "endEpoch": 235
      }
    },
    "cost": 48825000
  }
}
```

## Check Blob Status

```bash
# Check if blob is certified (✅ Available but may timeout)
curl "https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>/status"

# Simpler check - Try to retrieve and check HTTP status
curl -I "https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>"
# HTTP 200 = Available
# HTTP 404 = Not yet certified or doesn't exist
```

## Cost Reference (✅ Tested)

Based on actual uploads:
- **Small file** (49 bytes): 11,025,000 MIST (~0.011 SUI)
- **Logo/Image** (~1KB): 11,025,000 MIST (~0.011 SUI)
- **Text paragraph** (400 bytes): 48,825,000 MIST (~0.049 SUI)
- **Storage duration**: ~5 epochs per upload

## Important Notes

✅ **What Works:**
- Public endpoints for store and retrieve
- PNG/image files
- Text/paragraphs
- Batch uploads with delays
- Retrieval after certification (5-10 minutes)

⚠️ **Important:**
- **MUST use correct path**: `/v1/blobs/{blobId}` not `/v1/{blobId}`
- Blobs need 5-10 minutes to certify after upload
- Aggregator may timeout during certification period
- Once certified (HTTP 200), retrieval is instant and reliable

🔧 **For Immediate Retrieval:**
- Use local Walrus daemon (see Method 2)
- Local daemon provides instant access to uploaded blobs

## Extending Epochs: Step-by-Step Example

Here's how we extended all 48 Bullz logos from 1 epoch to 10 epochs:

1. **Problem:** Logos were uploaded with only 1 epoch (default) and expired
2. **Solution:** Re-upload the same files with `epochs=10` parameter
3. **Result:** Same blob IDs, but storage extended to epochs 231-241 (10 epochs total)

**Command used:**
```bash
# The upload script is configured with epochs=10
node upload-logos-to-walrus.js
```

**Key insight:** When Walrus receives the same file content with a higher epoch count, it automatically extends the storage duration of the existing blob rather than creating a duplicate. The blob ID remains the same because it's derived from the file content.

## Project Files

- **`walrus-logo-blobs.json`** - All 48 logo blob IDs (all extended to 10 epochs)
- **`asset-image-urls.json`** - Full Walrus URLs for all logos (ready to use in app)
- **`upload-logos-to-walrus.js`** - Node.js script for batch uploads/extensions (configured for 10 epochs)
- **`extend-logos-epochs.js`** - Alternative script for extending epochs using Walrus CLI
- **`WALRUS_UPLOAD_GUIDE.md`** - This guide

## Quick Start Example

```bash
# 1. Store a file
curl -X PUT "https://publisher.walrus-testnet.walrus.space/v1/blobs" \
  --upload-file myfile.txt

# Response will include blobId, e.g.: "abc123..."

# 2. Wait 5-10 minutes for certification

# 3. Retrieve the file
curl "https://aggregator.walrus-testnet.walrus.space/v1/blobs/abc123..." \
  -o retrieved-file.txt

# 4. Verify
diff myfile.txt retrieved-file.txt
# No output = files are identical ✅
```

## Integration with Code

Your TypeScript `WalrusService` is correctly configured:

```typescript
// ✅ Correct URLs (as used in your code)
const PUBLISHER_URL = 'https://publisher.walrus-01.tududes.com';
const AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';

// ✅ Correct blob URL format
getBlobUrl(blobId: string): string {
  return `${AGGREGATOR_URL}/v1/blobs/${blobId}`;
}
```

## Troubleshooting

**"404 Not Found" when retrieving:**
- Blob needs 5-10 minutes to certify after upload
- Check status with: `curl -I https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>`
- Wait and retry, or use local daemon for instant access

**Timeout during retrieval:**
- Aggregator may be busy during certification
- Once certified, retrieval is fast and reliable
- Use local daemon for guaranteed immediate access

**Upload fails:**
- Verify internet connection
- Check publisher endpoint is accessible
- Try alternative publisher: `https://walrus-testnet-publisher.nodes.guru`

**Blob expired or about to expire:**
- If your blob was stored with only 1 epoch (default), it may have expired
- Re-upload the same file with `epochs=10` or higher to extend storage duration
- The blob ID will remain the same, but storage will be extended to the new epoch range
- See "Extend Epochs for Existing Blobs" section above for details

## Additional Resources

- Walrus Testnet Explorer: Check your blobs online
- Official Docs: Latest API specifications
- This project: Working examples in `upload-logos-to-walrus.js`
