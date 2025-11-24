import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../networkConfig";
import { useAppStore } from "../store/app-store";


export interface SquadData {
  squad_id: string;
  owner: string;
  name: string;
  players: string[];
  formation: string;
  life: number;
  death_time?: number;
  locked: boolean;
  created_timestamp_ms?: number;
}


export const useCreateCompleteSquad = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const squadRegistryId = useNetworkVariable("squadRegistryId");
  const userRegistryId = useNetworkVariable("userRegistryId");
  const assetRegistryId = useNetworkVariable("assetRegistryId");
  const treasuryId = useNetworkVariable("treasuryId");
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-complete-squad"],
    mutationFn: async ({
      squadName,
      bassetSymbols,
      formation,
      bassetQuantities,
    }: {
      squadName: string;
      bassetSymbols: string[];
      formation: string;
      bassetQuantities: number[];
    }) => {
      if (!currentAccount?.address) {
        throw new Error("Wallet not connected");
      }

      if (bassetSymbols.length !== 7) {
        throw new Error(`Squad must have exactly 7 assets, but got ${bassetSymbols.length}`);
      }

      if (bassetSymbols.length !== bassetQuantities.length) {
        throw new Error("Asset symbols and quantities must have the same length");
      }

      for (let i = 0; i < bassetQuantities.length; i++) {
        if (bassetQuantities[i] < 1) {
          throw new Error(`Asset quantity at index ${i} must be at least 1, but got ${bassetQuantities[i]}`);
        }
      }

      try {
        const tx = new Transaction();
        
        const creationFeeInMist = 1_000_000_000; 
        const [payment] = tx.splitCoins(tx.gas, [creationFeeInMist]);

        tx.moveCall({
          package: packageId,
          module: "squad_management",
          function: "create_squad",
          arguments: [
            tx.object(squadRegistryId),
            tx.object(userRegistryId),
            tx.object(assetRegistryId),
            tx.pure.string(squadName),
            tx.pure.vector("string", bassetSymbols),
            tx.pure.string(formation),
            tx.pure.vector("u64", bassetQuantities),
            payment,
            tx.object(treasuryId), 
            tx.object("0x6"), 
          ],
        });


        return new Promise((resolve, reject) => {
          signAndExecute(
            { transaction: tx },
            {
              onSuccess: (result) => {
                queryClient.invalidateQueries({ queryKey: ["user-squads"] });
                queryClient.invalidateQueries({ queryKey: ["user-portfolio"] });
                resolve({
                  result,
                  squadName,
                  bassetSymbols,
                  formation,
                  bassetQuantities,
                });
              },
              onError: (error) => {
                reject(error);
              },
            }
          );
        });

      } catch (error) {
        throw error;
      }
    },
  });
};


export const useUpdateSquad = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const squadRegistryId = useNetworkVariable("squadRegistryId");
  const userRegistryId = useNetworkVariable("userRegistryId");
  const assetRegistryId = useNetworkVariable("assetRegistryId");
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-squad"],
    mutationFn: async ({
      squadId,
      newName,
      newPlayers,
      newFormation,
    }: {
      squadId: string;
      newName?: string;
      newPlayers?: string[];
      newFormation?: string;
    }) => {
      if (!currentAccount?.address) {
        throw new Error("Wallet not connected");
      }

      if (!newName && !newPlayers && !newFormation) {
        throw new Error("At least one field must be updated");
      }

      if (newPlayers && newPlayers.length !== 7) {
        throw new Error("Squad must have exactly 7 players");
      }

      try {
        const tx = new Transaction();

        tx.moveCall({
          package: packageId,
          module: "squad_management",
          function: "edit_squad",
          arguments: [
            tx.object(squadRegistryId),
            tx.object(userRegistryId),
            tx.object(assetRegistryId),
            tx.pure.id(squadId),
            newName ? tx.pure.option("string", newName) : tx.pure.option("string", null),
            newPlayers ? tx.pure.option("vector<string>", newPlayers) : tx.pure.option("vector<string>", null),
            newFormation ? tx.pure.option("string", newFormation) : tx.pure.option("string", null),
          ],
        });

        return new Promise((resolve, reject) => {
          signAndExecute(
            { transaction: tx },
            {
              onSuccess: (result) => {
                queryClient.invalidateQueries({ queryKey: ["user-squads"] });
                resolve({
                  result,
                  squadId,
                  newName,
                  newPlayers,
                  newFormation,
                });
              },
              onError: (error) => {
                reject(error);
              },
            }
          );
        });

      } catch (error) {
        throw error;
      }
    },
  });
};


