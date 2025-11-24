//@ts-nocheck
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { config } from 'dotenv';
import { CONSTANTS_ID } from '../constantsId';
import { AutomationConfig } from './types/bid-matching.types';
import { TokenPriceService } from './services/token-price.service';
import { BidService } from './services/bid.service';
import { MatchService } from './services/match.service';

config({ path: '.env' });

function loadConfig(): AutomationConfig {
  const network = (process.env.VITE_SUI_NETWORK || "devnet") as "devnet" | "mainnet" | "testnet" | "localnet";
  const networkConstants = CONSTANTS_ID[network as keyof typeof CONSTANTS_ID];
  
  if (!networkConstants) {
    throw new Error(`No constants found for network: ${network}`);
  }

  const isPlaceholder = (value: string) => {
    return value.includes('TODO') || 
           value.includes('0x1234567890abcdef') || 
           value.includes('0xabcdef1234567890');
  };

  const getValue = (envVar: string | undefined, constantValue: string) => {
    if (!envVar || isPlaceholder(envVar)) {
      return constantValue;
    }
    return envVar;
  };

  // Debug: Log the config loading process
  console.log("🔍 Debug - Config loading:");
  console.log("  - Network:", network);
  console.log("  - VITE_SQUAD_REGISTRY_ID env var:", process.env.VITE_SQUAD_REGISTRY_ID);
  console.log("  - Network constants squadRegistryId:", networkConstants.squadRegistryId);
  console.log("  - Network constants signerRegistryId:", networkConstants.signerRegistryId);

  const config = {
    network,
    packageId: getValue(process.env.VITE_BULLFY_PACKAGE_ID, networkConstants.packageId),
    escrowRegistryId: getValue(process.env.VITE_ESCROW_REGISTRY_ID, networkConstants.escrowRegistryId),
    squadRegistryId: getValue(process.env.VITE_SQUAD_REGISTRY_ID, networkConstants.squadRegistryId),
    activeSquadRegistryId: getValue(process.env.VITE_ACTIVE_SQUAD_REGISTRY_ID, networkConstants.activeSquadRegistryId),
    userStatsRegistryId: getValue(process.env.VITE_USER_STATS_REGISTRY_ID, networkConstants.userStatsRegistryId),
    feesId: getValue(process.env.VITE_FEES_ID, networkConstants.feesId),
    matchSignerPrivateKey: process.env.VITE_MATCH_SIGNER_PRIVATE_KEY || "",
    maxConsecutiveErrors: 5,
    iterationDelayMs: 1000, 
    matchDelayMs: 1000, 
    completionDelayMs: 500, 
  };

  console.log("  - Final squadRegistryId:", config.squadRegistryId);
  console.log("  - Final signerRegistryId:", networkConstants.signerRegistryId);

  return config;
}

export class BidMatchingAutomation {
  private config: AutomationConfig;
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private tokenPriceService: TokenPriceService;
  private bidService: BidService;
  private matchService: MatchService;
  private consecutiveErrors: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.config = loadConfig();
    
    if (!this.config.matchSignerPrivateKey) {
      throw new Error("VITE_MATCH_SIGNER_PRIVATE_KEY environment variable is required");
    }

    this.suiClient = new SuiClient({ url: getFullnodeUrl(this.config.network) });

    this.keypair = Ed25519Keypair.fromSecretKey(Buffer.from(this.config.matchSignerPrivateKey, 'base64'));

    this.tokenPriceService = new TokenPriceService();
    this.tokenPriceService.initialize(this.suiClient, this.config.squadRegistryId);
    
