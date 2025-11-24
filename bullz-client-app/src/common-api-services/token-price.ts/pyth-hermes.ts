import { useQuery } from "@tanstack/react-query";

export const PYTH_HERMES_API = "https://hermes-stable-cyan.dourolabs.app";

type Symbol = string;
type FeedId = string;

interface PythPriceResponse {
  id: string;
  price: {
    price: string;
    expo: number;
    publish_time: number;
    conf?: string;
  };
  metadata?: {
    attributes: {
      symbol: string;
      display_symbol: string;
      base: string;
      quote_currency: string;
    };
  };
}

interface TWAPResponse {
  id: string;
  price: {
    price: string;
    expo: number;
    publish_time: number;
  };
}


// Focused on: BTC, ETH, SOL, SUI, WAL, APTOS, APPLE, AAVE, BLUE, IKA, ZORA, TESLA, CETUS, BNB
export const PYTH_FEED_IDS: Record<Symbol, FeedId> = {
  BTC: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  SUI: "23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  BNB: "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  APTOS: "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  APT: "03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5",
  AAVE: "2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445",
  APPLE: "5a207c4aa0114baecf852fcd9db9beb8ec715f2db48caa525dbd878fd416fb09",
  AAPL: "5a207c4aa0114baecf852fcd9db9beb8ec715f2db48caa525dbd878fd416fb09",
  TESLA: "42676a595d0099c381687124805c8bb22c75424dffcaa55e3dc6549854ebe20a",
  TSLA: "42676a595d0099c381687124805c8bb22c75424dffcaa55e3dc6549854ebe20a",
  WAL: "eba0732395fae9dec4bae12e52760b35fc1c5671e2da8b449c9af4efe5d54341",
  BLUE: "04cfeb7b143eb9c48e9b074125c1a3447b85f59c31164dc20c1beaa6f21f2b6b",
  IKA: "2b529621fa6e2c8429f623ba705572aa64175d7768365ef829df6a12c9f365f4",
  ZORA: "93eacee7286be62044cd8dfbdfdf1bea8f52a3ca6e0f512f4a05bd383f5666b1",
  CETUS: "e5b274b2611143df055d6e7cd8d93fe1961716bcd4dca1cad87a83bc1e78c1ef",
};


export function parsePythPrice(price: string, expo: number): number {
  const priceNum = BigInt(price);
  const divisor = BigInt(10) ** BigInt(-expo);
  return Number(priceNum) / Number(divisor);
}

function matchesCryptoFeed(feed: any, symbolUpper: Symbol): boolean {
  const attrs = feed?.attributes;
  if (!attrs) {
    return false;
  }
  
  const matchesDisplaySymbol = attrs.display_symbol === `${symbolUpper}/USD`;
  const matchesSymbol = attrs.symbol === `Crypto.${symbolUpper}/USD`;
  const matchesBaseAndQuote = attrs.base === symbolUpper && attrs.quote_currency === "USD";
  
  return matchesDisplaySymbol || matchesSymbol || matchesBaseAndQuote;
}