export const useDeleteSquad = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const squadRegistryId = useNetworkVariable("squadRegistryId");
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-squad"],
    mutationFn: async ({ squadId }: { squadId: string }) => {
      if (!currentAccount?.address) {
        throw new Error("Wallet not connected");
      }

      const tx = new Transaction();

      tx.moveCall({
        package: packageId,
        module: "squad_management",
        function: "delete_squad",
        arguments: [
          tx.object(squadRegistryId),
          tx.pure.id(squadId),
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              queryClient.invalidateQueries({ queryKey: ["user-squads"] });
              resolve({
                result,
                squadId,
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


export const useGetUserSquads = () => {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { address: zkLoginAddress } = useAppStore();
  const squadRegistryId = useNetworkVariable("squadRegistryId");
  
  const userAddress = currentAccount?.address || zkLoginAddress;

  return useQuery({
    queryKey: ["user-squads", userAddress],
    queryFn: async (): Promise<SquadData[]> => {
      if (!userAddress) {
        return [];
      }

      try {
       
        const registryObject = await suiClient.getObject({
          id: squadRegistryId,
          options: { showContent: true },
        });

        if (!registryObject.data?.content || registryObject.data.content.dataType !== 'moveObject') {
          return [];
        }

        const registryFields = registryObject.data.content.fields as any;
 
        const userSquadsTableId = registryFields.user_squads?.fields?.id?.id;
        if (!userSquadsTableId) {
          return [];
        }

        const dynamicFields = await suiClient.getDynamicFields({
          parentId: userSquadsTableId,
        });

        const userField = dynamicFields.data.find(field => field.name.value === userAddress);
        
        if (!userField) {
          return [];
        }

        const userSquadIdsObject = await suiClient.getObject({
          id: userField.objectId,
          options: { showContent: true },
        });

        if (!userSquadIdsObject.data?.content || userSquadIdsObject.data.content.dataType !== 'moveObject') {
          return [];
        }

        const userSquadIdsFields = userSquadIdsObject.data.content.fields as any;
        const squadIds = userSquadIdsFields.value || [];

        if (squadIds.length === 0) {
          return [];
        }

        
        const squadsTableId = registryFields.squads?.fields?.id?.id;
        if (!squadsTableId) {
          return [];
        }

        const squadDynamicFields = await suiClient.getDynamicFields({
          parentId: squadsTableId,
        });

        const userSquads: SquadData[] = [];

        for (const squadId of squadIds) {
          const squadField = squadDynamicFields.data.find(field => field.name.value === squadId);
          
          if (squadField) {
            try {
              const squadObject = await suiClient.getObject({
                id: squadField.objectId,
                options: { showContent: true },
              });

              if (squadObject.data?.content && squadObject.data.content.dataType === 'moveObject') {
                const squadFields = squadObject.data.content.fields as any;
                
                const actualSquadData = squadFields.value?.fields;
                
                if (actualSquadData) {
                  const squadData: SquadData = {
                    squad_id: String(squadId),
                    owner: actualSquadData.owner || userAddress,
                    name: actualSquadData.name || `Squad ${squadId}`,
                    players: actualSquadData.basset_symbols || [],
                    formation: actualSquadData.formation || "OneThreeTwoOne",
                    life: parseInt(actualSquadData.life?.toString() || "5"),
                    death_time: actualSquadData.death_time ? parseInt(actualSquadData.death_time.toString()) : undefined,
                    locked: actualSquadData.locked || false,
                    created_timestamp_ms: actualSquadData.created_timestamp_ms ? parseInt(actualSquadData.created_timestamp_ms.toString()) : undefined,
                  };

                  userSquads.push(squadData);
                }
              }
            } catch (error) {
              continue;
            }
          }
        }

        return userSquads;

      } catch (error) {
        return [];
      }
    },
    enabled: !!userAddress,
    refetchInterval: 30000,
  });
};



export const useGetSquadNamesByIds = (squadIds: number[]) => {
  const suiClient = useSuiClient();
  const squadRegistryId = useNetworkVariable("squadRegistryId");

  return useQuery({
    queryKey: ["squad-names", squadIds.sort().join(",")],
    queryFn: async (): Promise<Record<number, string>> => {
      if (squadIds.length === 0) {
        return {};
      }

      try {
        const registryObject = await suiClient.getObject({
          id: squadRegistryId,
          options: { showContent: true },
        });

        if (!registryObject.data?.content || !('fields' in registryObject.data.content)) {
          return {};
        }

        const registryFields = registryObject.data.content.fields as any;
        const squadsTableId = registryFields.squads?.fields?.id?.id;

        if (!squadsTableId) {
          return {};
        }

        const squadNames: Record<number, string> = {};

        for (const squadId of squadIds) {
          try {
            const squadObject = await suiClient.getDynamicFieldObject({
              parentId: squadsTableId,
              name: {
                type: "u64",
                value: squadId.toString(),
              },
            });

            if (squadObject.data?.content && 'fields' in squadObject.data.content) {
              const squadFields = (squadObject.data.content.fields as any).value?.fields;
              
              if (squadFields) {
                squadNames[squadId] = squadFields.name || `Squad ${squadId}`;
              }
            }
          } catch (error) {
            squadNames[squadId] = `Squad ${squadId}`; 
          }
        }

        return squadNames;

      } catch (error) {
        return {};
      }
    },
    enabled: squadIds.length > 0,
    refetchInterval: 60000, 
  });
};

export const useGetSquadNamesByObjectIds = (squadObjectIds: string[]) => {
  const suiClient = useSuiClient();
  const squadRegistryId = useNetworkVariable("squadRegistryId");

  return useQuery({
    queryKey: ["squad-names-by-object-ids", squadObjectIds.sort().join(",")],
    queryFn: async (): Promise<Record<string, string>> => {
      if (squadObjectIds.length === 0 || !squadRegistryId) {
        return {};
      }

      const squadNames: Record<string, string> = {};

      try {
        const registryObject = await suiClient.getObject({
          id: squadRegistryId,
          options: { showContent: true },
        });

        if (!registryObject.data?.content || !('fields' in registryObject.data.content)) {
          return {};
        }

        const registryFields = registryObject.data.content.fields as any;
        const squadsTableId = registryFields.squads?.fields?.id?.id;

        if (!squadsTableId) {
          return {};
        }

      
        const squadDynamicFields = await suiClient.getDynamicFields({
          parentId: squadsTableId,
        });

        const squadIdToFieldMap = new Map<string, string>();
        for (const field of squadDynamicFields.data) {
          const squadId = field.name.value as string;
          if (squadId && typeof squadId === 'string') {
            squadIdToFieldMap.set(squadId, field.objectId);
          }
        }

        await Promise.all(
          squadObjectIds.map(async (objectId) => {
            if (!objectId || !objectId.startsWith("0x")) {
              return;
            }

          
            try {
              const directSquadObject = await suiClient.getObject({
                id: objectId,
                options: { showContent: true },
              });

              if (directSquadObject.data?.content && directSquadObject.data.content.dataType === 'moveObject') {
                const squadFields = directSquadObject.data.content.fields as any;
                
                if (squadFields?.name) {
                  squadNames[objectId] = squadFields.name;
                  return;
                }
              }
            } catch (directError) {
             
            }

          
            const fieldObjectId = squadIdToFieldMap.get(objectId);
            if (fieldObjectId) {
              try {
                const squadObject = await suiClient.getObject({
                  id: fieldObjectId,
                  options: { showContent: true },
                });

                if (squadObject.data?.content && squadObject.data.content.dataType === 'moveObject') {
                  const squadFields = squadObject.data.content.fields as any;
                  
                  
                  const actualSquadData = squadFields.value?.fields || squadFields;
                  
                  if (actualSquadData?.name) {
                    squadNames[objectId] = actualSquadData.name;
                    return;
                  }
                }
              } catch (tableError) {
               
              }
            }

           
            squadNames[objectId] = `Squad ${objectId.slice(0, 8)}...`;
          })
        );
      } catch (error) {
       
      }

      return squadNames;
    },
    enabled: squadObjectIds.length > 0 && !!squadRegistryId,
    refetchInterval: 60000, 
  });
}; 