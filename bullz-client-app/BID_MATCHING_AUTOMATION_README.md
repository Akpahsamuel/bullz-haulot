# Bullz Bid Matching Automation System

## Overview

The Bullz Bid Matching Automation System is a comprehensive TypeScript-based service that automatically matches compatible bids and completes matches using a Match Signer Capability. The system uses Programmable Transaction Blocks (PTBs) to ensure atomic operations and efficient batch processing.

## Features

- 🤖 **Automated Bid Matching**: Automatically finds and matches compatible bids (same amount and duration)
- ⏰ **Timed Match Completion**: Automatically completes matches when their duration expires
- 💰 **Atomic Prize Distribution**: Uses PTBs to complete matches and claim prizes in a single transaction
- 🔄 **Batch Processing**: Efficiently processes multiple matches in a single transaction
- 📊 **Statistics Tracking**: Comprehensive tracking of matches, prizes, and errors
- 🔐 **Secure Signer Capability**: Uses Match Signer Capability for authorized operations

## Architecture

### Core Components

1. **BidMatchingAutomation** (`src/services/bid-matching-automation.ts`)
   - Main automation service that orchestrates bid matching and completion
   - Monitors blockchain events for new bids
   - Schedules match completions based on duration

2. **PTBMatchService** (`src/services/ptb-match-service.ts`)
   - Handles Programmable Transaction Blocks for atomic operations
   - Creates complex transactions that combine multiple contract calls
   - Manages automatic completion scheduling

3. **Start Script** (`src/scripts/start-automation.ts`)
   - CLI interface for starting and managing the automation service
   - Handles graceful shutdown and status reporting

## Setup Instructions

### Prerequisites

1. Node.js 18+ installed
2. A Sui wallet with sufficient SUI for gas fees
3. Match Signer Capability created and configured
4. Access to token price API endpoint

### Step 1: Environment Configuration

Create a `.env` file in the `bullz-client-app` directory:

```env
# Private key for automated bid matching service
MATCH_SIGNER_PRIVATE_KEY=your_private_key_here

# Network configuration
NETWORK=devnet

# Automation settings
MATCH_CHECK_INTERVAL=5000
MATCH_COMPLETION_CHECK_INTERVAL=1000
```

**Note**: The `MATCH_SIGNER_CAP_ID` is no longer needed in the environment file. The system will automatically query the Match Signer Capability from the user's wallet.

### Step 2: Create Match Signer Capability

First, you need to create a Match Signer Capability using the admin cap. The automation service will automatically find this capability in your wallet:

```bash
# Using the existing admin cap from config.json
sui client call \
  --package 0x9d099100b7b1426060eb648867bf853da2ea3fc5332c1f38647324e96dd36e65 \
  --module match_signer \
  --function create_match_signer \
  --args \
    0xb8d34d2ba99d4bf5c0288ddcb6ab77b71ad692a7abf8d91ea8de77e55b80e887 \
    0x62c5482ccb14f9fd70969dd1d2e093ffafb26f357679af7be733ed4af89be41c \
    [YOUR_AUTOMATION_SERVICE_ADDRESS] \
    0x6 \
  --gas-budget 100000000
```

### Step 3: Update Configuration

~~1. Update `bullz-client-app/src/constantsId.ts` with your Match Signer Cap ID:~~
~~```typescript~~
~~matchSignerCapId: "0x[YOUR_MATCH_SIGNER_CAP_ID]",~~
~~```~~

~~2. Update your `.env` file with the Match Signer Cap ID~~

**Note**: These steps are no longer needed. The system will automatically query the Match Signer Capability from your wallet.

### Step 4: Install Dependencies

```bash
cd bullz-client-app
npm install
```

### Step 5: Start the Automation Service

```bash
npm run automation
```

The service will automatically:
1. Query your wallet for the Match Signer Capability
2. Initialize the PTB Match Service with the found capability
3. Start the automation process

## Usage

### Starting the Service

```bash
npm run automation
```

The service will:
1. Initialize the automation system
2. Start monitoring for compatible bids every 5 seconds (configurable)
3. Check for completed matches every 1 second (configurable)
4. Display status updates every 30 seconds

### Stopping the Service

Press `Ctrl+C` to gracefully stop the service. The system will:
1. Complete any ongoing operations
2. Display final statistics
3. Clean up resources

### Monitoring

The service provides comprehensive logging:

