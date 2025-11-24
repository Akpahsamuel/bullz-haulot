

import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from '@/networkConfig';

export interface SubscriptionStatus {
  hasAccess: boolean;
  isActive: boolean;
  startTime: number;
  endTime: number;
  isExpired: boolean;
  timeRemaining: number; 
}


export function useSubscription() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const subscriptionRegistryId = useNetworkVariable('subscriptionRegistryId');
  const subscriptionConfigId = useNetworkVariable('subscriptionConfigId');

  return useQuery({
    queryKey: ['subscription-status', currentAccount?.address, subscriptionRegistryId, subscriptionConfigId],
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!currentAccount?.address || !subscriptionRegistryId || !subscriptionConfigId) {
        return {
          hasAccess: false,
          isActive: false,
          startTime: 0,
          endTime: 0,
          isExpired: true,
          timeRemaining: 0,
        };
      }

      try {
      
        const registryObject = await client.getObject({
          id: subscriptionRegistryId,
          options: { showContent: true },
        });

        if (!registryObject.data?.content || !('fields' in registryObject.data.content)) {
          throw new Error('Could not access subscription registry');
        }

        const registryFields = registryObject.data.content.fields as any;
        const subscriptionsTableId = registryFields.subscriptions?.fields?.id?.id;

        if (!subscriptionsTableId) {
          throw new Error('Could not find subscriptions table');
        }

       
        try {
          const subscriptionObject = await client.getDynamicFieldObject({
            parentId: subscriptionsTableId,
            name: {
              type: 'address',
              value: currentAccount.address,
            },
          });

          if (!subscriptionObject.data?.content || !('fields' in subscriptionObject.data.content)) {
            throw new Error('Could not access subscription object');
          }

          const subscriptionFields = subscriptionObject.data.content.fields as any;
          const subscriptionValue = subscriptionFields.value?.fields || subscriptionFields.value;

          if (!subscriptionValue) {
            throw new Error('Could not parse subscription fields');
          }

          
          const active = subscriptionValue.active === true;
          const startTime = Number(subscriptionValue.start_time_ms || 0);
          const endTime = Number(subscriptionValue.end_time_ms || 0);

          
          const now = Date.now();
          const isExpired = endTime > 0 && endTime < now;
          const timeRemaining = Math.max(0, endTime - now);
          
         
          const hasAccess = active && endTime > now;
          const isActive = hasAccess;

          const status = {
            hasAccess, 
            isActive, 
            startTime,
            endTime,
            isExpired,
            timeRemaining,
          };

          console.log('Subscription status:', {
            hasAccess,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            now: new Date(now).toISOString(),
            timeRemaining: Math.floor(timeRemaining / 1000) + ' seconds',
          });

          return status;
        } catch (subscriptionError: any) {
      
          if (subscriptionError.message?.includes('not found') || subscriptionError.message?.includes('Could not')) {
            return {
              hasAccess: false,
              isActive: false,
              startTime: 0,
              endTime: 0,
              isExpired: true,
              timeRemaining: 0,
            };
          }
          throw subscriptionError;
        }
      } catch (error) {
       
        if (error instanceof Error && error.message.includes('does not exist')) {
          console.warn('Subscription contract not deployed yet:', error.message);
        } else {
          console.error('Error fetching subscription status:', error);
        }
        return {
          hasAccess: false,
          isActive: false,
          startTime: 0,
          endTime: 0,
          isExpired: true,
          timeRemaining: 0,
        };
      }
    },
    enabled: !!currentAccount?.address && !!subscriptionRegistryId && !!subscriptionConfigId,
    staleTime: 5000, 
    refetchInterval: 30000, 
  });
}


export function usePurchaseSubscription() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const client = useSuiClient();
  const packageId = useNetworkVariable('packageId');
  const subscriptionRegistryId = useNetworkVariable('subscriptionRegistryId');
  const subscriptionConfigId = useNetworkVariable('subscriptionConfigId');
  const treasuryId = useNetworkVariable('treasuryId');
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['purchase-subscription'],
    mutationFn: async (): Promise<{ transactionDigest: string }> => {
      if (!currentAccount?.address) {
        throw new Error('Wallet not connected');
      }

      if (!packageId || !subscriptionRegistryId || !subscriptionConfigId || !treasuryId) {
        throw new Error('Contract addresses not configured');
      }

      const SUBSCRIPTION_PRICE = 10000000; // 0.01 SUI 

      const tx = new Transaction();
      const [payment] = tx.splitCoins(tx.gas, [SUBSCRIPTION_PRICE]);

      tx.moveCall({
        package: packageId,
        module: 'subscription',
        function: 'purchase_subscription',
        arguments: [
          tx.object(subscriptionRegistryId), 
          tx.object(subscriptionConfigId),  
          tx.object(treasuryId),             
          tx.object('0x6'),                  
          payment,                            
        ],
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              
              try {
                console.log('Waiting for transaction confirmation:', digest);
                await client.waitForTransaction({
                  digest,
                  options: {
                    showEffects: true,
                    showEvents: true,
                  },
                });
                
                console.log('Transaction confirmed, waiting for state update...');
               
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                
                console.log('Invalidating subscription status queries...');
                queryClient.invalidateQueries({ 
                  queryKey: ['subscription-status'],
                  exact: false, 
                });
                
              
                console.log('Refetching subscription status...');
                await queryClient.refetchQueries({ 
                  queryKey: ['subscription-status', currentAccount?.address, subscriptionRegistryId, subscriptionConfigId],
                  exact: true,
                });
                
                console.log('Subscription status updated');
                resolve({ transactionDigest: digest });
              } catch (waitError) {
                console.error('Error waiting for transaction confirmation:', waitError);
              
                queryClient.invalidateQueries({ 
                  queryKey: ['subscription-status'],
                  exact: false,
                });
                queryClient.refetchQueries({ 
                  queryKey: ['subscription-status', currentAccount?.address, subscriptionRegistryId, subscriptionConfigId],
                  exact: true,
                });
                resolve({ transactionDigest: digest });
              }
            },
            onError: (error) => {
              console.error('Subscription purchase failed:', error);
              reject(error);
            },
          }
        );
      });
    },
  });
}


export function useSubscriptionAccess() {
  const { data: subscriptionStatus, refetch } = useSubscription();
  
  return {
    hasAccess: subscriptionStatus?.hasAccess ?? false,
    isActive: subscriptionStatus?.isActive ?? false,
    isExpired: subscriptionStatus?.isExpired ?? true,
    timeRemaining: subscriptionStatus?.timeRemaining ?? 0,
    isLoading: !subscriptionStatus,
    refetch,
  };
}

