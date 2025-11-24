

import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useNetworkVariable } from '@/networkConfig';
import { EncryptedDataRetrievalService, TradingSentimentData } from '@/services/encrypted-data-retrieval';
import { SealConfig } from '@/services/seal-service';
import { useCurrentWallet } from '@mysten/dapp-kit';
import type { KeyServerConfig } from '@mysten/seal';


export function useTradingSentiment() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const packageId = useNetworkVariable('packageId');
  const tradingSentimentStateId = useNetworkVariable('tradingSentimentStateId');
  const subscriptionRegistryId = useNetworkVariable('subscriptionRegistryId');
  const subscriptionConfigId = useNetworkVariable('subscriptionConfigId');
  const sealPackageId = useNetworkVariable('sealPackageId');
  const sealServerConfigs = useNetworkVariable('sealServerConfigs') as KeyServerConfig[] | undefined;
  
  
  const isEnabled = !!currentAccount?.address && 
                   !!tradingSentimentStateId && 
                   !!packageId && 
                   !!subscriptionRegistryId && 
                   !!subscriptionConfigId &&
                   !!sealServerConfigs &&
                   sealServerConfigs.length > 0;

  return useQuery({
    queryKey: ['trading-sentiment', currentAccount?.address, tradingSentimentStateId],
    queryFn: async (): Promise<TradingSentimentData | null> => {
      if (!currentAccount?.address || !tradingSentimentStateId) {
        return null;
      }

      if (!packageId || !subscriptionRegistryId || !subscriptionConfigId) {
        console.error('Contract addresses not configured');
        return null;
      }

    
      const network: 'testnet' | 'mainnet' = 'testnet';
      console.log('Using testnet network for Walrus client');

      
      
      const effectiveSealPackageId = sealPackageId || packageId;
      const effectiveSealServerConfigs = sealServerConfigs || [];

      if (!effectiveSealServerConfigs || effectiveSealServerConfigs.length === 0) {
        console.warn('Seal server configs not configured - sentiment data will not be available');
        return null;
      }

      if (!currentWallet) {
        console.error('Wallet not available');
        return null;
      }

      try {
        const sealConfig: SealConfig = {
          suiClient: client as any, 
          packageId: effectiveSealPackageId,
          serverConfigs: effectiveSealServerConfigs,
        };

        const retrievalService = new EncryptedDataRetrievalService({
          network: network as 'testnet' | 'mainnet', 
          suiClient: client,
          sealConfig,
          packageId,
          tradingSentimentStateId,
          subscriptionRegistryId,
          subscriptionConfigId,
        });

       
        const userSigner = currentWallet as any; 
        const data = await retrievalService.retrieveAndDecryptSentimentData(
          currentAccount.address,
          userSigner
        );

        return data;
      } catch (error: any) {
        
        if (error.accessResult) {
          const accessResult = error.accessResult;
          
          if (accessResult.reason === 'rate_limited') {
            console.warn('Rate limit exceeded:', accessResult.message);
            if (accessResult.retryAfter) {
              console.warn(`Retry after ${accessResult.retryAfter} seconds`);
            }
          } else if (accessResult.reason === 'no_subscription' || accessResult.reason === 'expired') {
            console.warn('Subscription access denied:', accessResult.message);
          } else if (accessResult.reason === 'free_tier_limit') {
            console.warn('Free tier limit reached:', accessResult.message);
          }
          
          return null;
        }
      
      
        if (error.message?.includes('subscription access') || error.message?.includes('does not have')) {
          console.warn('User does not have subscription access:', error.message);
          return null;
        }
       
        console.error('Error fetching trading sentiment:', error);
        return null;
      }
    },
    enabled: isEnabled,
    staleTime: 60000, 
    retry: false, 
  });
}


export function useSentimentMetadata() {
  const client = useSuiClient();
  const tradingSentimentStateId = useNetworkVariable('tradingSentimentStateId');

  return useQuery({
    queryKey: ['sentiment-metadata', tradingSentimentStateId],
    queryFn: async () => {
      if (!tradingSentimentStateId) {
        return null;
      }

      try {
        const state = await client.getObject({
          id: tradingSentimentStateId,
          options: {
            showContent: true,
          },
        });

        if (!state.data || !('content' in state.data)) {
          return null;
        }

        const content = state.data.content;
        if (
          typeof content === 'object' &&
          content !== null &&
          'fields' in content &&
          typeof content.fields === 'object' &&
          content.fields !== null
        ) {
          const fields = content.fields as {
            version: string;
            last_update_ts_ms: string;
            latest_blob_id: string;
        };

        return {
            version: parseInt(fields.version),
            timestamp: parseInt(fields.last_update_ts_ms),
            hasData: fields.latest_blob_id !== '',
        };
        }

        return null;
      } catch (error) {
        console.error('Error fetching sentiment metadata:', error);
        return null;
      }
    },
    enabled: !!tradingSentimentStateId,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

