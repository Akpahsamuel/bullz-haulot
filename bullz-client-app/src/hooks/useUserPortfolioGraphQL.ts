// import { useQuery } from "@tanstack/react-query";
// import { useCurrentAccount } from "@mysten/dapp-kit";
// import { useNetworkVariable } from "@/networkConfig";
// import { ASSET_METADATA } from "@/lib/vaults";
// import { useVaultsGraphQL } from "./useVaultsGraphQL";
// import { getGraphQLClient } from '@/lib/graphql-client';

// export interface UserAsset {
//   symbol: string;
//   vaultId: string;
//   balance: string;
//   balanceRaw: number;
//   balanceFormatted: string;
//   price: string;
//   valueUsd: string;
//   valueUsdRaw: number;
//   change24h: number;
//   imageUrl?: string;
// }

// // GraphQL query to get object data with content
// const GET_OBJECT_QUERY = `
//   query GetObject($id: SuiAddress!) {
//     object(address: $id) {
//       address
//       version
//       digest
//       contents {
//         json
//       }
//     }
//   }
// `;

// // Removed unused GET_DYNAMIC_FIELDS_QUERY - using direct dynamic field access instead

// function formatBalance(balance: number): string {
//   if (balance >= 1000000000000) {
//     return (balance / 1000000000000).toFixed(2) + 'T';
//   } else if (balance >= 1000000000) {
//     return (balance / 1000000000).toFixed(2) + 'B';
//   } else if (balance >= 1000000) {
//     return (balance / 1000000).toFixed(2) + 'M';
//   } else if (balance >= 1000) {
//     return (balance / 1000).toFixed(2) + 'k';
//   } else if (balance >= 1) {
//     return balance.toFixed(0);
//   } else if (balance >= 0.01) {
//     return balance.toFixed(4);
//   } else {
//     return balance.toFixed(6);
//   }
// }

// function formatUsdValue(value: number): string {
//   if (value >= 1000000000) {
//     return '$' + (value / 1000000000).toFixed(1) + 'B';
//   } else if (value >= 1000000) {
//     return '$' + (value / 1000000).toFixed(1) + 'M';
//   } else if (value >= 1000) {
//     return '$' + (value / 1000).toFixed(1) + 'k';
//   } else if (value >= 1) {
//     return '$' + value.toFixed(2);
//   } else if (value >= 0.01) {
//     return '$' + value.toFixed(4);
//   } else {
//     return '$0.00';
//   }
// }

// export function useUserPortfolioGraphQL() {
//   const client = getGraphQLClient();
//   const currentAccount = useCurrentAccount();
//   const userRegistryId = useNetworkVariable("userRegistryId");
//   const { data: vaults, isLoading: vaultsLoading } = useVaultsGraphQL();

//   return useQuery({
//     queryKey: ['user-portfolio-graphql', currentAccount?.address, vaults?.length],
//     queryFn: async (): Promise<UserAsset[]> => {
//       if (!currentAccount?.address || !userRegistryId || !vaults || vaults.length === 0) {
//         return [];
//       }

//       try {
//         // Get the user registry object
//         const registryResponse = await client.request(GET_OBJECT_QUERY, {
//           id: userRegistryId,
//         });

//         if (!registryResponse.object?.contents?.json) {
//           console.error('Invalid user registry object');
//           return [];
//         }

//         const registryFields = registryResponse.object.contents.json;
//         const usersTableId = registryFields.users?.id?.id;

//         if (!usersTableId) {
//           console.error('Users table not found in registry');
//           return [];
//         }

//         // Get user data directly from users table (updated contract structure)
//         const userDataResponse = await client.request(`
//           query GetUserData($parentId: SuiAddress!, $userAddress: String!) {
//             object(address: $parentId) {
//               dynamicField(name: { type: "address", value: $userAddress }) {
//                 value {
//                   ... on MoveValue {
//                     json
//                   }
//                 }
//               }
//             }
//           }
//         `, {
//           parentId: usersTableId,
//           userAddress: currentAccount.address,
//         });

//         const userData = userDataResponse.object?.dynamicField?.value?.json;
//         if (!userData) {
//           return [];
//         }

//         // Extract owned assets from UserData structure
//         const ownedAssets = userData.owned_assets || [];

//         if (ownedAssets.length === 0) {
//           return [];
//         }

//         // Create a map of vaults by symbol for quick lookup
//         const vaultMap = new Map(vaults.map(vault => [vault.symbol, vault]));

