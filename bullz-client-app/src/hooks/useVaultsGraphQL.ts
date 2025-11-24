// import { useQuery } from '@tanstack/react-query';
// import { useCurrentAccount } from '@mysten/dapp-kit';
// import { useNetworkVariable } from '@/networkConfig';
// import { getGraphQLClient } from '@/lib/graphql-client';

// interface VaultData {
//   symbol: string;
//   vaultId: string;
//   circulatingSupply: string;
//   supplyCap: string;
//   tradingEnabled: boolean;
//   decimals: number;
//   // Additional fields from contract
//   tradingSupply: string;
//   treasuryReserve: string;
//   mintingEnabled: boolean;
//   currentPrice: string;
//   usdcReserve: string;
//   totalVolumeUsdc: string;
//   totalTrades: string;
// }

// interface VaultInfo {
//   vaultId: string;
//   symbol: string;
//   name: string;
//   description: string;
//   imageUrl: string;
//   circulatingSupply: string;
//   supplyCap: string;
//   tradingEnabled: boolean;
//   usdcReserve: string;
//   category: string;
//   decimals: number;
//   // Additional fields from contract
//   tradingSupply: string;
//   treasuryReserve: string;
//   mintingEnabled: boolean;
//   currentPrice: string;
//   totalVolumeUsdc: string;
//   totalTrades: string;
//   accumulatedPrizeFees: string;
//   accumulatedTeamFees: string;
// }

// // GraphQL query to get object data with content
// const GET_OBJECT_QUERY = `
//   query GetObject($id: SuiAddress!) {
//     object(address: $id) {
//       address
//       version
//       digest
//       bcs {
//         dataType
//         bcsBytes
//       }
//       contents {
//         json
//         bcs {
//           dataType
//           bcsBytes
//         }
//       }
//       owner {
//         ... on AddressOwner {
//           owner {
//             address
//           }
//         }
//       }
//     }
//   }
// `;

// // GraphQL query to get dynamic fields
// const GET_DYNAMIC_FIELDS_QUERY = `
//   query GetDynamicFields($parentId: SuiAddress!) {
//     object(address: $parentId) {
//       dynamicFields {
//         nodes {
//           name {
//             json
//           }
//           objectId
//           value {
//             ... on MoveValue {
//               json
//             }
//           }
//         }
//       }
//     }
//   }
// `;

// // GraphQL query to get dynamic field object
// const GET_DYNAMIC_FIELD_OBJECT_QUERY = `
//   query GetDynamicFieldObject($parentId: SuiAddress!, $name: DynamicFieldName!) {
//     object(address: $parentId) {
//       dynamicField(name: $name) {
//         value {
//           ... on MoveValue {
//             json
//           }
//         }
//       }
//     }
//   }
// `;

// export function useVaultsGraphQL() {
//   const assetRegistryId = useNetworkVariable('assetRegistryId');
//   const client = getGraphQLClient();

//   return useQuery({
//     queryKey: ['vaults-graphql', assetRegistryId],
//     queryFn: async (): Promise<VaultData[]> => {
//       try {
//         // Get the asset registry object
//         const registryResponse = await client.request(GET_OBJECT_QUERY, {
//           id: assetRegistryId,
//         });

//         if (!registryResponse.object?.contents?.json) {
//           throw new Error('Invalid registry object');
//         }

//         const registryData = registryResponse.object.contents.json;
//         const vaultsTableId = registryData.vaults?.id?.id;

//         if (!vaultsTableId) {
//           throw new Error('Vaults table not found');
//         }

//         // Get dynamic fields from vaults table
//         const dynamicFieldsResponse = await client.request(GET_DYNAMIC_FIELDS_QUERY, {
//           parentId: vaultsTableId,
//         });

//         const dynamicFields = dynamicFieldsResponse.object?.dynamicFields?.nodes || [];

//         // Fetch vault data for each dynamic field
//         const vaultsData = await Promise.all(
//           dynamicFields.map(async (field: any) => {
//             try {
//               const symbol = field.name?.json;
//               const vaultId = field.value?.json;

//               if (!vaultId || !symbol) return null;

//               // Get vault object data
//               const vaultResponse = await client.request(GET_OBJECT_QUERY, {
//                 id: vaultId,
//               });

//               if (!vaultResponse.object?.contents?.json) {
//                 return null;
//               }

//               const vaultFields = vaultResponse.object.contents.json;

//               return {
//                 symbol,
//                 vaultId,
//                 circulatingSupply: vaultFields.circulating_supply || '0',
//                 supplyCap: vaultFields.supply_cap || '0',
//                 tradingEnabled: vaultFields.trading_enabled || false,
//                 decimals: 9, // Fixed decimals for bASSETs
//                 // Additional fields from contract
//                 tradingSupply: vaultFields.trading_supply || '0',
//                 treasuryReserve: vaultFields.treasury_reserve || '0',
//                 mintingEnabled: vaultFields.minting_enabled || false,
//                 currentPrice: vaultFields.current_price || '0',
//                 usdcReserve: vaultFields.usdc_reserve || '0',
//                 totalVolumeUsdc: vaultFields.total_volume_usdc || '0',
//                 totalTrades: vaultFields.total_trades || '0',
//               } as VaultData;
//             } catch (error) {
//               console.error('Error fetching vault data:', error);
//               return null;
//             }
//           })
//         );

