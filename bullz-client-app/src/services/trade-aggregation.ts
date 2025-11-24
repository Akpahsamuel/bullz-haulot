

import { TradeEvent } from './trade-event-listener';

export interface AssetSentiment {
  symbol: string;
  totalSharesTraded: number;
  uniqueBuyers: Set<string>;
  uniqueBuyersThisWeek: Set<string>;
  sharesBought: number;
  sharesSold: number;
  avgSharesPerUser: number;
  tradingVolume5M: number;
  tradingVolume1H: number;
  tradingVolume24H: number;
  tradingVolume1W: number;
  buyCount: number;
  sellCount: number;
  rank: number;
}

export interface TimeWindow {
  start: number;
  end: number;
}

export class TradeAggregationService {
  private trades: TradeEvent[] = [];
  private weekStartTime: number;
  private readonly MAX_TRADES_TO_KEEP = 100000; // Keep last 100k trades

  constructor(weekStartTime?: number) {
    this.weekStartTime = weekStartTime || this.getCurrentWeekStart();
  }


  addTrade(trade: TradeEvent) {
    this.trades.push(trade);
    console.log(`[TradeAggregation] Added ${trade.tradeType} trade: ${trade.assetSymbol}, quantity: ${trade.quantity}, total trades: ${this.trades.length}`);
    
    if (this.trades.length > this.MAX_TRADES_TO_KEEP) {
      this.trades = this.trades.slice(-this.MAX_TRADES_TO_KEEP);
      console.log(`[TradeAggregation] Trimmed trades to ${this.MAX_TRADES_TO_KEEP} most recent`);
    }
  }

  addTrades(trades: TradeEvent[]) {
    trades.forEach(trade => this.addTrade(trade));
  }

  getAggregatedSentiment(): AssetSentiment[] {
    const now = Date.now();
    const assetMap = new Map<string, AssetSentiment>();

    const window5M = { start: now - 5 * 60 * 1000, end: now };
    const window1H = { start: now - 60 * 60 * 1000, end: now };
    const window24H = { start: now - 24 * 60 * 60 * 1000, end: now };
    const window1W = { start: this.weekStartTime, end: now };

    for (const trade of this.trades) {
      if (!assetMap.has(trade.assetSymbol)) {
        assetMap.set(trade.assetSymbol, {
          symbol: trade.assetSymbol,
          totalSharesTraded: 0,
          uniqueBuyers: new Set(),
          uniqueBuyersThisWeek: new Set(),
          sharesBought: 0,
          sharesSold: 0,
          avgSharesPerUser: 0,
          tradingVolume5M: 0,
          tradingVolume1H: 0,
          tradingVolume24H: 0,
          tradingVolume1W: 0,
          buyCount: 0,
          sellCount: 0,
          rank: 0,
        });
      }

      const sentiment = assetMap.get(trade.assetSymbol)!;

      if (trade.tradeType === 'buy') {
        sentiment.sharesBought += trade.quantity;
        sentiment.buyCount++;
        sentiment.uniqueBuyers.add(trade.buyerAddress);
        
        if (trade.timestamp >= this.weekStartTime) {
          sentiment.uniqueBuyersThisWeek.add(trade.buyerAddress);
        }
      } else {
        sentiment.sharesSold += trade.quantity;
        sentiment.sellCount++;
      }

      sentiment.totalSharesTraded += trade.quantity;

      if (trade.timestamp >= window5M.start) {
        sentiment.tradingVolume5M += trade.amountIn;
      }
      if (trade.timestamp >= window1H.start) {
        sentiment.tradingVolume1H += trade.amountIn;
      }
      if (trade.timestamp >= window24H.start) {
        sentiment.tradingVolume24H += trade.amountIn;
      }
      if (trade.timestamp >= window1W.start) {
        sentiment.tradingVolume1W += trade.amountIn;
      }
    }

    const sentiments: AssetSentiment[] = Array.from(assetMap.values()).map(sentiment => {
      const uniqueBuyerCount = sentiment.uniqueBuyers.size;
      sentiment.avgSharesPerUser = uniqueBuyerCount > 0 
        ? sentiment.sharesBought / uniqueBuyerCount 
        : 0;
      
      return {
        ...sentiment,
        uniqueBuyers: sentiment.uniqueBuyers as any, 
        uniqueBuyersThisWeek: sentiment.uniqueBuyersThisWeek as any,
      };
    });

    sentiments.sort((a, b) => b.sharesBought - a.sharesBought);

    sentiments.forEach((sentiment, index) => {
      sentiment.rank = index + 1;
    });

    return sentiments;
  }

  getAssetSentiment(symbol: string): AssetSentiment | null {
    const sentiments = this.getAggregatedSentiment();
    return sentiments.find(s => s.symbol === symbol) || null;
  }

  getTopAssetsByBuying(limit: number = 10): AssetSentiment[] {
    const sentiments = this.getAggregatedSentiment();
    return sentiments.slice(0, limit);
  }

  getTradesInWindow(window: TimeWindow): TradeEvent[] {
    return this.trades.filter(
      trade => trade.timestamp >= window.start && trade.timestamp <= window.end
    );
  }

  getTradeCount(): number {
    return this.trades.length;
  }

  clearTrades() {
    this.trades = [];
  }

  private getCurrentWeekStart(): number {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(now.setUTCDate(diff));
    monday.setUTCHours(0, 0, 0, 0);
    return monday.getTime();
  }

  updateWeekStart() {
    this.weekStartTime = this.getCurrentWeekStart();
  }

  exportData(): {
    trades: TradeEvent[];
    weekStartTime: number;
    aggregatedSentiment: Omit<AssetSentiment, 'uniqueBuyers' | 'uniqueBuyersThisWeek'>[];
  } {
    const sentiments = this.getAggregatedSentiment();
    
    return {
      trades: this.trades,
      weekStartTime: this.weekStartTime,
      aggregatedSentiment: sentiments.map(s => ({
        symbol: s.symbol,
        totalSharesTraded: s.totalSharesTraded,
        sharesBought: s.sharesBought,
        sharesSold: s.sharesSold,
        avgSharesPerUser: s.avgSharesPerUser,
        tradingVolume5M: s.tradingVolume5M,
        tradingVolume1H: s.tradingVolume1H,
        tradingVolume24H: s.tradingVolume24H,
        tradingVolume1W: s.tradingVolume1W,
        buyCount: s.buyCount,
        sellCount: s.sellCount,
        rank: s.rank,
        uniqueBuyersCount: s.uniqueBuyers.size,
        uniqueBuyersThisWeekCount: s.uniqueBuyersThisWeek.size,
      })) as any,
    };
  }
}

