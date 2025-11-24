//@ts-nocheck
import { SuiClient } from "@mysten/sui/client";
import { Bid, MatchableBidPair } from '../types/bid-matching.types';

export class BidService {
  private suiClient: SuiClient;
  private packageId: string;

  constructor(suiClient: SuiClient, packageId: string) {
    this.suiClient = suiClient;
    this.packageId = packageId;
  }

  private validateBid(bid: any): bid is Bid {
    return (
      bid &&
      typeof bid.id === 'string' &&
      typeof bid.creator === 'string' &&
      typeof bid.squadId === 'number' &&
      typeof bid.bidAmount === 'number' &&
      typeof bid.duration === 'number' &&
      typeof bid.status === 'string' &&
      typeof bid.createdAt === 'number' &&
      typeof bid.expiresAt === 'number'
    );
  }

  async getActiveBidsFromRegistry(escrowRegistryId: string): Promise<Bid[]> {
    try {
      console.log("🚀 Fetching active bids directly from escrow registry...");
      
        const registryObject = await this.suiClient.getObject({
        id: escrowRegistryId,
        options: { showContent: true },
      });

      if (!registryObject.data?.content || !('fields' in registryObject.data.content)) {
        throw new Error("Could not access escrow registry");
      }

      const registryFields = registryObject.data.content.fields as any;
      console.log("🔍 Escrow registry fields:", Object.keys(registryFields));

      const activeBidsArray = registryFields.active_bids;
      if (!activeBidsArray || !Array.isArray(activeBidsArray)) {
        console.log("📋 Available registry fields:", Object.keys(registryFields));
        console.log("🔍 Active bids structure:", activeBidsArray);
        throw new Error("Could not find active_bids array in escrow registry");
      }

      console.log(`📊 Found ${activeBidsArray.length} active bid entries in registry`);

      const activeBids: Bid[] = [];
      const currentTime = Date.now();

  
      for (const bidEntry of activeBidsArray) {
        try {
          const bidFields = bidEntry.fields;
          
          if (bidFields) {
            const bidId = bidFields.id?.id || bidFields.id;
            const createdAt = parseInt(bidFields.created_at || "0");
            const duration = parseInt(bidFields.duration || "0");
            const expiresAt = createdAt + (duration * 1000);
            const status = bidFields.status?.fields ? "Open" : "Open"; 

            if (status === "Open" && currentTime <= expiresAt) {
              const bid = {
                id: bidId,
                creator: bidFields.creator || "",
                squadId: parseInt(bidFields.squad_id || "0"),
                bidAmount: parseInt(bidFields.bid_amount || "0"),
                duration,
                status: "Open" as const,
                createdAt,
                expiresAt,
              };

              if (this.validateBid(bid)) {
                activeBids.push(bid);
                console.log(`✅ Active bid: ${bid.id} (Squad ${bid.squadId}, Amount: ${bid.bidAmount})`);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error processing bid entry:`, error);
        }
      }

      console.log(`🚀 FAST: Found ${activeBids.length} active bids directly from registry`);
      
      return activeBids;
    } catch (error) {
      console.error("❌ Error fetching bids from registry:", error);
      console.log("🔄 Falling back to event-based retrieval...");
      throw error;
    }
  }

  async getActiveBids(bypassCache: boolean = false, escrowRegistryId?: string): Promise<Bid[]> {
    try {
      if (escrowRegistryId) {
        try {
          console.log("🚀 Attempting fast registry-based bid retrieval...");
          return await this.getActiveBidsFromRegistry(escrowRegistryId);
        } catch (error) {
          console.warn("⚠️ Registry-based retrieval failed, falling back to event queries:", error);
        }
      }

      console.log("🔍 Fetching active bids from blockchain events...");
      
     
      const initialLimit = 200;
      
    
      const [createdEvents, matchedEvents, cancelledEvents] = await Promise.all([
        this.suiClient.queryEvents({
          query: { MoveEventType: `${this.packageId}::match_escrow::BidCreated` },
          limit: initialLimit,
          order: "descending", 
        }),
        this.suiClient.queryEvents({
          query: { MoveEventType: `${this.packageId}::match_escrow::BidMatched` },
          limit: initialLimit,
          order: "descending", 
        }),
        this.suiClient.queryEvents({
          query: { MoveEventType: `${this.packageId}::match_escrow::BidCancelled` },
          limit: initialLimit,
          order: "descending", 
        }),
      ]);

      const matchedBids = new Set<string>();
      const cancelledBids = new Set<string>();

      for (const event of matchedEvents.data) {
        if (event.parsedJson) {
          const matchData = event.parsedJson as any;
          matchedBids.add(matchData.bid1_id);
          matchedBids.add(matchData.bid2_id);
        }
      }

      for (const event of cancelledEvents.data) {
        if (event.parsedJson) {
          const cancelData = event.parsedJson as any;
          cancelledBids.add(cancelData.bid_id);
        }
      }

      const bids: Bid[] = [];
      const currentTime = Date.now();
      const maxActiveBidsToFind = 50; 

      console.log(`🔍 Scanning ${createdEvents.data.length} recent bid creation events...`);

      for (const event of createdEvents.data) {
        if (bids.length >= maxActiveBidsToFind) {
          console.log(`✅ Found ${bids.length} active bids (early termination)`);
          break;
        }

        if (event.parsedJson) {
          const bidData = event.parsedJson as any;
          const bidId = bidData.bid_id;
          const createdAt = parseInt(event.timestampMs || "0");
          const duration = parseInt(bidData.duration);
          const expiresAt = createdAt + (duration * 1000); 

          let status: Bid["status"] = "Open";
          
          if (matchedBids.has(bidId)) {
            status = "Matched";
            continue; 
          } else if (cancelledBids.has(bidId)) {
            status = "Cancelled";
            continue; 
          } else if (currentTime > expiresAt) {
            status = "Expired";
            continue; 
          }

          if (status === "Open" && currentTime <= expiresAt) {
            bids.push({
              id: bidId,
              creator: bidData.creator,
              squadId: parseInt(bidData.squad_id),
              bidAmount: parseInt(bidData.bid_amount),
              duration,
              status,
              createdAt,
              expiresAt,
            });
            
            console.log(`✅ Active bid found: ${bidId} (Squad ${bidData.squad_id}, Amount: ${bidData.bid_amount})`);
          }
        }
      }

      console.log(`✅ Found ${bids.length} active (Open) bids from ${createdEvents.data.length} recent events`);
      
      if (bids.length < 10 && createdEvents.data.length === initialLimit) {
        console.log("🔍 Low active bid count, checking older events...");
        
        const oldestEvent = createdEvents.data[createdEvents.data.length - 1];
        const oldestTimestamp = oldestEvent?.timestampMs;
        
        const olderCreatedEvents = await this.suiClient.queryEvents({
          query: { MoveEventType: `${this.packageId}::match_escrow::BidCreated` },
          limit: 300, 
          order: "descending",
          cursor: oldestEvent?.id ? {
            eventSeq: oldestEvent.id.eventSeq,
            txDigest: oldestEvent.id.txDigest
          } : undefined,
        });
        
        console.log(`🔍 Scanning ${olderCreatedEvents.data.length} older bid creation events...`);
        
        for (const event of olderCreatedEvents.data) {
          if (bids.length >= maxActiveBidsToFind) break;
          
          if (event.parsedJson) {
            const bidData = event.parsedJson as any;
            const bidId = bidData.bid_id;
            const createdAt = parseInt(event.timestampMs || "0");
            const duration = parseInt(bidData.duration);
            const expiresAt = createdAt + (duration * 1000);

            if (matchedBids.has(bidId) || cancelledBids.has(bidId) || currentTime > expiresAt) {
              continue; 
            }

            bids.push({
              id: bidId,
              creator: bidData.creator,
              squadId: parseInt(bidData.squad_id),
              bidAmount: parseInt(bidData.bid_amount),
              duration,
              status: "Open",
              createdAt,
              expiresAt,
            });
            
            console.log(`✅ Active bid found (older): ${bidId} (Squad ${bidData.squad_id})`);
          }
        }
        
        console.log(`✅ Total active bids after extended search: ${bids.length}`);
      }
      
      console.log(`📊 Bid search summary: ${bids.length} active, ${matchedBids.size} matched, ${cancelledBids.size} cancelled`);
      
      return bids;
    } catch (error) {
      console.error("❌ Error fetching active bids:", error);
      throw error;
    }
  }

  async isBidStillActive(bidId: string, escrowRegistryId?: string): Promise<boolean> {
    try {
      const activeBids = await this.getActiveBids(false, escrowRegistryId);
      return activeBids.some(bid => bid.id === bidId && bid.status === "Open");
    } catch (error) {
      console.error(`Error checking bid ${bidId} status:`, error);
      return false;
    }
  }

  async validateBidsForMatching(bid1Id: string, bid2Id: string, escrowRegistryId?: string): Promise<{ bid1: Bid | null, bid2: Bid | null }> {
    try {
      console.log(`🔍 Validating bids ${bid1Id} and ${bid2Id} for matching...`);
      
      if (escrowRegistryId) {
        try {
          console.log("🚀 Using fast registry-based validation...");
          const activeBids = await this.getActiveBidsFromRegistry(escrowRegistryId);
          
          const bid1 = activeBids.find(bid => bid.id === bid1Id) || null;
          const bid2 = activeBids.find(bid => bid.id === bid2Id) || null;
          
          if (!bid1) {
            console.log(`❌ Bid ${bid1Id} not found or not active in registry`);
          }
          if (!bid2) {
            console.log(`❌ Bid ${bid2Id} not found or not active in registry`);
          }
          
          return { bid1, bid2 };
        } catch (error) {
          console.warn("⚠️ Registry-based validation failed, falling back to event queries:", error);
        }
      }

      const activeBids = await this.getActiveBids(false);
      
      const bid1 = activeBids.find(bid => bid.id === bid1Id) || null;
      const bid2 = activeBids.find(bid => bid.id === bid2Id) || null;
      
      if (!bid1) {
        console.log(`❌ Bid ${bid1Id} not found or not active`);
      }
      if (!bid2) {
        console.log(`❌ Bid ${bid2Id} not found or not active`);
      }
      
      return { bid1, bid2 };
    } catch (error) {
      console.error("❌ Error validating bids for matching:", error);
      throw error;
    }
  }

  findCompatibleBids(activeBids: Bid[]): MatchableBidPair[] {
    const compatiblePairs: MatchableBidPair[] = [];
    
    const bidsBySquad = new Map<number, Bid[]>();
    for (const bid of activeBids) {
      if (!bidsBySquad.has(bid.squadId)) {
        bidsBySquad.set(bid.squadId, []);
      }
      bidsBySquad.get(bid.squadId)!.push(bid);
    }

    for (const [squad1Id, squad1Bids] of bidsBySquad.entries()) {
      for (const [squad2Id, squad2Bids] of bidsBySquad.entries()) {
        if (squad1Id >= squad2Id) continue;
        
        for (const bid1 of squad1Bids) {
          for (const bid2 of squad2Bids) {
            if (bid1.bidAmount === bid2.bidAmount && 
                bid1.creator !== bid2.creator &&
                bid1.status === "Open" && 
                bid2.status === "Open") {
              compatiblePairs.push({ bid1, bid2 });
            }
          }
        }
      }
    }

    return compatiblePairs;
  }

  async areBidsAlreadyMatched(bid1Id: string, bid2Id: string): Promise<boolean> {
    try {
      const matchedEvents = await this.suiClient.queryEvents({
        query: { MoveEventType: `${this.packageId}::match_escrow::BidMatched` },
        limit: 100,
        order: "descending", 
      });

      for (const event of matchedEvents.data) {
        if (event.parsedJson) {
          const matchData = event.parsedJson as any;
          if (matchData.bid1_id === bid1Id || matchData.bid1_id === bid2Id ||
              matchData.bid2_id === bid1Id || matchData.bid2_id === bid2Id) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.warn("Error checking if bids are already matched:", error);
      return false; 
    }
  }

 
  async getBidStatistics(): Promise<{ total: number; active: number; matched: number; cancelled: number; expired: number }> {
    try {
      const activeBids = await this.getActiveBids(true);
      
      
      return {
        total: activeBids.length,
        active: activeBids.length,
        matched: 0, 
        cancelled: 0, 
        expired: 0 
      };
    } catch (error) {
      console.error("Error getting bid statistics:", error);
      return { total: 0, active: 0, matched: 0, cancelled: 0, expired: 0 };
    }
  }
}
