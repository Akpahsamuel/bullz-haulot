import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';


export function useSuiBalance() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();

  return useQuery({
    queryKey: ['sui-balance', currentAccount?.address],
    queryFn: async () => {
      if (!currentAccount?.address) {
        return '0';
      }

      try {
        const balance = await client.getBalance({
          owner: currentAccount.address,
          coinType: '0x2::sui::SUI',
        });

        return balance.totalBalance;
      } catch (error) {
        console.error('Error fetching SUI balance:', error);
        return '0';
      }
    },
    enabled: !!currentAccount?.address,
    staleTime: 10000,
    refetchInterval: 10, 
  });
}
