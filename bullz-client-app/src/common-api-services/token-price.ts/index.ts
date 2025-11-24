
import { useQuery } from "@tanstack/react-query";
import { PYTH_FEED_IDS, PYTH_HERMES_API, parsePythPrice } from "./pyth-hermes";
import { REFETCH_INTERVAL, STALE_TIME } from "./pyth-hermes";


export const useGetPriceList = (useAllTokens: boolean = true) => {
  return useQuery({
    queryKey: ["token-price-pyth", useAllTokens ? "all" : "default"],
    queryFn: async () => {
      const feedIds = Object.values(PYTH_FEED_IDS);
      const idsParam = feedIds.map(id => `ids[]=${id}`).join('&');
      const url = `${PYTH_HERMES_API}/api/latest_price_feeds?${idsParam}&verbose=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }
      
      const data: any[] = await response.json();
      
      return data.map(item => {
        const price = parsePythPrice(item.price.price, item.price.expo);
        const symbol = item.metadata?.attributes?.symbol?.replace('Crypto.', '') || item.id;
        const displaySymbol = item.metadata?.attributes?.display_symbol?.split('/')[0] || symbol;
        
        return {
          coinAddress: item.id,
          name: displaySymbol,
          symbol: displaySymbol,
          decimals: item.price.expo.toString(),
          imageUrl: null, 
          currentPrice: price.toString(),
          price5mAgo: "0",
          price1hAgo: "0",
          percentagePriceChange5m: "0",
          percentagePriceChange1h: "0" // Will be calculated separately
        };
      });
    },
    refetchInterval: REFETCH_INTERVAL, 
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    retry: 2,
    staleTime: STALE_TIME,
  });
};



export const useGetCoinPrice = (coinAddress: string) => {
  return useQuery({
    queryKey: ["coin-price-pyth", coinAddress],
    queryFn: async () => {
      if (!coinAddress) return [];
      
      const url = `${PYTH_HERMES_API}/api/latest_price_feeds?ids[]=${coinAddress}&verbose=true`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.status}`);
      }
      
      const data: any[] = await response.json();
      if (data.length === 0) return [];
      
      const item = data[0];
      const price = parsePythPrice(item.price.price, item.price.expo);
      const symbol = item.metadata?.attributes?.symbol?.replace('Crypto.', '') || item.id;
      const displaySymbol = item.metadata?.attributes?.display_symbol?.split('/')[0] || symbol;
      
      return [{
        coinAddress: item.id,
        name: displaySymbol,
        symbol: displaySymbol,
        decimals: item.price.expo.toString(),
        imageUrl: null,
        currentPrice: price.toString(),
        price5mAgo: "0",
        price1hAgo: "0",
        percentagePriceChange5m: "0",
        percentagePriceChange1h: "0"
      }];
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    retry: 2,
    staleTime: STALE_TIME,
    enabled: !!coinAddress,
  });
};


// Aftermath SDK hook for getting multiple specific coin metadata
export const useGetMultipleCoinPrices = (coinAddresses: string[]) => {
  return useQuery({
    queryKey: ["multiple-coin-price-pyth", ...coinAddresses.sort()],
    queryFn: async () => {
      if (!coinAddresses || coinAddresses.length === 0) {
        return [];
      }
      
      const idsParam = coinAddresses.map(id => `ids[]=${id}`).join('&');
      const url = `${PYTH_HERMES_API}/api/latest_price_feeds?${idsParam}&verbose=true`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }
      
      const data: any[] = await response.json();
      
      return data.map(item => {
        const price = parsePythPrice(item.price.price, item.price.expo);
        const symbol = item.metadata?.attributes?.symbol?.replace('Crypto.', '') || item.id;
        const displaySymbol = item.metadata?.attributes?.display_symbol?.split('/')[0] || symbol;
        
        return {
          coinAddress: item.id,
          name: displaySymbol,
          symbol: displaySymbol,
          decimals: item.price.expo.toString(),
          imageUrl: null,
          currentPrice: price.toString(),
          price5mAgo: "0",
          price1hAgo: "0",
          percentagePriceChange5m: "0",
          percentagePriceChange1h: "0"
        };
      });
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    retry: 2,
    staleTime: STALE_TIME,
    enabled: coinAddresses && coinAddresses.length > 0,
  });
};
