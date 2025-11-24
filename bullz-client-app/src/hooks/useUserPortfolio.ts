import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useNetworkVariable } from '@/networkConfig';
import { useVaults } from './useVaults';
import { getUserRegistryTableId, getUserOwnedAssets } from './utils/portfolioFetchers';
import { processUserAsset, type UserAsset } from './utils/assetBuilders';
import { formatUsdValue } from './utils/formatters';
import { useGetPriceList } from '@/common-api-services/token-price.ts';

export type { UserAsset };

const validatePortfolioParams = ({
  currentAccount,
  userRegistryId,
  vaults
}: {
  currentAccount: any;
  userRegistryId: string | null;
  vaults: any[] | undefined;
}): boolean => {
  const hasAccount = !!currentAccount?.address;
  const hasRegistryId = !!userRegistryId;
  const hasVaults = !!vaults && vaults.length > 0;
  
  return hasAccount && hasRegistryId && hasVaults;
};

export function useUserPortfolio() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const userRegistryId = useNetworkVariable("userRegistryId");
  const { data: vaults, isLoading: vaultsLoading } = useVaults();
  const { data: priceList } = useGetPriceList();

  return useQuery({
    queryKey: ['user-portfolio-json-rpc', currentAccount?.address, vaults?.length],
    queryFn: async (): Promise<UserAsset[]> => {
      if (!validatePortfolioParams({ currentAccount, userRegistryId, vaults })) {
        return [];
      }

      try {
        const usersTableId = await getUserRegistryTableId(client, userRegistryId!);
        if (!usersTableId) {
          return [];
        }

        const ownedAssets = await getUserOwnedAssets({
          client,
          usersTableId,
          userAddress: currentAccount!.address!
        });
        if (ownedAssets.length === 0) {
          return [];
        }

        const vaultMap = new Map(vaults!.map(vault => [vault.symbol, vault]));

        const assetPromises = ownedAssets.map(async (symbol: string) => {
          const vault = vaultMap.get(symbol);
          if (!vault) {
            console.warn(`Vault not found for symbol: ${symbol}`);
            return null;
          }

          return processUserAsset({
            client,
            symbol,
            vault,
            userAddress: currentAccount!.address!,
            priceList
          });
        });

        const assetResults = await Promise.all(assetPromises);
        return assetResults.filter((asset): asset is UserAsset => asset !== null);
      } catch (error) {
        console.error('Error fetching user portfolio with JSON-RPC:', error);
        return [];
      }
    },
    enabled: !!currentAccount?.address && !!userRegistryId && !vaultsLoading && !!vaults,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function usePortfolioTotalValue() {
  const { data: portfolio } = useUserPortfolio();

  const totalValue = portfolio?.reduce((sum, asset) => sum + asset.valueUsdRaw, 0) || 0;
  
  return {
    totalValue: formatUsdValue(totalValue),
    totalValueRaw: totalValue,
    assetCount: portfolio?.length || 0,
  };
}