async function searchCryptoFeed(symbolUpper: Symbol): Promise<FeedId | null> {
  try {
    const response = await fetch(
      `${PYTH_HERMES_API}/v2/price_feeds?query=${symbolUpper}&asset_type=crypto`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const feeds = await response.json();
    if (!feeds || feeds.length === 0) {
      return null;
    }
    
    const feed = feeds.find((f: any) => matchesCryptoFeed(f, symbolUpper));
    return feed?.id || null;
  } catch (searchError) {
    console.warn(`Could not search Pyth for ${symbolUpper}:`, searchError);
    return null;
  }
}

interface EquityMatchParams {
  symbolUpper: Symbol;
  equityQuery: Symbol;
}

function matchesEquityFeed(feed: any, params: EquityMatchParams): boolean {
  const attrs = feed?.attributes;
  if (!attrs) {
    return false;
  }
  
  const matchesDisplaySymbol = attrs.display_symbol?.includes(`${params.equityQuery}/USD`) || false;
  const matchesSymbolUpper = attrs.base === params.symbolUpper;
  const matchesEquityQuery = attrs.base === params.equityQuery;
  
  return matchesDisplaySymbol || matchesSymbolUpper || matchesEquityQuery;
}

async function searchEquityFeed(symbolUpper: Symbol): Promise<FeedId | null> {
  const equityQuery = symbolUpper === 'APPLE' ? 'AAPL' : symbolUpper;
  
  try {
    const equityResponse = await fetch(
      `${PYTH_HERMES_API}/v2/price_feeds?query=${equityQuery}&asset_type=equity`
    );
    
    if (!equityResponse.ok) {
      return null;
    }
    
    const equityFeeds = await equityResponse.json();
    const equityFeed = equityFeeds?.find((f: any) => 
      matchesEquityFeed(f, { symbolUpper, equityQuery })
    );
    
    return equityFeed?.id || null;
  } catch (equityError) {
    console.warn(`Could not search equity Pyth for ${symbolUpper}:`, equityError);
    return null;
  }
}

async function findPythFeedId(symbol: Symbol): Promise<FeedId | null> {
  if (!symbol || symbol.trim() === '') {
    return null;
  }

  const symbolUpper = symbol.toUpperCase().trim();
  

  const staticFeedId = PYTH_FEED_IDS[symbolUpper];
  if (staticFeedId) {
    return staticFeedId;
  }

 
  const cryptoFeedId = await searchCryptoFeed(symbolUpper);
  if (cryptoFeedId) {
    return cryptoFeedId;
  }

  
  const isEquitySymbol = ['APPLE', 'TESLA', 'TSLA', 'AAPL'].includes(symbolUpper);
  if (isEquitySymbol) {
    const equityFeedId = await searchEquityFeed(symbolUpper);
    if (equityFeedId) {
      return equityFeedId;
    }
  }
  
  return null;
}

export interface TokenPriceChange {
  symbol: Symbol;
  feedId: FeedId;
  currentPrice: number;
  oneHourAgoPrice: number;
  percentageChange: number;
}

interface FetchPriceParams {
  feedId: FeedId;
  symbolUpper: Symbol;
}

async function fetchCurrentPrice(params: FetchPriceParams): Promise<number | null> {
  const { feedId, symbolUpper } = params;
  const currentRes = await fetch(
    `${PYTH_HERMES_API}/api/latest_price_feeds?ids[]=${feedId}&verbose=true`
  );
  
  if (!currentRes.ok) {
    console.error(`Failed to fetch current price for ${symbolUpper}: ${currentRes.status}`);
    return null;
  }

  const currentData: PythPriceResponse[] = await currentRes.json();
  
  if (!currentData || currentData.length === 0) {
    return null;
  }

  return parsePythPrice(
    currentData[0].price.price,
    currentData[0].price.expo
  );
}

function hasValidTwapData(twapData: TWAPResponse[] | null | undefined): boolean {
  return twapData !== null && twapData !== undefined && twapData.length > 0 && twapData[0].price !== undefined;
}

function extractTwapPrice(twapData: TWAPResponse[]): number | null {
  if (!hasValidTwapData(twapData)) {
    return null;
  }
  return parsePythPrice(
    twapData[0].price.price,
    twapData[0].price.expo
  );
}

function hasValidHistoricalData(historical: PythPriceResponse[] | null | undefined): boolean {
  return historical !== null && historical !== undefined && historical.length > 0 && historical[0].price !== undefined;
}

function extractHistoricalPrice(historical: PythPriceResponse[]): number | null {
  if (!hasValidHistoricalData(historical)) {
    return null;
  }
  return parsePythPrice(
    historical[0].price.price,
    historical[0].price.expo
  );
}

async function fetchTwapPrice(feedId: FeedId): Promise<number | null> {
  try {
    const twapRes = await fetch(
      `${PYTH_HERMES_API}/v2/updates/twap/600/latest?ids[]=${feedId}&parsed=true`
    );
    
    if (!twapRes.ok) {
      return null;
    }
    
    const twapData: { parsed: TWAPResponse[] } = await twapRes.json();
    return extractTwapPrice(twapData.parsed);
  } catch (twapError) {
    return null;
  }
}

async function fetchHistoricalPrice(feedId: FeedId): Promise<number | null> {
  try {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const historicalRes = await fetch(
      `${PYTH_HERMES_API}/v2/updates/price/${oneHourAgo}?ids[]=${feedId}&parsed=true`
    );
    
    if (!historicalRes.ok) {
      return null;
    }
    
    const historical: { parsed: PythPriceResponse[] } = await historicalRes.json();
    return extractHistoricalPrice(historical.parsed);
  } catch (histError) {
    return null;
  }
}

async function fetchOneHourAgoPrice(feedId: FeedId, fallbackPrice: number): Promise<number> {
  const twapPrice = await fetchTwapPrice(feedId);
  if (twapPrice !== null) {
    return twapPrice;
  }

  const historicalPrice = await fetchHistoricalPrice(feedId);
  if (historicalPrice !== null) {
    return historicalPrice;
  }

  return fallbackPrice;
}

// Refresh intervals - exported for consistency across token price hooks
export const REFETCH_INTERVAL = 1000 * 60; // 60 seconds
export const STALE_TIME = 1000 * 30; // 30 seconds

export const useToken1HourChange = (symbol: Symbol) => {
  return useQuery({
    queryKey: ["pyth-1h-change", symbol],
    queryFn: async () => {
      if (!symbol || symbol.trim() === '') {
        return null;
      }

      const symbolUpper = symbol.toUpperCase().trim();
      const feedId = await findPythFeedId(symbolUpper);
      
      if (!feedId) {
        console.warn(`No Pyth feed found for ${symbolUpper}`);
        return null;
      }

      const currentPrice = await fetchCurrentPrice({ feedId, symbolUpper });
      if (currentPrice === null) {
        return null;
      }

      const oneHourAgoPrice = await fetchOneHourAgoPrice(feedId, currentPrice);
      const change = oneHourAgoPrice > 0 
        ? ((currentPrice - oneHourAgoPrice) / oneHourAgoPrice) * 100
        : 0;

      return {
        symbol: symbolUpper,
        feedId,
        currentPrice,
        oneHourAgoPrice,
        percentageChange: change,
      } as TokenPriceChange;
    },
    enabled: !!symbol,
    refetchInterval: REFETCH_INTERVAL, 
    staleTime: STALE_TIME, 
    retry: 2,
  });
};

