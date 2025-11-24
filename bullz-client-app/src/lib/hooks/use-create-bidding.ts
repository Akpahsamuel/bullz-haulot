//@ts-nocheck
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../networkConfig";

// Types for bid data based on contract structure
export interface UserBid {
  id: string;
  creator: string;
  squadId: number;
  bidAmount: number;
  duration: number;
  createdAt: number;
  status: "Open" | "Matched" | "Cancelled";
  escrowBalance: number;
  feeBalance: number;
}

// Types for match data
export interface UserMatch {
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
  status: "Active" | "Completed" | "Tied" | "Disputed";
  winner?: string;
  prizeClaimed: boolean;
}

// Hook for creating a new bid
export const useCreateBid = () => {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const escrowRegistryId = useNetworkVariable("escrowRegistryId");
  const squadRegistryId = useNetworkVariable("squadRegistryId");
  const activeSquadRegistryId = useNetworkVariable("activeSquadRegistryId");
  const feeConfigId = useNetworkVariable("feeConfigId");
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-bid"],
    mutationFn: async ({
      squadId,
      bidAmount,
      duration,
    }: {
      squadId: number;
      bidAmount: number; // in MIST
      duration: number; // in milliseconds
    }) => {
      if (!currentAccount?.address) {
        throw new Error("Wallet not connected");
      }

      const tx = new Transaction();

      // Calculate the total payment needed (bid amount + fee)
      const feeResult = await suiClient.devInspectTransactionBlock({
        transactionBlock: (() => {
          const inspectTx = new Transaction();
          inspectTx.moveCall({
            package: packageId,
            module: "fee_calculator",
            function: "calculate_upfront_fee",
            arguments: [
              inspectTx.pure.u64(bidAmount),
              inspectTx.object(feeConfigId),
            ],
          });
          return inspectTx;
        })(),
        sender: currentAccount.address,
      });

      // Parse fee from result or use fallback based on 5% default fee
      let feeAmount = Math.floor(bidAmount * 0.05); // 5% fallback fee
      let totalPayment = bidAmount + feeAmount;

      // Try to parse the actual fee from inspection result
      if (feeResult.results && feeResult.results[0] && feeResult.results[0].returnValues) {
        try {
          const returnValue = feeResult.results[0].returnValues[0];
          if (returnValue && returnValue[1]) {
            const feeBytes = returnValue[1] as unknown as number[];
            // Parse u64 from bytes (little endian)
            if (Array.isArray(feeBytes) && feeBytes.length >= 8) {
              let fee = 0;
              for (let i = 0; i < 8; i++) {
                fee += (feeBytes[i] as number) * Math.pow(256, i);
              }
              feeAmount = fee;
              totalPayment = bidAmount + feeAmount;
            }
          }
        } catch (parseError) {
          // Could not parse fee from contract, using fallback
        }
      }

      // Split coins for total payment (bid + fee)
      const [payment] = tx.splitCoins(tx.gas, [totalPayment]);

      // Call create_bid function
      tx.moveCall({
        package: packageId,
        module: "match_escrow",
        function: "create_bid",
        arguments: [
          tx.object(escrowRegistryId),
          tx.object(squadRegistryId),
          tx.object(activeSquadRegistryId),
          tx.object(feeConfigId),
          tx.pure.u64(squadId),
          tx.pure.u64(bidAmount),
          tx.pure.u64(duration),
          payment,
          tx.object("0x6"), // Clock object
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              queryClient.invalidateQueries({ queryKey: ["user-bids"] });
              queryClient.invalidateQueries({ queryKey: ["active-bids"] });
              resolve({
                result,
                squadId,
                bidAmount,
                duration,
              });
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
  });
};

// Hook for cancelling a bid
export const useCancelBid = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const escrowRegistryId = useNetworkVariable("escrowRegistryId");
  const activeSquadRegistryId = useNetworkVariable("activeSquadRegistryId");
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cancel-bid"],
    mutationFn: async ({ bidId }: { bidId: string }) => {
      if (!currentAccount?.address) {
        throw new Error("Wallet not connected");
      }

      const tx = new Transaction();

      // Call cancel_bid function
      tx.moveCall({
        package: packageId,
        module: "match_escrow",
        function: "cancel_bid",
        arguments: [
          tx.object(escrowRegistryId),
          tx.object(activeSquadRegistryId),
          tx.pure.id(bidId),
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              queryClient.invalidateQueries({ queryKey: ["user-bids"] });
              queryClient.invalidateQueries({ queryKey: ["active-bids"] });
              resolve({
                result,
                bidId,
              });
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
  });
};

// Hook for fetching user's active bids
export const useGetUserBids = () => {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");

  return useQuery({
    queryKey: ["user-bids", currentAccount?.address],
    queryFn: async (): Promise<UserBid[]> => {
      if (!currentAccount?.address) {
        return [];
      }

      try {
        // Query BidCreated events for this user
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::match_escrow::BidCreated`,
          },
          limit: 50,
          order: "descending",
        });

        const userBids: UserBid[] = [];

        for (const event of events.data) {
          if (event.parsedJson) {
            const bidData = event.parsedJson as any;
            
            // Filter bids created by current user
            if (bidData.creator === currentAccount.address) {
              userBids.push({
                id: bidData.bid_id,
                creator: bidData.creator,
                squadId: parseInt(bidData.squad_id),
                bidAmount: parseInt(bidData.bid_amount),
                duration: parseInt(bidData.duration),
                createdAt: Date.now(), // Would need to get from event timestamp
                status: "Open", // Would need to check current status from contract
                escrowBalance: parseInt(bidData.bid_amount),
                feeBalance: 0, // Would need to get from contract
              });
            }
          }
        }

        return userBids;

      } catch (error) {
        return [];
      }
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Hook for fetching user's matches
export const useGetUserMatches = () => {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");

  return useQuery({
    queryKey: ["user-matches", currentAccount?.address],
    queryFn: async (): Promise<UserMatch[]> => {
      if (!currentAccount?.address) {
        return [];
      }

      try {
        // Query BidsMatched events for this user
        const matchEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::match_escrow::BidsMatched`,
          },
          limit: 50,
          order: "descending",
        });

        // Query MatchCompleted events to get winner information
        const completedEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::match_escrow::MatchCompleted`,
          },
          limit: 50,
          order: "descending",
        });

        // Query MatchTied events to get tie information
        const tiedEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::match_escrow::MatchTied`,
          },
          limit: 50,
          order: "descending",
        });

        // Create maps for quick lookup of completed/tied matches
        const completedMatches = new Map<string, any>();
        const tiedMatches = new Map<string, any>();

        // Process completed matches
        for (const event of completedEvents.data) {
          if (event.parsedJson) {
            const completedData = event.parsedJson as any;
            completedMatches.set(completedData.match_id, completedData);
          }
        }

        // Process tied matches
        for (const event of tiedEvents.data) {
          if (event.parsedJson) {
            const tiedData = event.parsedJson as any;
            tiedMatches.set(tiedData.match_id, tiedData);
          }
        }

        const userMatches: UserMatch[] = [];

        for (const event of matchEvents.data) {
          if (event.parsedJson) {
            const matchData = event.parsedJson as any;
            
            // Filter matches where current user is player1 or player2
            if (matchData.player1 === currentAccount.address || matchData.player2 === currentAccount.address) {
              const matchId = matchData.match_id;
              
              // Determine status and winner based on completion events
              let status: "Active" | "Completed" | "Tied" | "Disputed" = "Active";
              let winner: string | undefined = undefined;
              let prizeClaimed = false;

              if (completedMatches.has(matchId)) {
                status = "Completed";
                winner = completedMatches.get(matchId).winner;
                prizeClaimed = true; // Assuming if MatchCompleted event exists, prize was claimed
              } else if (tiedMatches.has(matchId)) {
                status = "Tied";
                prizeClaimed = true; // Assuming if MatchTied event exists, prizes were distributed
              } else {
                // Check if match has expired but no completion event yet
                const endsAt = parseInt(matchData.ends_at);
                const now = Date.now();
                if (now >= endsAt) {
                  // Match has expired but no completion event - still Active but expired
                  status = "Active";
                }
              }

              userMatches.push({
                id: matchId,
                bid1Id: matchData.bid1_id,
                bid2Id: matchData.bid2_id,
                player1: matchData.player1,
                player2: matchData.player2,
                squad1Id: parseInt(matchData.squad1_id),
                squad2Id: parseInt(matchData.squad2_id),
                totalPrize: parseInt(matchData.total_prize),
                totalFees: 0, // Would need to get from contract
                duration: parseInt(matchData.duration),
                startedAt: Date.now(), // Would need to get from event timestamp
                endsAt: parseInt(matchData.ends_at),
                status,
                winner,
                prizeClaimed,
              });
            }
          }
        }

        return userMatches;

      } catch (error) {
        return [];
      }
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Hook for fetching all active bids (for viewing)
export const useGetActiveBids = () => {
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("packageId");

  return useQuery({
    queryKey: ["active-bids"],
    queryFn: async (): Promise<UserBid[]> => {
      try {
        // Query BidCreated events
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::match_escrow::BidCreated`,
          },
          limit: 100,
          order: "descending",
        });

        const activeBids: UserBid[] = [];

        for (const event of events.data) {
          if (event.parsedJson) {
            const bidData = event.parsedJson as any;
            
            // Check if bid is still active (not cancelled or matched)
            // In a real implementation, you would query the contract to check current status
            activeBids.push({
              id: bidData.bid_id,
              creator: bidData.creator,
              squadId: parseInt(bidData.squad_id),
              bidAmount: parseInt(bidData.bid_amount),
              duration: parseInt(bidData.duration),
              createdAt: Date.now(), // Would need to get from event timestamp
              status: "Open", // Would need to check current status from contract
              escrowBalance: parseInt(bidData.bid_amount),
              feeBalance: 0, // Would need to get from contract
            });
          }
        }

        return activeBids;

      } catch (error) {
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}; 