//         // Process each owned asset
//         const assetPromises = ownedAssets.map(async (symbol: string) => {
//           const vault = vaultMap.get(symbol);
//           if (!vault) {
//             console.warn(`Vault not found for symbol: ${symbol}`);
//             return null;
//           }

//           try {
//             // Get vault object to find user balances table
//             const vaultResponse = await client.request(GET_OBJECT_QUERY, {
//               id: vault.vaultId,
//             });

//             if (!vaultResponse.object?.contents?.json) {
//               console.error(`Invalid vault object for ${symbol}`);
//               return null;
//             }

//             const vaultFields = vaultResponse.object.contents.json;
            
//             // Get user balance directly from user_balances table (updated contract structure)
//             const balanceResponse = await client.request(`
//               query GetUserBalance($vaultId: SuiAddress!, $userAddress: String!) {
//                 object(address: $vaultId) {
//                   dynamicField(name: { type: "address", value: $userAddress }) {
//                     value {
//                       ... on MoveValue {
//                         json
//                       }
//                     }
//                   }
//                 }
//               }
//             `, {
//               vaultId: vault.vaultId,
//               userAddress: currentAccount.address,
//             });

//             // Extract balance from user_balances table
//             let balance = '0';
//             const userBalanceData = balanceResponse.object?.dynamicField?.value?.json;
//             if (userBalanceData) {
//               balance = userBalanceData.toString();
//             }

//             if (parseFloat(balance) > 0) {
//               const balanceRaw = parseFloat(balance);

//               // Calculate price and USD value
//               let price = '0';
//               let valueUsd = '0';
//               let usdValue = 0;

//               try {
//                 // Use current_price from contract if available
//                 const currentPrice = vaultFields.current_price;
//                 if (currentPrice && currentPrice !== '0') {
//                   const priceValue = parseFloat(currentPrice) / 1000000000; // Convert from 9 decimal precision
//                   price = priceValue.toFixed(8);
//                   usdValue = balanceRaw * priceValue;
//                   valueUsd = formatUsdValue(usdValue);
//                 } else {
//                   // Fallback: Calculate from reserves
//                   const usdcReserve = parseFloat(vaultFields.usdc_reserve || '0');
//                   const tradingSupply = parseFloat(vaultFields.trading_supply || '1');

//                   const actualPrice = (usdcReserve * 1000000000) / tradingSupply / 1000000000;
//                   price = actualPrice.toFixed(8);
//                   usdValue = balanceRaw * actualPrice;
//                   valueUsd = formatUsdValue(usdValue);
//                 }
//               } catch (vaultError) {
//                 console.error(`Error calculating price for ${symbol}:`, vaultError);
//                 // Fallback to mock price if calculation fails
//                 price = '0.0001';
//                 usdValue = balanceRaw * 0.0001;
//                 valueUsd = formatUsdValue(usdValue);
//               }

//               const balanceFormatted = formatBalance(balanceRaw);
//               const vaultMetadata = ASSET_METADATA[symbol];
//               const imageUrl = vaultMetadata?.imageUrl || undefined;

//               return {
//                 symbol,
//                 vaultId: vault.vaultId,
//                 balance,
//                 balanceRaw,
//                 balanceFormatted,
//                 price,
//                 valueUsd,
//                 valueUsdRaw: usdValue,
//                 change24h: Math.random() * 0.2 - 0.1, // Mock 24h change
//                 imageUrl,
//               };
//             }

//             return null;
//           } catch (error) {
//             console.error(`Error processing ${symbol}:`, error);
//             return null;
//           }
//         });

//         const assetResults = await Promise.all(assetPromises);
//         const assets = assetResults.filter(asset => asset !== null);

//         return assets;

//       } catch (error) {
//         console.error('Error fetching user portfolio with GraphQL:', error);
//         return [];
//       }
//     },
//     enabled: !!currentAccount?.address && !!userRegistryId && !vaultsLoading && !!vaults,
//     staleTime: 30000,
//     refetchInterval: 60000,
//   });
// }

// export function usePortfolioTotalValueGraphQL() {
//   const { data: portfolio } = useUserPortfolioGraphQL();

//   const totalValue = portfolio?.reduce((sum, asset) => {
//     return sum + asset.valueUsdRaw;
//   }, 0) || 0;

//   return {
//     totalValue: formatUsdValue(totalValue),
//     totalValueRaw: totalValue,
//     assetCount: portfolio?.length || 0,
//   };
// }
