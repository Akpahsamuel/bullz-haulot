
import { SuiClient, SuiEvent } from '@mysten/sui/client';

export interface TradeEvent {
  assetSymbol: string;
  buyerAddress: string;
  quantity: number;
  timestamp: number;
  tradeType: 'buy' | 'sell';
  amountIn: number;
  amountOut: number;
  feePaid: number;
  price: number;
}

export interface TradeEventListenerConfig {
  packageId: string;
  network: 'testnet' | 'mainnet'; 
  onTrade?: (event: TradeEvent) => void;
  onError?: (error: Error) => void;
}

export class TradeEventListener {
  private client: SuiClient;
  private config: TradeEventListenerConfig;
  private isListening: boolean = false;
  private eventCursor: string | null = null;

  constructor(client: SuiClient, config: TradeEventListenerConfig) {
    this.client = client;
    this.config = config;
  }

  
  async startListening() {
    if (this.isListening) {
      console.warn('Trade event listener is already running');
      return;
    }

    this.isListening = true;
    console.log(`[TradeEventListener] Starting trade event listener...`);
    console.log(`[TradeEventListener] Package ID: ${this.config.packageId}`);
    console.log(`[TradeEventListener] Network: ${this.config.network}`);
    console.log(`[TradeEventListener] Module: trading`);

    // Start listening in the background (don't await - it runs forever)
    this.listenToEvents().catch((error) => {
      this.isListening = false;
      console.error(`[TradeEventListener] Error in listenToEvents:`, error);
      this.config.onError?.(error as Error);
    });
    
    // Return immediately so snapshot creation can proceed
    console.log(`[TradeEventListener] Event listener started in background`);
  }

  stopListening() {
    this.isListening = false;
    console.log('Stopped trade event listener');
  }

  private async listenToEvents() {
    // Use descending order to start from most recent events
    while (this.isListening) {
      try {
        const query: any = {
          MoveModule: {
            package: this.config.packageId,
            module: 'trading',
          },
        };

        const events = await this.client.queryEvents({
          query,
          cursor: this.eventCursor as any,
          limit: 100,
          order: 'descending', // Start from most recent events
        });

        console.log(`[TradeEventListener] Queried ${events.data.length} events from trading module`);
        
        // Process events in reverse order (oldest first) to maintain chronological order
        const sortedEvents = [...events.data].reverse();
        
        for (const event of sortedEvents) {
          console.log(`[TradeEventListener] Event type: ${event.type}, timestamp: ${event.timestampMs}`);
          if (event.type.includes('SwapExecuted')) {
            console.log(`[TradeEventListener] Found SwapExecuted event:`, event.parsedJson);
            const tradeEvent = this.parseSwapEvent(event);
            if (tradeEvent) {
              console.log(`[TradeEventListener] Parsed trade event:`, tradeEvent);
              this.config.onTrade?.(tradeEvent);
            } else {
              console.warn(`[TradeEventListener] Failed to parse SwapExecuted event`);
            }
          }
        }

        if (events.hasNextPage && events.nextCursor) {
          this.eventCursor = events.nextCursor as any;
          console.log(`[TradeEventListener] Has more events, cursor updated`);
        } else {
          // When using descending order, if no more events, we've reached the beginning
          // Reset cursor to null to query for new events from the latest
          if (this.eventCursor) {
            console.log(`[TradeEventListener] Reached beginning of event stream, resetting cursor`);
          }
          this.eventCursor = null;
        }

        // Sleep before next query to avoid rate limiting
        // Shorter sleep when catching up, longer when waiting for new events
        const sleepTime = this.eventCursor ? 1000 : 2000;
        await this.sleep(sleepTime);
      } catch (error) {
        console.error('Error listening to trade events:', error);
        this.config.onError?.(error as Error);
        
        await this.sleep(5000);
      }
    }
  }

  private parseSwapEvent(event: SuiEvent): TradeEvent | null {
    try {
      const parsedJson = event.parsedJson as any;
      
      if (!parsedJson) {
        return null;
      }

      return {
        assetSymbol: parsedJson.asset_symbol || '',
        buyerAddress: parsedJson.user || '',
        quantity: parsedJson.amount_out || 0,
        timestamp: Number(event.timestampMs || Date.now()),
        tradeType: parsedJson.is_buy ? 'buy' : 'sell',
        amountIn: parsedJson.amount_in || 0,
        amountOut: parsedJson.amount_out || 0,
        feePaid: parsedJson.fee_paid || 0,
        price: parsedJson.price || 0,
      };
    } catch (error) {
      console.error('Error parsing swap event:', error);
      return null;
    }
  }

  async getHistoricalTrades(
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<TradeEvent[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveModule: {
          package: this.config.packageId,
          module: 'trading',
        },
      },
      limit,
      order: 'descending',
    });

    const trades: TradeEvent[] = [];

    for (const event of events.data) {
      if (event.type.includes('SwapExecuted')) {
        const tradeEvent = this.parseSwapEvent(event);
        if (tradeEvent) { 
          if (startTime && tradeEvent.timestamp < startTime) continue;
          if (endTime && tradeEvent.timestamp > endTime) continue;
          
          trades.push(tradeEvent);
        }
      }
    }

    return trades;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

