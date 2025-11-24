import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Match, Bid } from '../types/bid-matching.types';
import { TokenPriceService } from './token-price.service';

export class MatchService {
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private packageId: string;
  private escrowRegistryId: string;
  private squadRegistryId: string;
  private activeSquadRegistryId: string;
  private userStatsRegistryId: string;
  private feesId: string;
  private tokenPriceService: TokenPriceService;

  constructor(
    suiClient: SuiClient,
    keypair: Ed25519Keypair,
    packageId: string,
    escrowRegistryId: string,
    squadRegistryId: string,
    activeSquadRegistryId: string,
    userStatsRegistryId: string,
    feesId: string,
    tokenPriceService: TokenPriceService
  ) {
    this.suiClient = suiClient;
    this.keypair = keypair;
    this.packageId = packageId;
    this.escrowRegistryId = escrowRegistryId;
    this.squadRegistryId = squadRegistryId;
    this.activeSquadRegistryId = activeSquadRegistryId;
    this.userStatsRegistryId = userStatsRegistryId;
    this.feesId = feesId;
    this.tokenPriceService = tokenPriceService;
  }

  async getActiveMatches(): Promise<Match[]> {
    try {
      console.log("🔍 Fetching active matches from blockchain...");
  
      const matchEvents = await this.suiClient.queryEvents({
        query: { MoveEventType: `${this.packageId}::match_escrow::BidsMatched` },
        limit: 1000,
        order: "descending",
      });

    
      const completedEvents = await this.suiClient.queryEvents({
        query: { MoveEventType: `${this.packageId}::match_escrow::MatchCompleted` },
        limit: 1000,
        order: "descending",
      });

      const completedMatches = new Set<string>();
      for (const event of completedEvents.data) {
        if (event.parsedJson) {
          const completeData = event.parsedJson as any;
          completedMatches.add(completeData.match_id);
        }
      }

      const tieEvents = await this.suiClient.queryEvents({
        query: { MoveEventType: `${this.packageId}::match_escrow::MatchTied` },
        limit: 1000,
        order: "descending",
      });

      const tiedMatches = new Set<string>();
      for (const event of tieEvents.data) {
        if (event.parsedJson) {
          const tieData = event.parsedJson as any;
          tiedMatches.add(tieData.match_id);
        }
      }

      const matches: Match[] = [];

      for (const event of matchEvents.data) {
        if (event.parsedJson) {
          const matchData = event.parsedJson as any;
          const matchId = matchData.match_id;
          const startedAt = parseInt(event.timestampMs || "0");
          const duration = parseInt(matchData.duration);
          const endsAt = parseInt(matchData.ends_at);

    
          let status: Match["status"] = "Active";
          if (completedMatches.has(matchId)) {
            status = "Completed";
          } else if (tiedMatches.has(matchId)) {
            status = "Tied";
          }

        
          if (status === "Active") {
            matches.push({
              id: matchId,
              bid1Id: matchData.bid1_id,
              bid2Id: matchData.bid2_id,
              player1: matchData.player1,
              player2: matchData.player2,
              squad1Id: parseInt(matchData.squad1_id),
              squad2Id: parseInt(matchData.squad2_id),
              totalPrize: parseInt(matchData.total_prize),
              totalFees: 0, 
              duration,
              startedAt,
              endsAt,
              status,
              prizeClaimed: false,
              feesCollected: false,
              player1InitialTokenSum: parseInt(matchData.player1_initial_token_sum || "0"),
              player2InitialTokenSum: parseInt(matchData.player2_initial_token_sum || "0"),
              player1FinalTokenSum: 0,
              player2FinalTokenSum: 0,
              player1PercentageIncrease: 0,
              player2PercentageIncrease: 0,
              squad1TokenPrices: matchData.squad1_token_prices || [],
              squad2TokenPrices: matchData.squad2_token_prices || [],
              squad1FinalTokenPrices: [],
              squad2FinalTokenPrices: [],
            });
          }
        }
      }

      console.log(`✅ Found ${matches.length} active matches`);
      return matches;
    } catch (error) {
      console.error("❌ Error fetching active matches:", error);
      throw error;
    }
  }


  findExpiredMatches(matches: Match[]): Match[] {
    const currentTime = Date.now();
    const expiredMatches = matches.filter(match => 
      match.status === "Active" && 
      currentTime >= match.endsAt
    );
    
    console.log(`Found ${expiredMatches.length} expired matches ready for completion`);
    return expiredMatches;
  }

