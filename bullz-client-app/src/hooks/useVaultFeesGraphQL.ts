// import { useQuery } from '@tanstack/react-query';
// import { getGraphQLClient } from '@/lib/graphql-client';

// interface FeeConfig {
//   baseFee: number;
//   dumpThreshold: number;
//   dumpSlope: number;
//   maxDumpFee: number;
//   surgeFee: number;
//   surgeFeeExpiry: number;
//   prizePoolBps: number;
//   teamBps: number;
// }

// interface VaultFeeData extends FeeConfig {
//   effectiveFee: number;
//   feePercentage: string;
// }

// // GraphQL query to get vault object with fee data
// const GET_VAULT_FEES_QUERY = `
//   query GetVaultFees($id: SuiAddress!) {
//     object(address: $id) {
//       address
//       contents {
//         json
//       }
//     }
//   }
// `;

// export function useVaultFeesGraphQL(vaultId: string) {
//   const client = getGraphQLClient();

//   return useQuery({
//     queryKey: ['vault-fees-graphql', vaultId],
//     queryFn: async (): Promise<VaultFeeData> => {
//       try {
//         const vaultResponse = await client.request(GET_VAULT_FEES_QUERY, {
//           id: vaultId,
//         });

//         if (!vaultResponse.object?.contents?.json) {
//           throw new Error('Invalid vault object');
//         }

//         const fields = vaultResponse.object.contents.json;

//         // Updated field names to match contract structure
//         const baseFee = Number(fields.base_fee_bps || 500);
//         const dumpThreshold = Number(fields.dump_threshold_bps || 200);
//         const dumpSlope = Number(fields.dump_slope_bps || 20000);
//         const maxDumpFee = Number(fields.max_dump_fee_bps || 2500);
//         const surgeFee = Number(fields.surge_fee_bps || 0);
//         const surgeFeeExpiry = Number(fields.surge_fee_expiry || 0);
//         const prizePoolBps = Number(fields.prize_pool_bps || 8000);
//         const teamBps = Number(fields.team_bps || 2000);

//         const now = Date.now();
//         const effectiveFee = surgeFeeExpiry > now && surgeFee > baseFee ? surgeFee : baseFee;
//         const feePercentage = (effectiveFee / 100).toFixed(2) + '%';

//         return {
//           baseFee,
//           dumpThreshold,
//           dumpSlope,
//           maxDumpFee,
//           surgeFee,
//           surgeFeeExpiry,
//           prizePoolBps,
//           teamBps,
//           effectiveFee,
//           feePercentage,
//         };
//       } catch (error) {
//         console.error('Error fetching vault fees with GraphQL:', error);

//         // Return default values on error
//         return {
//           baseFee: 500,
//           dumpThreshold: 200,
//           dumpSlope: 20000,
//           maxDumpFee: 2500,
//           surgeFee: 0,
//           surgeFeeExpiry: 0,
//           prizePoolBps: 8000,
//           teamBps: 2000,
//           effectiveFee: 500,
//           feePercentage: '5%',
//         };
//       }
//     },
//     enabled: !!vaultId,
//     staleTime: 30000,
//     refetchInterval: 60000,
//   });
// }

// export function useTradingFeeGraphQL(vaultId: string, amount: string, isSell: boolean = false) {
//   const client = getGraphQLClient();
//   const { data: feeConfig } = useVaultFeesGraphQL(vaultId);

//   return useQuery({
//     queryKey: ['trading-fee-graphql', vaultId, amount, isSell],
//     queryFn: async () => {
//       try {
//         if (!feeConfig || !amount || amount === '0') {
//           return {
//             feeAmount: '0',
//             feePercentage: '0%',
//             totalCost: amount,
//           };
//         }

//         // Get vault data to calculate fee
//         const vaultResponse = await client.request(GET_VAULT_FEES_QUERY, {
//           id: vaultId,
//         });

//         if (!vaultResponse.object?.contents?.json) {
//           throw new Error('Invalid vault object');
//         }

//         const fields = vaultResponse.object.contents.json;
//         // Use trading_supply for fee calculations (actual tradeable amount)
//         const circulatingSupply = BigInt(fields.trading_supply || fields.circulating_supply || '1');
//         const amountBigInt = BigInt(amount);

//         let effectiveFee = feeConfig.effectiveFee;

//         // Calculate anti-dump fee for large sells
//         if (isSell && amountBigInt > 0) {
//           const sellShareBps = Number((amountBigInt * BigInt(10000)) / circulatingSupply);

//           if (sellShareBps > feeConfig.dumpThreshold) {
//             const excessShare = sellShareBps - feeConfig.dumpThreshold;
//             const antiDumpExtra = (excessShare * feeConfig.dumpSlope) / 10000;
//             const antiDumpTotal = feeConfig.baseFee + antiDumpExtra;

//             effectiveFee = Math.min(antiDumpTotal, feeConfig.maxDumpFee);
//           }
//         }

//         const feeAmount = (amountBigInt * BigInt(effectiveFee)) / BigInt(10000);
//         const totalCost = isSell ? (amountBigInt - feeAmount).toString() : (amountBigInt + feeAmount).toString();

//         return {
//           feeAmount: feeAmount.toString(),
//           feePercentage: (effectiveFee / 100).toFixed(2) + '%',
//           totalCost,
//           effectiveFeeBps: effectiveFee,
//         };
//       } catch (error) {
//         console.error('Error calculating trading fee with GraphQL:', error);
//         return {
//           feeAmount: '0',
//           feePercentage: '0%',
//           totalCost: amount,
//           effectiveFeeBps: 0,
//         };
//       }
//     },
//     enabled: !!vaultId && !!amount && !!feeConfig,
//     staleTime: 10000,
//   });
// }

// // Note: useBaseAssetPrice, useQuoteBuy, and useQuoteSell use devInspectTransactionBlock
// // which simulates contract execution. GraphQL doesn't support contract simulation,
// // so these functions remain JSON-RPC only.