    this.bidService = new BidService(this.suiClient, this.config.packageId);
    this.matchService = new MatchService(
      this.suiClient,
      this.keypair,
      this.config.packageId,
      this.config.escrowRegistryId,
      this.config.squadRegistryId,
      this.config.activeSquadRegistryId,
      this.config.userStatsRegistryId,
      this.config.feesId,
      this.tokenPriceService
    );
  }

  async verifySetup(): Promise<boolean> {
    try {
      console.log("🔍 Verifying automation setup...");
      console.log("Network:", this.config.network);
      console.log("Package ID:", this.config.packageId);
      console.log("Escrow Registry ID:", this.config.escrowRegistryId);
      console.log("Squad Registry ID:", this.config.squadRegistryId);
      console.log("Active Squad Registry ID:", this.config.activeSquadRegistryId);
      console.log("User Stats Registry ID:", this.config.userStatsRegistryId);
      console.log("Fees ID:", this.config.feesId);
      console.log("Signer Address:", this.keypair.getPublicKey().toSuiAddress());

      await this.matchService.getMatchSignerCap();
      console.log("✅ MatchSignerCap access verified");

      await this.tokenPriceService.getTokenPrices();
      console.log("✅ Token price service verified");

      return true;
    } catch (error) {
      console.error("❌ Setup verification failed:", error);
      return false;
    }
  }

  async processBidMatching(): Promise<{ processed: number; successful: number }> {
    try {
      console.log("🔍 Phase 1: Bid Matching");
      
      const activeBids = await this.bidService.getActiveBids(true, this.config.escrowRegistryId);
      
      console.log(`Found ${activeBids.length} valid active bids`);

      if (activeBids.length === 0) {
        return { processed: 0, successful: 0 };
      }

      const compatiblePairs = this.bidService.findCompatibleBids(activeBids);
      
      if (compatiblePairs.length === 0) {
        console.log("No compatible bid pairs found");
        return { processed: 0, successful: 0 };
      }

      console.log(`Found ${compatiblePairs.length} compatible pairs to process`);

      let successfulMatches = 0;
      let skippedPairs = 0;
      
      for (const pair of compatiblePairs) {
        try {
          const alreadyMatched = await this.bidService.areBidsAlreadyMatched(pair.bid1.id, pair.bid2.id);
          if (alreadyMatched) {
            console.log(`⏭️  Skipping pair ${pair.bid1.id}-${pair.bid2.id}: bids already matched`);
            skippedPairs++;
            continue;
          }

          const validation = await this.bidService.validateBidsForMatching(pair.bid1.id, pair.bid2.id, this.config.escrowRegistryId);
          
          if (validation.bid1 && validation.bid2) {
            console.log(`🔄 Attempting to match bids ${pair.bid1.id} and ${pair.bid2.id}...`);
            const success = await this.matchService.matchBids(validation.bid1, validation.bid2);
            if (success) {
              successfulMatches++;
              console.log(`✅ Successfully matched bids ${pair.bid1.id} and ${pair.bid2.id}`);
              await new Promise(resolve => setTimeout(resolve, this.config.matchDelayMs));
            } else {
              console.log(`❌ Failed to match bids ${pair.bid1.id} and ${pair.bid2.id}`);
            }
          } else {
            console.log(`⏭️  Skipping pair ${pair.bid1.id}-${pair.bid2.id}: bids no longer active`);
            skippedPairs++;
          }
        } catch (error: any) {
          if (error.message && error.message.includes('Move abort 3001')) {
            console.log(`⏭️  Skipping pair ${pair.bid1.id}-${pair.bid2.id}: bids already matched (Move abort 3001)`);
            skippedPairs++;
          } else if (error.message && error.message.includes('3001')) {
            console.log(`⏭️  Skipping pair ${pair.bid1.id}-${pair.bid2.id}: bids already matched (Move abort 3001)`);
            skippedPairs++;
          } else {
            console.error(`❌ Error processing pair ${pair.bid1.id}-${pair.bid2.id}:`, error);
          }
        }
      }

      console.log(`Completed bid matching: ${successfulMatches} successful, ${skippedPairs} skipped, ${compatiblePairs.length} total pairs`);
      return { processed: compatiblePairs.length, successful: successfulMatches };
      
    } catch (error) {
      console.error("❌ Error in bid matching phase:", error);
      throw error;
    }
  }

  async processMatchCompletion(): Promise<{ processed: number; successful: number }> {
    try {
      console.log("⏰ Phase 2: Match Completion");
      
      const activeMatches = await this.matchService.getActiveMatches();
      const validMatches = activeMatches.filter(match => this.matchService.validateMatch(match));
      
      console.log(`Found ${activeMatches.length} total matches, ${validMatches.length} valid active matches`);

      if (validMatches.length === 0) {
        return { processed: 0, successful: 0 };
      }

      const expiredMatches = this.matchService.findExpiredMatches(validMatches);
      
      if (expiredMatches.length === 0) {
        return { processed: 0, successful: 0 };
      }

      let successfulCompletions = 0;
      for (const match of expiredMatches) {
        const success = await this.matchService.completeMatchAndClaimPrize(match);
        if (success) {
          successfulCompletions++;
          await new Promise(resolve => setTimeout(resolve, this.config.completionDelayMs));
        }
      }

      console.log(`Completed match processing: ${successfulCompletions}/${expiredMatches.length} successful completions`);
      return { processed: expiredMatches.length, successful: successfulCompletions };
      
    } catch (error) {
      console.error("❌ Error in match completion phase:", error);
      throw error;
    }
  }

  async printStatistics(): Promise<void> {
    try {
      const [bidStats, matchStats] = await Promise.all([
        this.bidService.getBidStatistics(),
        this.matchService.getMatchStatistics()
      ]);

      console.log("\n📊 System Statistics:");
      console.log(`Active Bids: ${bidStats.active}`);
      console.log(`Active Matches: ${matchStats.totalActiveMatches}`);
      console.log(`Expired Matches: ${matchStats.expiredMatches}`);
      
      if (bidStats.active > 0) {
        console.log(`Total Bids: ${bidStats.total}, Matched: ${bidStats.matched}, Cancelled: ${bidStats.cancelled}`);
      }
      
      if (matchStats.totalActiveMatches > 0) {
        console.log("Squad Pair Distribution:", matchStats.squadPairDistribution);
      }
    } catch (error) {
      console.error("Error printing statistics:", error);
    }
  }

  async runAutomation(): Promise<void> {
    console.log("🚀 Starting bid matching and payout automation...");
    
    const setupValid = await this.verifySetup();
    if (!setupValid) {
      console.error("❌ Setup verification failed, cannot start automation");
      return;
    }

    this.isRunning = true;
    let iterationCount = 0;
    const maxIterations = 1000; 

    while (this.isRunning && iterationCount < maxIterations) {
      iterationCount++;
      
      try {
        console.log(`\n--- Iteration ${iterationCount} ---`);
        
        if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
          console.error(`❌ Too many consecutive errors (${this.consecutiveErrors}), stopping automation`);
          break;
        }

        const bidResults = await this.processBidMatching();
        
        const matchResults = await this.processMatchCompletion();
        
        if (iterationCount % 10 === 0) {
          await this.printStatistics();
        }

        if (bidResults.successful > 0 || matchResults.successful > 0) {
          this.consecutiveErrors = 0;
        }

        console.log(`⏳ Waiting ${this.config.iterationDelayMs}ms before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, this.config.iterationDelayMs));
        
      } catch (error) {
        console.error("❌ Error in automation loop:", error);
        this.consecutiveErrors++;
        
        const backoffTime = Math.min(10000 * Math.pow(2, this.consecutiveErrors - 1), 60000);
        console.log(`Waiting ${backoffTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }

    console.log("🏁 Automation completed or stopped");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down bid matching and payout automation...");
    this.isRunning = false;
    
    this.tokenPriceService.clearCache();
    
    console.log("✅ Shutdown complete");
  }

  getConfig(): AutomationConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("Configuration updated:", newConfig);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const automation = new BidMatchingAutomation();
  
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await automation.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await automation.shutdown();
    process.exit(0);
  });

  automation.runAutomation().catch(error => {
    console.error("Fatal error in automation:", error);
    process.exit(1);
  });
} 