- 🔍 **Bid Monitoring**: Logs when checking for compatible bids
- 🎯 **Match Creation**: Logs successful bid matches with transaction details
- ⏰ **Completion Scheduling**: Logs when matches are scheduled for completion
- 🏁 **Match Completion**: Logs match completion with winner and prize details
- 📊 **Statistics**: Regular status updates and final statistics

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MATCH_SIGNER_PRIVATE_KEY` | Private key for the automation service | Required |
| ~~`MATCH_SIGNER_CAP_ID`~~ | ~~Match Signer Capability ID~~ | ~~Required~~ |
| `NETWORK` | Sui network (devnet/testnet/mainnet) | devnet |
| `MATCH_CHECK_INTERVAL` | Interval for checking compatible bids (ms) | 5000 |
| `MATCH_COMPLETION_CHECK_INTERVAL` | Interval for checking match completion (ms) | 1000 |

**Note**: The `MATCH_SIGNER_CAP_ID` environment variable is no longer needed. The system automatically queries the capability from the user's wallet.

### Private Key Conversion for Environment Setup

**DO NOT use any example or documentation key. If you see a key in this README or anywhere else, IGNORE IT. Only use your own private key.**

**Important:** Never use any example or public key you find in documentation or online. Always use your own private key and keep it secure.

The automation script requires your Ed25519 private key as a base64-encoded 32-byte value (no prefix, no flag, no quotes).

If you have a Sui-formatted private key (e.g., `suiprivkey1...`):

1. Convert using the Sui CLI:
   ```sh
   sui keytool convert suiprivkey1yourkeyhere
   ```
   - Copy the value from the `base64WithFlag` field in the output.

2. Remove the flag byte (first byte) to get the raw 32-byte key:
   ```sh
   echo "<base64WithFlag>" | base64 -d | tail -c 32 | base64
   ```
   - Use the output as your `MATCH_SIGNER_PRIVATE_KEY` in `.env` (or `VITE_MATCH_SIGNER_PRIVATE_KEY` if using Vite-style env).

3. Verify the result is 32 bytes:
   ```sh
   echo "<your_final_base64>" | base64 -d | wc -c
   ```
   - Should print `32`.

**Never share your private key. Never use any key shown in documentation.**

### Bid Matching Criteria

Bids are considered compatible if:
- ✅ Same bid amount (in MIST)
- ✅ Same duration (in milliseconds)
- ✅ Different creators (cannot match own bid)
- ✅ Both bids are in "Open" status

### Match Completion Logic

Matches are automatically completed when:
- ⏰ Current time >= match end time
- 📊 Match status is "Active"
- 💰 Prize has not been claimed yet

## Smart Contract Functions Used

### Bid Matching
```move
public entry fun match_bids(
    signer_cap: &MatchSignerCap,
    registry: &mut EscrowRegistry,
    squad_registry: &SquadRegistry,
    active_squad_registry: &mut ActiveSquadRegistry,
    bid1_id: ID,
    bid2_id: ID,
    squad1_token_prices: vector<u64>,
    squad2_token_prices: vector<u64>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

### Match Completion
```move
public entry fun complete_match(
    signer_cap: &MatchSignerCap,
    registry: &mut EscrowRegistry,
    squad_registry: &mut SquadRegistry,
    active_squad_registry: &mut ActiveSquadRegistry,
    user_stats_registry: &mut UserStatsRegistry,
    match_id: ID,
    squad1_final_token_prices: vector<u64>,
    squad2_final_token_prices: vector<u64>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

### Prize Claiming
```move
public entry fun claim_prize(
    signer_cap: &MatchSignerCap,
    registry: &mut EscrowRegistry,
    fees: &mut Fees,
    match_id: ID,
    ctx: &mut TxContext
)
```

## PTB (Programmable Transaction Block) Features

### Atomic Match Completion
The system uses PTBs to combine match completion and prize claiming in a single transaction:

```typescript
// Step 1: Complete the match
tx.moveCall({
  package: networkConfig.packageId,
  module: "match_escrow",
  function: "complete_match",
  arguments: [/* ... */],
});

// Step 2: Claim the prize immediately
tx.moveCall({
  package: networkConfig.packageId,
  module: "match_escrow",
  function: "claim_prize",
  arguments: [/* ... */],
});
```

### Batch Processing
Multiple matches can be processed in a single transaction for efficiency:

```typescript
// Process multiple matches atomically
for (const match of matches) {
  tx.moveCall({ /* complete_match */ });
  tx.moveCall({ /* claim_prize */ });
}
```

## Error Handling

The system includes comprehensive error handling:

- 🔄 **Retry Logic**: Automatic retries for transient failures
- 🚨 **Error Logging**: Detailed error logs with context
- 📊 **Error Statistics**: Tracking of error counts and types
- 🔄 **Fallback Mechanisms**: Batch processing falls back to individual processing

## Security Features

- 🔐 **Capability-Based Authorization**: Uses Match Signer Capability for secure operations
- 🛡️ **Input Validation**: Validates all inputs before processing
- 🔒 **Private Key Management**: Secure handling of private keys
- 📝 **Audit Trail**: Comprehensive logging of all operations

## Monitoring and Statistics

The system tracks:
- 📊 Total matches created
- ✅ Completed matches
- 💰 Total prizes distributed
- ❌ Error count
- 🔄 Active matches
- 📈 Performance metrics

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure `.env` file is properly configured
   - Only `MATCH_SIGNER_PRIVATE_KEY` is required now

2. **"No Match Signer Capability found for this address"**
   - Create a Match Signer Capability using the admin cap
   - Ensure the capability is created for the correct address

3. **"Invalid network"**
   - Verify NETWORK environment variable is set correctly
   - Ensure network constants are properly configured

4. **"Unauthorized" errors**
   - Verify Match Signer Capability is correctly created
   - Check that the capability belongs to the automation service address

5. **"Insufficient gas" errors**
   - Ensure the automation service wallet has sufficient SUI
   - Consider increasing gas budget for complex operations

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for additional details 