import { useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useNetworkVariable } from '@/networkConfig';
import { 
  fetchVaultFeeData, 
  isValidTradingFeeParams,
  type VaultFeeData, 
  type FeeConfig 
} from './utils/vaultDataFetchers';
import { 
  fetchAndCalculateTradingFee, 
  getDefaultTradingFee 
} from './utils/feeCalculators';
import { 
  simulateGetPrice, 
  calculatePriceFromReserves, 
  simulateQuoteBuy, 
  simulateQuoteSell 
} from './utils/contractSimulation';

export type { VaultFeeData, FeeConfig };

export function useVaultFees(vaultId: string) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['vault-fees-json-rpc', vaultId],
    queryFn: () => fetchVaultFeeData(client, vaultId),
    enabled: !!vaultId,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}


export function useTradingFee(vaultId: string, amount: string, isSell: boolean = false) {
  const client = useSuiClient();
  const { data: feeConfig } = useVaultFees(vaultId);

  return useQuery({
    queryKey: ['trading-fee-json-rpc', vaultId, amount, isSell],
    queryFn: async () => {
      try {
        if (!isValidTradingFeeParams(feeConfig, amount)) {
          return getDefaultTradingFee(amount);
        }

        return await fetchAndCalculateTradingFee({
          client,
          vaultId,
          amount,
          isSell,
          feeConfig,
        });
      } catch (error) {
        console.error('Error calculating trading fee with JSON-RPC:', error);
        return getDefaultTradingFee(amount);
      }
    },
    enabled: !!vaultId && !!amount && !!feeConfig,
    staleTime: 10000,
  });
}


// NOTE: This function uses devInspectTransactionBlock for contract simulation
// GraphQL doesn't support contract execution simulation, so this remains JSON-RPC only
export function useBaseAssetPrice(vaultId: string) {
  const client = useSuiClient();
  const packageId = useNetworkVariable('packageId');

  return useQuery({
    queryKey: ['basset-price', vaultId],
    queryFn: async () => {
      try {
        const price = await simulateGetPrice(client, packageId!, vaultId);
        if (price) {
          return price;
        }

        const vaultObject = await client.getObject({
          id: vaultId,
          options: { showContent: true },
        });

        if (!vaultObject.data?.content || vaultObject.data.content.dataType !== 'moveObject') {
          return '0';
        }

        const fields = vaultObject.data.content.fields as any;
        return calculatePriceFromReserves(
          fields.usdc_reserve || '0',
          fields.circulating_supply || '1'
        );
      } catch (error) {
        console.error('Error fetching base asset price:', error);
        return '0';
      }
    },
    enabled: !!vaultId && !!packageId,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}


// NOTE: This function uses devInspectTransactionBlock for contract simulation
// GraphQL doesn't support contract execution simulation, so this remains JSON-RPC only
export function useQuoteBuy(vaultId: string, usdcAmount: string) {
  const client = useSuiClient();
  const packageId = useNetworkVariable('packageId');

  return useQuery({
    queryKey: ['quote-buy', vaultId, usdcAmount],
    queryFn: () => simulateQuoteBuy(client, packageId!, vaultId, usdcAmount),
    enabled: !!vaultId && !!usdcAmount && !!packageId,
    staleTime: 5000,
  });
}

// NOTE: This function uses devInspectTransactionBlock for contract simulation
// GraphQL doesn't support contract execution simulation, so this remains JSON-RPC only
export function useQuoteSell(vaultId: string, bassetAmount: string) {
  const client = useSuiClient();
  const packageId = useNetworkVariable('packageId');

  return useQuery({
    queryKey: ['quote-sell', vaultId, bassetAmount],
    queryFn: () => simulateQuoteSell(client, packageId!, vaultId, bassetAmount),
    enabled: !!vaultId && !!bassetAmount && !!packageId,
    staleTime: 5000,
  });
}