  async getMatchSignerCap(): Promise<string> {
    try {
      console.log("Querying MatchSignerCap for address:", this.keypair.getPublicKey().toSuiAddress());

      const ownedObjects = await this.suiClient.getOwnedObjects({
        owner: this.keypair.getPublicKey().toSuiAddress(),
        filter: {
          StructType: `${this.packageId}::match_signer::MatchSignerCap`,
        },
        options: {
          showContent: true,
        },
      });

      if (ownedObjects.data.length === 0) {
        throw new Error("No MatchSignerCap found for the provided keypair. Please ensure the keypair owns a MatchSignerCap.");
      }

      const matchSignerCapId = ownedObjects.data[0].data?.objectId;
      
      if (!matchSignerCapId) {
        throw new Error("Failed to get MatchSignerCap object ID");
      }

      console.log("Found MatchSignerCap:", matchSignerCapId);
      return matchSignerCapId;
    } catch (error) {
      console.error("Error querying MatchSignerCap:", error);
      throw error;
    }
  }

  
  async matchBids(bid1: Bid, bid2: Bid): Promise<boolean> {
    try {
      console.log(`🔄 Attempting to match bids ${bid1.id} and ${bid2.id}`);
      console.log(`Bid 1: Creator=${bid1.creator}, Squad=${bid1.squadId}, Amount=${bid1.bidAmount}, Duration=${bid1.duration}`);
      console.log(`Bid 2: Creator=${bid2.creator}, Squad=${bid2.squadId}, Amount=${bid2.bidAmount}, Duration=${bid2.duration}`);

   
      const matchSignerCapId = await this.getMatchSignerCap();

      const [squad1Prices, squad2Prices] = await Promise.all([
        this.tokenPriceService.getSquadTokenPrices(bid1.squadId),
        this.tokenPriceService.getSquadTokenPrices(bid2.squadId)
      ]);

      const squad1PriceVector = squad1Prices.map(tp => tp.price);
      const squad2PriceVector = squad2Prices.map(tp => tp.price);
      
      // Ensure vectors are not empty and contain valid u64 values
      if (squad1PriceVector.length === 0) {
        throw new Error(`Squad ${bid1.squadId} returned no token prices`);
      }
      
      if (squad2PriceVector.length === 0) {
        throw new Error(`Squad ${bid2.squadId} returned no token prices`);
      }
      
      // Ensure all values are valid u64 (positive integers)
      const validSquad1Prices = squad1PriceVector.map(price => Math.max(0, Math.floor(price)));
      const validSquad2Prices = squad2PriceVector.map(price => Math.max(0, Math.floor(price)));
      
      // Convert to BigInt to ensure proper u64 handling
      const squad1PricesU64 = validSquad1Prices.map(price => BigInt(price));
      const squad2PricesU64 = validSquad2Prices.map(price => BigInt(price));
      
      console.log(`Squad ${bid1.squadId} price vector: [${validSquad1Prices.join(', ')}]`);
      console.log(`Squad ${bid2.squadId} price vector: [${validSquad2Prices.join(', ')}]`);

      // Debug: Log all arguments being passed
      console.log(`🔍 Debug - Arguments being passed to match_bids:`);
      console.log(`  - matchSignerCapId: ${matchSignerCapId}`);
      console.log(`  - escrowRegistryId: ${this.escrowRegistryId}`);
      console.log(`  - squadRegistryId: ${this.squadRegistryId}`);
      console.log(`  - activeSquadRegistryId: ${this.activeSquadRegistryId}`);
      console.log(`  - bid1.id: ${bid1.id}`);
      console.log(`  - bid2.id: ${bid2.id}`);
      console.log(`  - squad1PriceVector length: ${validSquad1Prices.length}, values: [${validSquad1Prices.join(', ')}]`);
      console.log(`  - squad2PriceVector length: ${validSquad2Prices.length}, values: [${validSquad2Prices.join(', ')}]`);

      const tx = new Transaction();

      tx.moveCall({
        package: this.packageId,
        module: "match_escrow",
        function: "match_bids",
        arguments: [
          tx.object(matchSignerCapId),
          tx.object(this.escrowRegistryId),
          tx.object(this.squadRegistryId), // This should be the SquadRegistry object
          tx.object(this.activeSquadRegistryId),
          tx.pure.id(bid1.id),
          tx.pure.id(bid2.id),
          tx.pure.vector("u64", squad1PricesU64),
          tx.pure.vector("u64", squad2PricesU64),
          tx.object("0x6"), // Clock object
        ],
      });

      console.log("Transaction built, attempting to execute...");


      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === "success") {
        console.log(`✅ Successfully matched bids ${bid1.id} and ${bid2.id}`);
        console.log(`Transaction: ${result.digest}`);
        return true;
      } else {
        console.error(`❌ Failed to match bids ${bid1.id} and ${bid2.id}: Transaction failed`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error matching bids ${bid1.id} and ${bid2.id}:`, error);
      
      if (error && typeof error === 'object') {
        const errorStr = error.toString();
        const errorMessage = (error as any).message || '';
        
        if (errorStr.includes('3001') || errorMessage.includes('3001')) {
          console.log(`🔍 Move abort error 3001 detected - bids ${bid1.id} and ${bid2.id} are already matched`);
          throw new Error(`Move abort 3001: Bids ${bid1.id} and ${bid2.id} are already matched`);
        }
        
        if ('cause' in error) {
          const cause = (error as any).cause;
          if (cause?.effects?.abortError) {
            console.error(`Move abort details:`, cause.effects.abortError);
          }
        }
      }
      
      return false;
    }
  }


  async verifyFeesObject(): Promise<boolean> {
    try {
      console.log(`🔍 Verifying fees object exists: ${this.feesId}`);
      
      const feesObject = await this.suiClient.getObject({
        id: this.feesId,
        options: {
          showContent: true,
        },
      });

      if (feesObject.data) {
        console.log(`✅ Fees object verified: ${this.feesId}`);
        return true;
      } else {
        console.error(`❌ Fees object not found: ${this.feesId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error verifying fees object:`, error);
      return false;
    }
  }

 
  async completeMatchAndClaimPrize(match: Match): Promise<boolean> {
    try {
      console.log(`🏁 Completing and claiming prize for match ${match.id} in single transaction`);

      const matchSignerCapId = await this.getMatchSignerCap();

      console.log(`🔍 Using fees ID: ${this.feesId}`);

      const feesExists = await this.verifyFeesObject();
      if (!feesExists) {
        console.error(`❌ Cannot complete match: fees object ${this.feesId} does not exist`);
        return false;
      }

      // Clear ALL caches and use DIRECT API calls for match completion
      console.log("🔥 Clearing all token price caches before final price fetch...");
      this.tokenPriceService.clearCache();
      
      console.log("🔥 Fetching LIVE token prices with ZERO CACHE for match completion...");
      const [squad1FinalPrices, squad2FinalPrices] = await Promise.all([
        this.tokenPriceService.getSquadTokenPricesFresh(match.squad1Id),
        this.tokenPriceService.getSquadTokenPricesFresh(match.squad2Id)
      ]);

      const squad1FinalPriceVector = squad1FinalPrices.map(tp => tp.price);
      const squad2FinalPriceVector = squad2FinalPrices.map(tp => tp.price);

      if (squad1FinalPriceVector.length === 0) {
        throw new Error(`Squad ${match.squad1Id} returned no final token prices`);
      }
      if (squad2FinalPriceVector.length === 0) {
        throw new Error(`Squad ${match.squad2Id} returned no final token prices`);
      }

      console.log(`🔥 Squad ${match.squad1Id} LIVE final prices: [${squad1FinalPriceVector.join(', ')}] (DIRECT API - NO CACHE)`);
      console.log(`🔥 Squad ${match.squad2Id} LIVE final prices: [${squad2FinalPriceVector.join(', ')}] (DIRECT API - NO CACHE)`);
      
      // Log initial vs final for comparison
      console.log(`📊 Squad ${match.squad1Id} initial sum: ${match.player1InitialTokenSum}, final sum calculated from LIVE prices`);
      console.log(`📊 Squad ${match.squad2Id} initial sum: ${match.player2InitialTokenSum}, final sum calculated from LIVE prices`);

      console.log(`🔍 Transaction object IDs:`);
      console.log(`  - MatchSignerCap: ${matchSignerCapId}`);
      console.log(`  - EscrowRegistry: ${this.escrowRegistryId}`);
      console.log(`  - SquadRegistry: ${this.squadRegistryId}`);
      console.log(`  - ActiveSquadRegistry: ${this.activeSquadRegistryId}`);
      console.log(`  - UserStatsRegistry: ${this.userStatsRegistryId}`);
      console.log(`  - FeesId: ${this.feesId}`);
      console.log(`  - MatchId: ${match.id}`);

      const tx = new Transaction();

      tx.moveCall({
        package: this.packageId,
        module: "match_escrow",
        function: "complete_match",
        arguments: [
          tx.object(matchSignerCapId),
          tx.object(this.escrowRegistryId),
          tx.object(this.squadRegistryId),
          tx.object(this.activeSquadRegistryId),
          tx.object(this.userStatsRegistryId),
          tx.pure.id(match.id),
          tx.pure.vector("u64", squad1FinalPriceVector),
          tx.pure.vector("u64", squad2FinalPriceVector),
          tx.object("0x6"), 
        ],
      });

  
      tx.moveCall({
        package: this.packageId,
        module: "match_escrow",
        function: "claim_prize",
        arguments: [
          tx.object(matchSignerCapId),
          tx.object(this.escrowRegistryId),
          tx.object(this.feesId),
          tx.pure.id(match.id),
        ],
      });

      console.log("Transaction built, attempting to execute...");

      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

    
      if (result.effects?.status?.status === "success") {
        console.log(`✅ Successfully completed and claimed prize for match ${match.id}`);
        console.log(`Transaction: ${result.digest}`);
        return true;
      } else {
        console.error(`❌ Failed to complete and claim prize for match ${match.id}: Transaction failed`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error completing and claiming prize for match ${match.id}:`, error);
      
      if (error && typeof error === 'object' && 'cause' in error) {
        const cause = (error as any).cause;
        if (cause?.effects?.abortError) {
          console.error(`Move abort details:`, cause.effects.abortError);
        }
      }
      
      return false;
    }
  }

  validateMatch(match: any): match is Match {
    const isValid = (
      typeof match.id === "string" &&
      typeof match.bid1Id === "string" &&
      typeof match.bid2Id === "string" &&
      typeof match.player1 === "string" &&
      typeof match.player2 === "string" &&
      typeof match.squad1Id === "number" &&
      typeof match.squad2Id === "number" &&
      typeof match.totalPrize === "number" &&
      typeof match.duration === "number" &&
      typeof match.startedAt === "number" &&
      typeof match.endsAt === "number" &&
      typeof match.status === "string" &&
      typeof match.prizeClaimed === "boolean" &&
      typeof match.feesCollected === "boolean" &&
      match.totalPrize > 0 &&
      match.duration > 0 &&
      match.id.length > 0
    );

    if (!isValid) {
      console.warn(`Invalid match data:`, match);
    }

    return isValid;
  }

  async getMatchStatistics(): Promise<{
    totalActiveMatches: number;
    expiredMatches: number;
    squadPairDistribution: Record<string, number>;
    durationDistribution: Record<number, number>;
    prizeDistribution: Record<number, number>;
  }> {
    try {
      const activeMatches = await this.getActiveMatches();
      const expiredMatches = this.findExpiredMatches(activeMatches);
      
      const squadPairDistribution: Record<string, number> = {};
      const durationDistribution: Record<number, number> = {};
      const prizeDistribution: Record<number, number> = {};

      for (const match of activeMatches) {
        const squadPair = `${match.squad1Id}-${match.squad2Id}`;
        squadPairDistribution[squadPair] = (squadPairDistribution[squadPair] || 0) + 1;
        
        durationDistribution[match.duration] = (durationDistribution[match.duration] || 0) + 1;
        
        prizeDistribution[match.totalPrize] = (prizeDistribution[match.totalPrize] || 0) + 1;
      }

      return {
        totalActiveMatches: activeMatches.length,
        expiredMatches: expiredMatches.length,
        squadPairDistribution,
        durationDistribution,
        prizeDistribution,
      };
    } catch (error) {
      console.error("Error calculating match statistics:", error);
      return {
        totalActiveMatches: 0,
        expiredMatches: 0,
        squadPairDistribution: {},
        durationDistribution: {},
        prizeDistribution: {},
      };
    }
  }
} 