export interface Bid {
  id: string;
  creator: string;
  squadId: number;
  bidAmount: number;
  duration: number;
  status: "Open" | "Matched" | "Cancelled" | "Expired";
  createdAt: number;
  expiresAt: number;
}

export interface Match {
  id: string;
  bid1Id: string;
  bid2Id: string;
  player1: string;
  player2: string;
  squad1Id: number;
  squad2Id: number;
  totalPrize: number;
  totalFees: number;
  duration: number;
  startedAt: number;
  endsAt: number;
  status: "Active" | "Completed" | "Tied";
  winner?: string;
  prizeClaimed: boolean;
  feesCollected: boolean;
  player1InitialTokenSum: number;
  player2InitialTokenSum: number;
  player1FinalTokenSum: number;
  player2FinalTokenSum: number;
  player1PercentageIncrease: number;
  player2PercentageIncrease: number;
  squad1TokenPrices: number[];
  squad2TokenPrices: number[];
  squad1FinalTokenPrices: number[];
  squad2FinalTokenPrices: number[];
}

export interface MatchableBidPair {
  bid1: Bid;
  bid2: Bid;
}

export interface TokenPrice {
  tokenId: number;
  price: number;
  timestamp: number;
}

export interface SquadTokenConfig {
  squadId: number;
  tokenNames: string[];
  tokenSymbols: string[];
}

export interface AutomationConfig {
  network: "devnet" | "mainnet" | "testnet" | "localnet";
  packageId: string;
  escrowRegistryId: string;
  squadRegistryId: string;
  activeSquadRegistryId: string;
  userStatsRegistryId: string;
  feesId: string;
  matchSignerPrivateKey: string;
  maxConsecutiveErrors: number;
  iterationDelayMs: number;
  matchDelayMs: number;
  completionDelayMs: number;
} 