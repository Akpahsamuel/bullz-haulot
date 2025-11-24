import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useNetworkVariable } from '@/networkConfig';
import {
  type VaultData,
  getVaultsTableId,
  fetchVaultData,
  getVaultInfoFields,
  buildVaultInfo,
  calculateVaultPrice,
  getBalancesTableId,
  getUserBalanceFromTable,
  getVaultFields,
} from './utils/vaultFetchers';

export function useVaults() {
  const client = useSuiClient();
  const assetRegistryId = useNetworkVariable('assetRegistryId');

  return useQuery({
    queryKey: ['vaults-json-rpc', assetRegistryId],
    queryFn: async () => {
      try {
        const vaultsTableId = await getVaultsTableId(client, assetRegistryId);
        const dynamicFields = await client.getDynamicFields({
          parentId: vaultsTableId,
        });

        const vaultsData = await Promise.all(
          dynamicFields.data.map((field) => fetchVaultData(client, field))
        );

        return vaultsData.filter((v): v is VaultData => v !== null);
      } catch (error) {
        console.error('Error fetching vaults with JSON-RPC:', error);
        throw error;
      }
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}


export function useVaultInfo(vaultId: string) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['vault-info-json-rpc', vaultId],
    queryFn: async () => {
      try {
        const fields = await getVaultInfoFields(client, vaultId);
        return buildVaultInfo(vaultId, fields);
      } catch (error) {
        console.error('Error fetching vault info with JSON-RPC:', error);
        throw error;
      }
    },
    enabled: !!vaultId,
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

export function useVaultPrice(vaultId: string) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['vault-price-json-rpc', vaultId],
    queryFn: async () => {
      try {
        const fields = await getVaultFields(client, vaultId, true);
        return calculateVaultPrice(fields);
      } catch (error) {
        console.error('Error fetching vault price with JSON-RPC:', error);
        return '0';
      }
    },
    enabled: !!vaultId,
    staleTime: 5000,
    refetchInterval: 5000,
  });
}


export function useUserVaultBalance(vaultId: string) {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();

  return useQuery({
    queryKey: ['user-vault-balance-json-rpc', vaultId, currentAccount?.address],
    queryFn: async () => {
      if (!currentAccount?.address) {
        return '0';
      }

      try {
        const balancesTableId = await getBalancesTableId(client, vaultId);
        if (!balancesTableId) {
          return '0';
        }

        return getUserBalanceFromTable(client, { balancesTableId, userAddress: currentAccount.address });
      } catch (error) {
        console.error('Error fetching user vault balance with JSON-RPC:', error);
        return '0';
      }
    },
    enabled: !!vaultId && !!currentAccount?.address,
    staleTime: 10000,
    refetchInterval: 10000,
  });
}