//         return vaultsData.filter((v): v is VaultData => v !== null);
//       } catch (error) {
//         console.error('Error fetching vaults with GraphQL:', error);
//         throw error;
//       }
//     },
//     staleTime: 30000,
//     refetchInterval: 30000,
//   });
// }

// export function useVaultInfoGraphQL(vaultId: string) {
//   const client = getGraphQLClient();

//   return useQuery({
//     queryKey: ['vault-info-graphql', vaultId],
//     queryFn: async (): Promise<VaultInfo> => {
//       try {
//         const vaultResponse = await client.request(GET_OBJECT_QUERY, {
//           id: vaultId,
//         });

//         if (!vaultResponse.object?.contents?.json) {
//           throw new Error('Invalid vault object');
//         }

//         const fields = vaultResponse.object.contents.json;

//         return {
//           vaultId: vaultId,
//           symbol: fields.symbol || '',
//           name: fields.name || '',
//           description: fields.description || '',
//           imageUrl: fields.image_url || '',
//           circulatingSupply: fields.circulating_supply || '0',
//           supplyCap: fields.supply_cap || '0',
//           tradingEnabled: fields.trading_enabled || false,
//           usdcReserve: fields.usdc_reserve || '0',
//           category: fields.category || '',
//           decimals: 9, // Fixed decimals for bASSETs
//           // Additional fields from contract
//           tradingSupply: fields.trading_supply || '0',
//           treasuryReserve: fields.treasury_reserve || '0',
//           mintingEnabled: fields.minting_enabled || false,
//           currentPrice: fields.current_price || '0',
//           totalVolumeUsdc: fields.total_volume_usdc || '0',
//           totalTrades: fields.total_trades || '0',
//           accumulatedPrizeFees: fields.accumulated_prize_fees || '0',
//           accumulatedTeamFees: fields.accumulated_team_fees || '0',
//         };
//       } catch (error) {
//         console.error('Error fetching vault info with GraphQL:', error);
//         throw error;
//       }
//     },
//     enabled: !!vaultId,
//     staleTime: 10000,
//     refetchInterval: 10000,
//   });
// }

// export function useVaultPriceGraphQL(vaultId: string) {
//   const client = getGraphQLClient();

//   return useQuery({
//     queryKey: ['vault-price-graphql', vaultId],
//     queryFn: async (): Promise<string> => {
//       try {
//         const vaultResponse = await client.request(GET_OBJECT_QUERY, {
//           id: vaultId,
//         });

//         if (!vaultResponse.object?.contents?.json) {
//           throw new Error('Invalid vault object');
//         }

//         const fields = vaultResponse.object.contents.json;

//         // Use current_price from contract if available, otherwise calculate from reserves
//         const currentPrice = fields.current_price;
//         if (currentPrice && currentPrice !== '0') {
//           return currentPrice;
//         }

//         // Fallback: Calculate price using reserves
//         const usdcReserve = BigInt(fields.usdc_reserve || '0');
//         const tradingSupply = BigInt(fields.trading_supply || '1');

//         if (tradingSupply === BigInt(0)) {
//           return '0';
//         }

//         // Calculate price: USDC reserve / trading supply
//         // Price is stored with 9 decimal precision in contract
//         const price = (usdcReserve * BigInt(1000000000)) / tradingSupply;
//         return price.toString();
//       } catch (error) {
//         console.error('Error fetching vault price with GraphQL:', error);
//         return '0';
//       }
//     },
//     enabled: !!vaultId,
//     staleTime: 5000,
//     refetchInterval: 5000,
//   });
// }

// export function useUserVaultBalanceGraphQL(vaultId: string) {
//   const client = getGraphQLClient();
//   const currentAccount = useCurrentAccount();

//   return useQuery({
//     queryKey: ['user-vault-balance-graphql', vaultId, currentAccount?.address],
//     queryFn: async (): Promise<string> => {
//       if (!currentAccount?.address) {
//         return '0';
//       }

//       try {
//         // First get the vault object to find the balances table
//         const vaultResponse = await client.request(GET_OBJECT_QUERY, {
//           id: vaultId,
//         });

//         if (!vaultResponse.object?.contents?.json) {
//           return '0';
//         }

//         const fields = vaultResponse.object.contents.json;
//         const balancesTableId = fields.user_balances?.id?.id;

//         if (!balancesTableId) {
//           return '0';
//         }

//         // Get the user's balance from the dynamic field
//         const balanceResponse = await client.request(GET_DYNAMIC_FIELD_OBJECT_QUERY, {
//           parentId: balancesTableId,
//           name: {
//             type: 'address',
//             value: currentAccount.address,
//           },
//         });

//         const balanceValue = balanceResponse.object?.dynamicField?.value?.json;
//         return balanceValue || '0';
//       } catch (error) {
//         console.error('Error fetching user vault balance with GraphQL:', error);
//         return '0';
//       }
//     },
//     enabled: !!vaultId && !!currentAccount?.address,
//     staleTime: 10000,
//     refetchInterval: 10000,
//   });
// }
