//@ts-nocheck
import { SuiClient } from "@mysten/sui/client";
import { TokenPrice, SquadTokenConfig } from '../types/bid-matching.types';
import { Aftermath } from 'aftermath-ts-sdk';

export class TokenPriceService {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private priceListCache: Map<string, any> = new Map();
  private readonly CACHE_DURATION_MS = 60000; 
  private readonly PRICE_LIST_CACHE_DURATION_MS = 300000; 
  private suiClient: SuiClient | null = null;
  private squadRegistryId: string | null = null;
  private aftermathSdk: Aftermath | null = null;
  private isAftermathInitialized: boolean = false;
  private aftermathInitPromise: Promise<void> | null = null;

  constructor() {
    this.aftermathInitPromise = this.initializeAftermath();
  }

  private async initializeAftermath(): Promise<void> {
    try {
      this.aftermathSdk = new Aftermath("MAINNET");
      await this.aftermathSdk.init();
      this.isAftermathInitialized = true;
      console.log('✅ Aftermath SDK initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Aftermath SDK:', error.message);
      this.isAftermathInitialized = false;
    }
  }

  initialize(suiClient: SuiClient, squadRegistryId: string) {
    this.suiClient = suiClient;
    this.squadRegistryId = squadRegistryId;
  }

  private async getAftermathPrices(tokenAddresses: string[]): Promise<any[]> {
    if (this.aftermathInitPromise) {
      await this.aftermathInitPromise;
    }

    if (!this.isAftermathInitialized || !this.aftermathSdk) {
      console.log('⚠️ Aftermath SDK not initialized, returning empty data');
      return [];
    }

    try {
      console.log(`📊 Fetching real prices for ${tokenAddresses.length} tokens from Aftermath`);
      console.log(`🔗 Token addresses:`, tokenAddresses);
      
      const prices = this.aftermathSdk.Prices();
       
      const priceInfos = await prices.getCoinsToPriceInfo({
        coins: tokenAddresses
      });
      
      const realData = [];
      
      for (const address of tokenAddresses) {
        const priceInfo = priceInfos[address];
        
        if (priceInfo && priceInfo.price > 0) {
          const symbol = this.extractTokenSymbol(address);
          realData.push({
            coinAddress: address,
            symbol: symbol,
            currentPrice: priceInfo.price,
            priceChange24HoursPercentage: priceInfo.priceChange24HoursPercentage || 0,
            timestamp: Date.now()
          });
          console.log(`✅ ${symbol}: Real price from Aftermath $${priceInfo.price}`);
        } else {
          console.log(`❌ ${address}: No valid price data from Aftermath`);
        }
      }

      console.log(`✅ Received real prices for ${realData.length} tokens from Aftermath`);
      return realData;

    } catch (error: any) {
      console.error('❌ Error fetching real prices from Aftermath:', error.message);
      console.log('📊 Returning empty data due to API error');
      return [];
    }
  }

  // Direct API call with NO caching whatsoever - for match completion
  private async getAftermathPricesDirectly(tokenAddresses: string[]): Promise<any[]> {
    if (this.aftermathInitPromise) {
      await this.aftermathInitPromise;
    }

    if (!this.isAftermathInitialized || !this.aftermathSdk) {
      console.log('⚠️ Aftermath SDK not initialized, returning empty data');
      return [];
    }

    try {
      console.log(`🔥 DIRECT API CALL - Fetching LIVE prices for ${tokenAddresses.length} tokens (NO CACHE)`);
      console.log(`🔗 Token addresses:`, tokenAddresses);
      
      // Force new instance to ensure no internal caching
      const prices = this.aftermathSdk.Prices();
      
      // Add timestamp to ensure fresh data
      const requestTimestamp = Date.now();
      console.log(`🕐 DIRECT API request timestamp: ${requestTimestamp}`);
       
      const priceInfos = await prices.getCoinsToPriceInfo({
        coins: tokenAddresses
      });
      
      const realData = [];
      
      for (const address of tokenAddresses) {
        const priceInfo = priceInfos[address];
        
        if (priceInfo && priceInfo.price > 0) {
          const symbol = this.extractTokenSymbol(address);
          const processedData = {
            coinAddress: address,
            symbol: symbol,
            currentPrice: priceInfo.price,
            currentPriceMicroCents: Math.round(priceInfo.price * 10000000000), // Convert to nano-cents
            priceChange24HoursPercentage: priceInfo.priceChange24HoursPercentage || 0,
            timestamp: Date.now()
          };
          realData.push(processedData);
          console.log(`🔥 ${symbol}: LIVE price $${priceInfo.price} -> ${processedData.currentPriceMicroCents} nano-cents (DIRECT API - NO CACHE)`);
        } else {
          console.log(`❌ ${address}: No valid price data from Aftermath DIRECT API`);
        }
      }

      console.log(`🔥 DIRECT API: Received LIVE prices for ${realData.length} tokens (ZERO CACHE)`);
      return realData;

    } catch (error: any) {
      console.error('❌ Error in DIRECT API call to Aftermath:', error.message);
      console.log('📊 Returning empty data due to DIRECT API error');
      return [];
    }
  }

