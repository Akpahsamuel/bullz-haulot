# Environment Setup for Bid Matching Automation

This guide explains how to set up environment variables for the bid matching automation service.

## Required Environment Variables

### 1. MATCH_SIGNER_PRIVATE_KEY (Required)
The base64-encoded private key of the account that owns the MatchSignerCap.

```bash
export MATCH_SIGNER_PRIVATE_KEY="your_base64_private_key_here"
```

**How to get this:**
1. Generate a new keypair or use an existing one
2. Export the private key in base64 format
3. Ensure this keypair owns a MatchSignerCap

### 2. SUI_NETWORK (Optional)
The Sui network to use. Defaults to "devnet".

```bash
export SUI_NETWORK="devnet"  # or "mainnet", "testnet", "localnet"
```

### 3. Contract Object IDs (Optional)
These have default values but can be overridden if needed:

```bash
export BULLFY_PACKAGE_ID="0x9d099100b7b1426060eb648867bf853da2ea3fc5332c1f38647324e96dd36e65"
export ESCROW_REGISTRY_ID="0xff9601e7d349ddcd6a1be962eccc465c3fa2f78fe1cc6dadb6c5666cce0fc74c"
export SQUAD_REGISTRY_ID="0xf9d1c836cee404bd2474c55e5cbd5d0b7100316f8028bfa1cf6a4453a89ed20f"
export ACTIVE_SQUAD_REGISTRY_ID="0xe75f7cf0bcf150a48d719c3cd8de4b135820631ad1a4fbd554a488b8beae98e6"
```

## Setting Up MatchSignerCap

Before running the automation, you need to ensure the keypair owns a MatchSignerCap:

### Option 1: Create MatchSignerCap (if you have AdminCap)
```bash
# Use the command generator to create a MatchSignerCap
sui client call \
  --package $BULLFY_PACKAGE_ID \
  --module match_signer \
  --function create_match_signer_cap \
  --args $ADMIN_CAP_ID $SIGNER_ADDRESS \
  --gas-budget 10000000
```

### Option 2: Transfer Existing MatchSignerCap
If a MatchSignerCap already exists, transfer it to your keypair:

```bash
sui client transfer \
  --to $YOUR_ADDRESS \
  --object-id $EXISTING_MATCH_SIGNER_CAP_ID \
  --gas-budget 10000000
```

## Running the Automation

1. Set up environment variables:
   ```bash
   export MATCH_SIGNER_PRIVATE_KEY="your_base64_private_key"
   export SUI_NETWORK="devnet"
   ```

2. Run the automation:
   ```bash
   npm run ts-node src/scripts/bid-matching-automation.ts
   ```

## Security Considerations

- **Keep the private key secure**: Never commit the private key to version control
- **Use environment files**: Consider using `.env` files for local development
- **Rotate keys regularly**: Change the MatchSignerCap owner periodically
- **Monitor access**: Log and monitor who has access to the MatchSignerCap

## Example .env File

Create a `.env` file in the project root:

```env
# Required
MATCH_SIGNER_PRIVATE_KEY=your_base64_private_key_here

# Optional
SUI_NETWORK=devnet
BULLFY_PACKAGE_ID=0x9d099100b7b1426060eb648867bf853da2ea3fc5332c1f38647324e96dd36e65
ESCROW_REGISTRY_ID=0xff9601e7d349ddcd6a1be962eccc465c3fa2f78fe1cc6dadb6c5666cce0fc74c
SQUAD_REGISTRY_ID=0xf9d1c836cee404bd2474c55e5cbd5d0b7100316f8028bfa1cf6a4453a89ed20f
ACTIVE_SQUAD_REGISTRY_ID=0xe75f7cf0bcf150a48d719c3cd8de4b135820631ad1a4fbd554a488b8beae98e6
```

Then load it in your script:
```bash
source .env
npm run ts-node src/scripts/bid-matching-automation.ts
```

## Troubleshooting

### "No MatchSignerCap found" Error
- Ensure the keypair owns a MatchSignerCap
- Check that the MatchSignerCap is active and not revoked
- Verify the network and package ID are correct

### "Invalid private key" Error
- Ensure the private key is in base64 format
- Check that the keypair is valid and can sign transactions

### "Transaction failed" Error
- Check that the MatchSignerCap is valid and active
- Verify all contract object IDs are correct
- Ensure the keypair has sufficient gas for transactions 