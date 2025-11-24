# Bid Matching Implementation

This document describes the bid matching functionality implemented in the Bullz app.

## Overview

The bid matching system allows users to:
1. View active bids from other users
2. Manually match compatible bids (for demo purposes)
3. View active matches and their progress
4. Navigate to live match sessions

## Components

### 1. Bid Matching Hook (`useMatchBids`)

Located in `src/lib/hooks/use-match-bidding.ts`, this hook provides functionality to match two bids together.

**Note**: The frontend implementation uses a placeholder for `MatchSignerCap` since this capability should be held by backend services for security reasons.

### 2. Bid Matching Component (`BidMatching`)

Located in `src/routes/live/components/bid-matching.tsx`, this component:
- Displays all active bids from other users
- Allows users to select two bids for matching
- Provides a UI to initiate the matching process
- Shows error messages when matching fails

### 3. Active Matches Component (`ActiveMatches`)

Located in `src/routes/live/components/active-matches.tsx`, this component:
- Displays all active matches for the current user
- Shows match details including time remaining, prize pool, and opponent
- Allows navigation to individual match sessions

### 4. Live Session Page

Updated `src/routes/live/[session_id]/page.tsx` to:
- Display real match data instead of hardcoded values
- Show actual time remaining for matches
- Display correct player information and squad IDs
- Auto-trigger end screens when matches complete

## Live Page Structure

The live page (`src/routes/live/index.tsx`) now has three tabs:

1. **ACTIVE MATCHES**: Shows all active matches for the current user
2. **MATCH BIDS**: Allows manual bid matching (for demo purposes)
3. **ENDED**: Shows completed matches (placeholder for now)

## Backend Automation

For production use, a backend automation service is provided in `src/scripts/bid-matching-automation.ts`. This service:

- Automatically finds compatible bid pairs
- Uses `MatchSignerCap` to execute matches
- Runs continuously to match bids as they become available
- Handles token price fetching (currently using mock data)

### Running the Automation

1. Set up environment variables:
   ```bash
   export MATCH_SIGNER_PRIVATE_KEY="your_base64_private_key"
   ```

2. Update the `MATCH_SIGNER_CAP_ID` in the script with your actual capability ID

3. Run the automation:
   ```bash
   npm run ts-node src/scripts/bid-matching-automation.ts
   ```

## Security Considerations

- The `MatchSignerCap` should only be held by trusted backend services
- Frontend users should not have direct access to match signing capabilities
- Token prices should be fetched from reliable price feeds in production
- Match completion should be automated to prevent disputes

## Demo Features

For demonstration purposes, the frontend includes:
- Manual bid matching interface
- Mock token prices for matches
- Auto-triggered end screens when matches complete
- Real-time countdown timers

## Future Improvements

1. **Real Price Feeds**: Integrate with actual token price APIs
2. **Match Completion**: Implement automatic match completion based on performance
3. **Dispute Resolution**: Add mechanisms for handling disputed matches
4. **Notifications**: Add real-time notifications for match events
5. **Analytics**: Track match statistics and user performance

## Usage

1. **Create Bids**: Users can create bids from the home page
2. **View Active Bids**: Navigate to Live > MATCH BIDS to see available bids
3. **Match Bids**: Select two compatible bids and click "MATCH BIDS"
4. **View Matches**: Go to Live > ACTIVE MATCHES to see ongoing matches
5. **Join Match**: Click on any active match to view the live session

## Contract Integration

The implementation integrates with the following contract functions:
- `match_escrow::create_bid` - Create new bids
- `match_escrow::match_bids` - Match two bids together
- `match_escrow::cancel_bid` - Cancel open bids
- `match_escrow::claim_prize` - Claim prizes from completed matches

Events are used to track:
- `BidCreated` - New bids created
- `BidsMatched` - Bids successfully matched
- `MatchCompleted` - Matches finished
- `PrizeClaimed` - Prizes claimed 