  private async fetchPriceList(tokenAddresses?: string[]): Promise<any[]> {
    if (this.aftermathInitPromise) {
      await this.aftermathInitPromise;
    }

    const cacheKey = tokenAddresses ? `price_list_${tokenAddresses.join(',')}` : 'price_list_all';
    const cached = this.priceListCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.PRICE_LIST_CACHE_DURATION_MS) {
      return cached.data;
    }

    try {
      console.log("🔍 Fetching price list from Aftermath SDK...");
      
      const addressesToFetch = tokenAddresses || [];
      
      if (addressesToFetch.length === 0) {
        console.log("⚠️ No token addresses provided to fetch prices for");
        return [];
      }
    
      const priceList = await this.getAftermathPrices(addressesToFetch);
     
      const processedPriceList = priceList.map((token: any) => {
        const price = parseFloat(token.currentPrice || '0');
        const currentPriceMicroCents = Math.round(price * 10000000000); // Convert USD to nano-cents (10 decimal places)
        return {
          ...token,
          currentPrice: price, 
          currentPriceMicroCents 
        };
      });
      
      this.priceListCache.set(cacheKey, {
        data: processedPriceList,
        timestamp: Date.now()
      });
      
      console.log(`✅ Fetched ${processedPriceList.length} tokens from Aftermath SDK`);
      return processedPriceList;
      
    } catch (error) {
      console.error("❌ Error fetching price list from Aftermath SDK:", error);
      return [];
    }
  }

  // Fetch fresh prices without cache - for match completion
  private async fetchPriceListFresh(tokenAddresses: string[]): Promise<any[]> {
    if (this.aftermathInitPromise) {
      await this.aftermathInitPromise;
    }

    try {
      console.log("🔥 Fetching FRESH price list from Aftermath SDK (bypassing cache)...");
      
      if (tokenAddresses.length === 0) {
        console.log("⚠️ No token addresses provided to fetch fresh prices for");
        return [];
      }
    
      const priceList = await this.getAftermathPrices(tokenAddresses);
     
      const processedPriceList = priceList.map((token: any) => {
        const price = parseFloat(token.currentPrice || '0');
        const currentPriceMicroCents = Math.round(price * 10000000000); // Convert USD to nano-cents (10 decimal places)
        return {
          ...token,
          currentPrice: price, 
          currentPriceMicroCents 
        };
      });
      
      console.log(`🔥 Fetched ${processedPriceList.length} FRESH tokens from Aftermath SDK`);
      return processedPriceList;
      
    } catch (error) {
      console.error("❌ Error fetching fresh price list from Aftermath SDK:", error);
      return [];
    }
  }

  private findTokenDataByAddress(tokenAddress: string, priceList: any[]): any | null {
    if (!priceList || priceList.length === 0) {
      return null;
    }

    const tokenData = priceList.find(token => token.coinAddress === tokenAddress);
    
    if (tokenData) {
      console.log(`✅ Found token data for ${tokenAddress}: ${tokenData.symbol} at $${tokenData.currentPrice}`);
      return tokenData;
    }
    
    console.log(`⚠️ No token data found for address: ${tokenAddress}`);
    return null;
  }

  private extractTokenSymbol(tokenAddress: string): string {
    try {
      const parts = tokenAddress.split('::');
      if (parts.length >= 3) {
        return parts[2]; 
      }
      return tokenAddress; 
    } catch (error) {
      console.error(`Error extracting symbol from ${tokenAddress}:`, error);
      return tokenAddress;
    }
  }

  async fetchSquadData(squadId: number): Promise<{ players: string[] } | null> {
    try {
      if (!this.suiClient || !this.squadRegistryId) {
        throw new Error("TokenPriceService not initialized with SUI client and squad registry ID");
      }

      console.log(`🔍 Fetching squad ${squadId} data from blockchain...`);

      const registryObject = await this.suiClient.getObject({
        id: this.squadRegistryId,
        options: { showContent: true },
      });

      if (!registryObject.data?.content || !('fields' in registryObject.data.content)) {
        throw new Error("Could not access squad registry");
      }

      const registryFields = registryObject.data.content.fields as any;
      const squadsTableId = registryFields.squads?.fields?.id?.id;

      if (!squadsTableId) {
        throw new Error("Could not find squads table");
      }

      const squadObject = await this.suiClient.getDynamicFieldObject({
        parentId: squadsTableId,
        name: {
          type: "u64",
          value: squadId.toString(),
        },
      });

      if (squadObject.data?.content && 'fields' in squadObject.data.content) {
        const squadFields = (squadObject.data.content.fields as any).value?.fields;
        
        if (squadFields) {
          const players = squadFields.players || [];
          console.log(`✅ Squad ${squadId} players:`, players);
          
          return { players };
        }
      }

      throw new Error(`Squad ${squadId} not found`);
      
    } catch (error) {
      console.error(`❌ Error fetching squad ${squadId} data:`, error);
      return null;
    }
  }

  async fetchSquadTokenConfig(squadId: number): Promise<SquadTokenConfig | null> {
    try {
      const squadData = await this.fetchSquadData(squadId);
      if (!squadData) {
        return null;
      }

      return {
        squadId,
        tokenNames: squadData.players.map(addr => this.extractTokenSymbol(addr)), 
        tokenSymbols: squadData.players 
      };
      
    } catch (error) {
      console.error(`Error fetching squad ${squadId} token config:`, error);
      return null;
    }
  }

  async getSquadTokenPrices(squadId: number): Promise<TokenPrice[]> {
    try {
      const squadConfig = await this.fetchSquadTokenConfig(squadId);
      if (!squadConfig) {
        throw new Error(`No token config found for squad ${squadId}`);
      }

      console.log(`🔍 Fetching token prices for squad ${squadId}: ${squadConfig.tokenSymbols.join(', ')}`);
      
      const priceList = await this.fetchPriceList(squadConfig.tokenSymbols);
      const tokenPrices: TokenPrice[] = [];
      const missingTokens: string[] = [];
      
      for (let index = 0; index < squadConfig.tokenSymbols.length; index++) {
        const tokenAddress = squadConfig.tokenSymbols[index];
        const tokenSymbol = squadConfig.tokenNames[index];
        
        const tokenData = this.findTokenDataByAddress(tokenAddress, priceList);
        
        if (tokenData && typeof tokenData.currentPriceMicroCents === 'number') {
          tokenPrices.push({
            tokenId: index,
            price: tokenData.currentPriceMicroCents,
            timestamp: Date.now()
          });
          console.log(`💰 ${tokenSymbol}: $${tokenData.currentPrice} -> ${tokenData.currentPriceMicroCents} nano-cents (Aftermath)`);
        } else {
          missingTokens.push(`${tokenSymbol}(${tokenAddress})`);
        }
      }
      
      if (missingTokens.length > 0) {
        throw new Error(`Missing prices for squad ${squadId}: ${missingTokens.join(', ')}`);
      }
      
      console.log(`✅ Returning ${tokenPrices.length} token prices for squad ${squadId}`);
      return tokenPrices;
      
    } catch (error) {
      console.error(`❌ Error fetching squad ${squadId} token prices:`, error);
      throw error;
    }
  }

  // Get fresh token prices without ANY caching - for match completion
  async getSquadTokenPricesFresh(squadId: number): Promise<TokenPrice[]> {
    try {
      const squadConfig = await this.fetchSquadTokenConfig(squadId);
      if (!squadConfig) {
        throw new Error(`No token config found for squad ${squadId}`);
      }

      console.log(`🔥 Fetching LIVE token prices for squad ${squadId}: ${squadConfig.tokenSymbols.join(', ')}`);
      
      // Bypass ALL caches - direct API call every time
      const priceList = await this.getAftermathPricesDirectly(squadConfig.tokenSymbols);
      const tokenPrices: TokenPrice[] = [];
      const missingTokens: string[] = [];
      
      for (let index = 0; index < squadConfig.tokenSymbols.length; index++) {
        const tokenAddress = squadConfig.tokenSymbols[index];
        const tokenSymbol = squadConfig.tokenNames[index];
        
        const tokenData = this.findTokenDataByAddress(tokenAddress, priceList);
        
        if (tokenData && typeof tokenData.currentPriceMicroCents === 'number') {
          tokenPrices.push({
            tokenId: index,
            price: tokenData.currentPriceMicroCents,
            timestamp: Date.now()
          });
          console.log(`🔥 ${tokenSymbol}: $${tokenData.currentPrice} -> ${tokenData.currentPriceMicroCents} nano-cents (LIVE from Aftermath - NO CACHE)`);
        } else {
          missingTokens.push(`${tokenSymbol}(${tokenAddress})`);
        }
      }
      
      if (missingTokens.length > 0) {
        throw new Error(`Missing live prices for squad ${squadId}: ${missingTokens.join(', ')}`);
      }
      
      console.log(`🔥 Returning ${tokenPrices.length} LIVE token prices for squad ${squadId} (ZERO CACHE)`);
      return tokenPrices;
      
    } catch (error) {
      console.error(`❌ Error fetching live squad ${squadId} token prices:`, error);
      throw error;
    }
  }

  async getMultipleSquadTokenPrices(squadIds: number[]): Promise<Map<number, TokenPrice[]>> {
    try {
      console.log(`🔍 Fetching token prices for ${squadIds.length} squads efficiently...`);
      
      const squadConfigs: Array<{ squadId: number; config: SquadTokenConfig }> = [];
      for (const squadId of squadIds) {
        const config = await this.fetchSquadTokenConfig(squadId);
        if (config) {
          squadConfigs.push({ squadId, config });
        }
      }

      if (squadConfigs.length === 0) {
        throw new Error("No valid squad configs found");
      }

      const allTokenAddresses = new Set<string>();
      squadConfigs.forEach(({ config }) => {
        config.tokenSymbols.forEach(addr => allTokenAddresses.add(addr));
      });

      console.log(`🔍 Fetching prices for ${allTokenAddresses.size} unique tokens across ${squadConfigs.length} squads`);
      
      const priceList = await this.fetchPriceList(Array.from(allTokenAddresses));
      
      const result = new Map<number, TokenPrice[]>();
      
      for (const { squadId, config } of squadConfigs) {
        const tokenPrices: TokenPrice[] = [];
        const missingTokens: string[] = [];
        
        for (let index = 0; index < config.tokenSymbols.length; index++) {
          const tokenAddress = config.tokenSymbols[index];
          const tokenSymbol = config.tokenNames[index];
          
          const tokenData = this.findTokenDataByAddress(tokenAddress, priceList);
          
          if (tokenData && typeof tokenData.currentPriceMicroCents === 'number') {
            tokenPrices.push({
              tokenId: index,
              price: tokenData.currentPriceMicroCents,
              timestamp: Date.now()
            });
            console.log(`💰 Squad ${squadId} - ${tokenSymbol}: $${tokenData.currentPrice} -> ${tokenData.currentPriceMicroCents} nano-cents`);
          } else {
            missingTokens.push(`${tokenSymbol}(${tokenAddress})`);
          }
        }
        
        if (missingTokens.length > 0) {
          throw new Error(`Missing prices for squad ${squadId}: ${missingTokens.join(', ')}`);
        }
        
        result.set(squadId, tokenPrices);
        console.log(`✅ Squad ${squadId} price vector: [${tokenPrices.map(p => p.price).join(', ')}]`);
      }
      
      console.log(`✅ Efficiently fetched prices for ${result.size} squads with ${allTokenAddresses.size} unique tokens`);
      return result;
      
    } catch (error) {
      console.error(`❌ Error fetching multiple squad token prices:`, error);
      throw error;
    }
  }

  // Get LIVE token prices for multiple squads with NO CACHE - for match completion
  async getMultipleSquadTokenPricesFresh(squadIds: number[]): Promise<Map<number, TokenPrice[]>> {
    try {
      console.log(`🔥 Fetching LIVE token prices for ${squadIds.length} squads (ZERO CACHE)...`);
      
      const squadConfigs: Array<{ squadId: number; config: SquadTokenConfig }> = [];
      for (const squadId of squadIds) {
        const config = await this.fetchSquadTokenConfig(squadId);
        if (config) {
          squadConfigs.push({ squadId, config });
        }
      }

      if (squadConfigs.length === 0) {
        throw new Error("No valid squad configs found");
      }

      const allTokenAddresses = new Set<string>();
      squadConfigs.forEach(({ config }) => {
        config.tokenSymbols.forEach(addr => allTokenAddresses.add(addr));
      });

      console.log(`🔥 DIRECT API CALL for ${allTokenAddresses.size} unique tokens across ${squadConfigs.length} squads (NO CACHE)`);
      
      // Use DIRECT API call with NO caching
      const priceList = await this.getAftermathPricesDirectly(Array.from(allTokenAddresses));
      
      const result = new Map<number, TokenPrice[]>();
      
      for (const { squadId, config } of squadConfigs) {
        const tokenPrices: TokenPrice[] = [];
        const missingTokens: string[] = [];
        
        for (let index = 0; index < config.tokenSymbols.length; index++) {
          const tokenAddress = config.tokenSymbols[index];
          const tokenSymbol = config.tokenNames[index];
          
          const tokenData = this.findTokenDataByAddress(tokenAddress, priceList);
          
          if (tokenData && typeof tokenData.currentPriceMicroCents === 'number') {
            tokenPrices.push({
              tokenId: index,
              price: tokenData.currentPriceMicroCents,
              timestamp: Date.now()
            });
            console.log(`🔥 Squad ${squadId} - ${tokenSymbol}: $${tokenData.currentPrice} -> ${tokenData.currentPriceMicroCents} nano-cents (LIVE DIRECT API)`);
          } else {
            missingTokens.push(`${tokenSymbol}(${tokenAddress})`);
          }
        }
        
        if (missingTokens.length > 0) {
          throw new Error(`Missing live prices for squad ${squadId}: ${missingTokens.join(', ')}`);
        }
        
        result.set(squadId, tokenPrices);
        console.log(`🔥 Squad ${squadId} LIVE price vector: [${tokenPrices.map(p => p.price).join(', ')}] (DIRECT API)`);
      }
      
      console.log(`🔥 DIRECT API: Successfully fetched LIVE prices for ${result.size} squads with ${allTokenAddresses.size} unique tokens (ZERO CACHE)`);
      return result;
      
    } catch (error) {
      console.error(`❌ Error fetching multiple squad LIVE token prices via DIRECT API:`, error);
      throw error;
    }
  }

  async getTokenPrices(): Promise<TokenPrice[]> {
    try {
      console.log("🔍 Fetching general token prices from Aftermath...");
      
      // Use some common mainnet tokens for verification
      const commonTokens = [
        "0x2::sui::SUI",
        "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
        "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"
      ];
      
      const priceList = await this.fetchPriceList(commonTokens);
      
      if (priceList.length === 0) {
        throw new Error("No token prices received from Aftermath");
      }
      
      const tokenPrices: TokenPrice[] = priceList.map((token: any, index: number) => ({
        tokenId: index,
        price: token.currentPriceMicroCents,
        timestamp: Date.now()
      }));
      
      console.log(`✅ Fetched ${tokenPrices.length} token prices from Aftermath`);
      return tokenPrices;
      
    } catch (error) {
      console.error("❌ Error fetching general token prices:", error);
      throw error;
    }
  }

  private getFallbackPrices(): TokenPrice[] {
    console.log("🔄 Using fallback prices in nano-cents");
    return [
      { tokenId: 0, price: 10000000000, timestamp: Date.now() }, // $1.00 -> 10,000,000,000 nano-cents
      { tokenId: 1, price: 10000000000, timestamp: Date.now() }, // $1.00 -> 10,000,000,000 nano-cents
      { tokenId: 2, price: 10000000000, timestamp: Date.now() }, // $1.00 -> 10,000,000,000 nano-cents
      { tokenId: 3, price: 10000000000, timestamp: Date.now() }, // $1.00 -> 10,000,000,000 nano-cents
      { tokenId: 4, price: 10000000000, timestamp: Date.now() }, // $1.00 -> 10,000,000,000 nano-cents
      { tokenId: 5, price: 10000000000, timestamp: Date.now() }, // $1.00 -> 10,000,000,000 nano-cents
      { tokenId: 6, price: 10000000000, timestamp: Date.now() }, // $1.00 -> 10,000,000,000 nano-cents
    ];
  }

    
  async getCachedTokenPrice(tokenAddress: string): Promise<number> {
    const cached = this.priceCache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.price;
    }

    try {
      const priceList = await this.fetchPriceList([tokenAddress]);
      const tokenData = this.findTokenDataByAddress(tokenAddress, priceList);
      
      if (tokenData && typeof tokenData.currentPriceMicroCents === 'number') {
        const price = tokenData.currentPriceMicroCents;
        this.priceCache.set(tokenAddress, { price, timestamp: Date.now() });
        return price;
      }
      
      throw new Error(`No price data found for token ${tokenAddress}`);
      
    } catch (error) {
      console.error(`Error fetching price for ${tokenAddress}:`, error);
      throw error;
    }
  }

  clearCache(): void {
    this.priceCache.clear();
    this.priceListCache.clear();
    console.log("🧹 Token price caches cleared (nano-cent precision)");
  }
} 