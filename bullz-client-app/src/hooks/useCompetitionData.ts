import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "@/networkConfig";

export interface UserScore {
  owner: string;
  score: number;
  shill_points: number;
  alpha_points: number;
  rank: number;
  redeemed: boolean;
}

export interface AssetPoints {
  symbol: string;
  points: number;
}

export interface Participant {
  owner: string;
  squad_id: string;
  symbols: string[];
  quantities: number[];
  joined_ts_ms: number;
  vaultBalances?: Record<string, string>;
}

export interface CompetitionState {
  week_index: number;
  start_ts_ms: number;
  lock_ts_ms: number;
  end_ts_ms: number;
  active: boolean;
  locked: boolean;
  participants: Participant[];
  user_scores: UserScore[];
  asset_points: AssetPoints[];
}

export interface WalrusSnapshot {
  timestamp: string;
  competitionStateId: string;
  weekIndex: number;
  startTsMs: number;
  lockTsMs: number;
  endTsMs: number;
  active: boolean;
  locked: boolean;
  participants: Participant[];
  assetPoints?: AssetPoints[];
}

export interface CompetitionSnapshotMetadata {
  blobId: string;
  timestamp: string;
  participantCount: number;
  walrusUrl: string;
}

// Fetch all available weeks from competition-snapshots.json
export async function fetchAvailableWeeks(): Promise<Array<{ week: number; metadata: CompetitionSnapshotMetadata }>> {
  try {
    let response = await fetch('/competition-snapshots.json');
    
    if (!response.ok) {
      response = await fetch('/walrus/competition-snapshots.json');
    }
    
    if (!response.ok) {
      console.warn(`Could not fetch competition-snapshots.json: ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    const weeks: Array<{ week: number; metadata: CompetitionSnapshotMetadata }> = [];
    
    // Parse all weeks from the JSON (format: week_1, week_2, etc.)
    Object.keys(data).forEach(key => {
      const weekMatch = key.match(/^week_(\d+)$/);
      if (weekMatch) {
        const weekNumber = parseInt(weekMatch[1], 10);
        weeks.push({
          week: weekNumber,
          metadata: data[key],
        });
      }
    });
    
    // Sort by week number descending (latest first)
    return weeks.sort((a, b) => b.week - a.week);
  } catch (error) {
    console.error("Error fetching available weeks:", error);
    return [];
  }
}

// Fetch snapshot metadata from competition-snapshots.json
async function fetchSnapshotMetadata(weekNumber: number): Promise<CompetitionSnapshotMetadata | null> {
  try {
    let response = await fetch('/competition-snapshots.json');
    
    if (!response.ok) {
      response = await fetch('/walrus/competition-snapshots.json');
    }
    
    if (!response.ok) {
      console.warn(`Could not fetch competition-snapshots.json: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Use sequential week format: week_1, week_2, etc.
    const weekKey = `week_${weekNumber}`;
    return data[weekKey] || null;
  } catch (error) {
    console.error("Error fetching snapshot metadata:", error);
    return null;
  }
}

// Fetch snapshot data from Walrus blob
async function fetchWalrusSnapshot(blobId: string): Promise<WalrusSnapshot | null> {
  try {
    const WALRUS_AGGREGATOR_URL = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
    const response = await fetch(WALRUS_AGGREGATOR_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Walrus snapshot: ${response.statusText}`);
    }
    const snapshot = await response.json();
    
    // Ensure participants are properly formatted
    if (snapshot.participants && Array.isArray(snapshot.participants)) {
      snapshot.participants = snapshot.participants.map((p: any) => {
        // Handle symbols - could be array or need filtering
        let symbols: string[] = [];
        if (Array.isArray(p.symbols)) {
          symbols = p.symbols.filter((s: any) => s && String(s).trim() !== '');
        } else if (p.symbols && typeof p.symbols === 'string') {
          symbols = [p.symbols];
        }
        
        return {
          owner: p.owner || "",
          squad_id: p.squadId || p.squad_id || "",
          symbols: symbols,
          quantities: Array.isArray(p.quantities) ? p.quantities.map((q: any) => Number(q) || 0) : [],
          joined_ts_ms: Number(p.joinedTsMs || p.joined_ts_ms) || 0,
          vaultBalances: p.vaultBalances || {},
        };
      });
    }
    
    // Ensure assetPoints are properly formatted
    if (snapshot.assetPoints && Array.isArray(snapshot.assetPoints)) {
      snapshot.assetPoints = snapshot.assetPoints.map((ap: any) => ({
        symbol: ap.symbol || "",
        points: Number(ap.points) || 0,
      }));
    }
    
    return snapshot as WalrusSnapshot;
  } catch (error) {
    console.error("Error fetching Walrus snapshot:", error);
    return null;
  }
}

export function useCompetitionState(selectedWeek?: number) {
  const suiClient = useSuiClient();
  const competitionStateId = useNetworkVariable("competitionStateId");

  return useQuery({
    queryKey: ["competition-state", competitionStateId, selectedWeek],
    queryFn: async (): Promise<CompetitionState | null> => {
      if (!competitionStateId || competitionStateId === "0xTODO") {
        return null;
      }

      // If a specific week is selected, use it; otherwise get current week from blockchain
      let targetWeek = selectedWeek;
      
      if (!targetWeek) {
        // Get current week_index from blockchain
        try {
          const object = await suiClient.getObject({
            id: competitionStateId,
            options: { showContent: true },
          });

          if (object.data?.content && object.data.content.dataType === "moveObject") {
            const fields = object.data.content.fields as any;
            const week_index = Number(fields.week_index) || 0;
            const start_ts_ms = Number(fields.start_ts_ms) || 0;
            
            // If week_index is a timestamp, calculate sequential week number
            if (week_index > 10000) {
              const referenceDate = new Date('2024-01-01T00:00:00Z').getTime();
              const msPerWeek = 7 * 24 * 60 * 60 * 1000;
              const weeksSinceReference = Math.floor((start_ts_ms - referenceDate) / msPerWeek);
              targetWeek = Math.max(1, weeksSinceReference + 1);
            } else {
              targetWeek = week_index || 1;
            }
          }
        } catch (error) {
          console.warn("Could not fetch week_index from blockchain:", error);
          targetWeek = 1; // Default to week 1
        }
      }

      // Default values
      let start_ts_ms = 0;
      let lock_ts_ms = 0;
      let end_ts_ms = 0;
      let active = false;
      let locked = false;

      // Try to fetch snapshot from Walrus first
      try {
        const snapshotMetadata = await fetchSnapshotMetadata(targetWeek || 1);
        if (snapshotMetadata?.blobId) {
          const walrusSnapshot = await fetchWalrusSnapshot(snapshotMetadata.blobId);
          if (walrusSnapshot) {
            // Fetch user_scores from blockchain (they might not be in Walrus snapshot)
            let user_scores: UserScore[] = [];
            try {
              const object = await suiClient.getObject({
                id: competitionStateId,
                options: { showContent: true },
              });

              if (object.data?.content && object.data.content.dataType === "moveObject") {
                const fields = object.data.content.fields as any;
                const parseVector = (vec: any): any[] => {
                  if (Array.isArray(vec)) return vec;
                  if (vec?.fields?.contents) return vec.fields.contents;
                  if (vec?.fields && Array.isArray(vec.fields)) return vec.fields;
                  return [];
                };

                const rawScores = parseVector(fields.user_scores);
                for (const item of rawScores) {
                  const sFields = item.fields || item;
                  user_scores.push({
                    owner: sFields.owner || "",
                    score: Number(sFields.score) || 0,
                    shill_points: Number(sFields.shill_points) || 0,
                    alpha_points: Number(sFields.alpha_points) || 0,
                    rank: Number(sFields.rank) || 0,
                    redeemed: sFields.redeemed || false,
                  });
                }
              }
            } catch (error) {
              console.warn("Could not fetch user_scores from blockchain:", error);
            }

            // Use data from Walrus snapshot as primary source
            return {
              week_index: targetWeek || walrusSnapshot.weekIndex || 1,
              start_ts_ms: walrusSnapshot.startTsMs || start_ts_ms,
              lock_ts_ms: walrusSnapshot.lockTsMs || lock_ts_ms,
              end_ts_ms: walrusSnapshot.endTsMs || end_ts_ms,
              active: walrusSnapshot.active !== undefined ? walrusSnapshot.active : active,
              locked: walrusSnapshot.locked !== undefined ? walrusSnapshot.locked : locked,
              participants: walrusSnapshot.participants || [],
              user_scores: user_scores, // Fetched from blockchain
              asset_points: walrusSnapshot.assetPoints || [],
            };
          }
        }
      } catch (error) {
        console.warn("Could not fetch Walrus snapshot, falling back to blockchain:", error);
      }

      // Fallback to blockchain if Walrus fetch fails
      try {
        const object = await suiClient.getObject({
          id: competitionStateId,
          options: { showContent: true },
        });

        if (!object.data?.content || object.data.content.dataType !== "moveObject") {
          return null;
        }

        const fields = object.data.content.fields as any;

        // Helper function to parse vector fields
        const parseVector = (vec: any): any[] => {
          if (Array.isArray(vec)) return vec;
          if (vec?.fields?.contents) return vec.fields.contents;
          if (vec?.fields && Array.isArray(vec.fields)) return vec.fields;
          return [];
        };

        // Helper function to parse string from Sui String type
        const parseString = (str: any): string => {
          if (typeof str === "string") return str;
          if (str?.fields?.value) return str.fields.value;
          return "";
        };

        // Parse participants
        const participants: Participant[] = [];
        const rawParticipants = parseVector(fields.participants);
        for (const item of rawParticipants) {
          const pFields = item.fields || item;
          const symbols = parseVector(pFields.symbols);
          const quantities = parseVector(pFields.quantities);
          
          participants.push({
            owner: pFields.owner || "",
            squad_id: pFields.squad_id || "",
            symbols: symbols.map((s: any) => parseString(s)),
            quantities: quantities.map((q: any) => Number(q) || 0),
            joined_ts_ms: Number(pFields.joined_ts_ms) || 0,
          });
        }

        // Parse user_scores
        const user_scores: UserScore[] = [];
        const rawScores = parseVector(fields.user_scores);
        for (const item of rawScores) {
          const sFields = item.fields || item;
          user_scores.push({
            owner: sFields.owner || "",
            score: Number(sFields.score) || 0,
            shill_points: Number(sFields.shill_points) || 0,
            alpha_points: Number(sFields.alpha_points) || 0,
            rank: Number(sFields.rank) || 0,
            redeemed: sFields.redeemed || false,
          });
        }

        // Parse asset_points
        const asset_points: AssetPoints[] = [];
        const rawAssetPoints = parseVector(fields.asset_points);
        for (const item of rawAssetPoints) {
          const aFields = item.fields || item;
          asset_points.push({
            symbol: parseString(aFields.symbol),
            points: Number(aFields.points) || 0,
          });
        }

        // Fix week_index
        let final_week_index = Number(fields.week_index) || 0;
        const final_start_ts_ms = Number(fields.start_ts_ms) || 0;
        
        if (final_week_index > 10000) {
          final_week_index = final_start_ts_ms;
        }

        return {
          week_index: final_week_index,
          start_ts_ms: final_start_ts_ms,
          lock_ts_ms: Number(fields.lock_ts_ms) || 0,
          end_ts_ms: Number(fields.end_ts_ms) || 0,
          active: fields.active || false,
          locked: fields.locked || false,
          participants,
          user_scores,
          asset_points,
        };
      } catch (error) {
        console.error("Error fetching competition state from blockchain:", error);
        return null;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Helper function to get display week number
export function getDisplayWeekNumber(weekIndex: number, startTsMs: number): number {
  // If week_index is a timestamp (large number > 10000), it's likely incorrectly set
  // Use start_ts_ms to calculate a sequential week number
  if (weekIndex > 10000) {
    // Use start_ts_ms as the basis for week calculation
    // Calculate weeks since a reference date (e.g., Jan 1, 2024 00:00:00 UTC)
    const referenceDate = new Date('2024-01-01T00:00:00Z').getTime();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceReference = Math.floor((startTsMs - referenceDate) / msPerWeek);
    return Math.max(1, weeksSinceReference + 1); // Start from week 1, ensure positive
  }
  // If it's a reasonable week number, use it as-is
  return weekIndex;
}

