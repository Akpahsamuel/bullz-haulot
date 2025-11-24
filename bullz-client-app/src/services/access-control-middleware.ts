

import { SuiClient } from '@mysten/sui/client';

export interface AccessControlConfig {
  suiClient: SuiClient;
  packageId: string;
  subscriptionRegistryId: string;
  subscriptionConfigId: string;
  tradingSentimentStateId: string;
  
  // Rate limiting configuration
  rateLimitConfig?: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    windowMs: number; // Time window for rate limiting (default: 60000ms = 1 minute)
  };
  
  // Free tier limitations
  freeTierLimits?: {
    maxRequestsPerDay: number;
    maxDataPoints: number; 
  };
}

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: 'no_subscription' | 'expired' | 'rate_limited' | 'free_tier_limit' | 'error';
  message?: string;
  retryAfter?: number;
  remainingRequests?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number; 
  hourlyCount: number;
  hourlyResetAt: number;
}


export class AccessControlMiddleware {
  private config: Required<AccessControlConfig>;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private freeTierRequestCount: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(config: AccessControlConfig) {
    this.config = {
      rateLimitConfig: {
        maxRequestsPerMinute: config.rateLimitConfig?.maxRequestsPerMinute ?? 60,
        maxRequestsPerHour: config.rateLimitConfig?.maxRequestsPerHour ?? 300,
        windowMs: config.rateLimitConfig?.windowMs ?? 60000, // 1 minute
      },
      freeTierLimits: {
        maxRequestsPerDay: config.freeTierLimits?.maxRequestsPerDay ?? 10,
        maxDataPoints: config.freeTierLimits?.maxDataPoints ?? 5,
      },
      ...config,
    };
  }

  async checkAccess(userAddress: string): Promise<AccessCheckResult> {
    try {
     
      const subscriptionCheck = await this.verifySubscription(userAddress);
      if (!subscriptionCheck.hasAccess) {
        return subscriptionCheck;
      }

      
      const rateLimitCheck = this.checkRateLimit(userAddress);
      if (!rateLimitCheck.hasAccess) {
        return rateLimitCheck;
      }

     
      const freeTierCheck = await this.checkFreeTierLimits(userAddress);
      if (!freeTierCheck.hasAccess) {
        return freeTierCheck;
      }

     
      return {
        hasAccess: true,
      };
    } catch (error) {
      console.error('Error in access control check:', error);
      return {
        hasAccess: false,
        reason: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  
  private async verifySubscription(userAddress: string): Promise<AccessCheckResult> {
    try {
      const result = await this.config.suiClient.devInspectTransactionBlock({
        sender: userAddress,
        transactionBlock: {
          kind: 'moveCall',
          target: `${this.config.packageId}::trading_sentiment_state::verify_access`,
          arguments: [
            { kind: 'Input', index: 0, type: 'object', value: this.config.tradingSentimentStateId },
            { kind: 'Input', index: 1, type: 'object', value: this.config.subscriptionRegistryId },
            { kind: 'Input', index: 2, type: 'object', value: this.config.subscriptionConfigId },
            { kind: 'Input', index: 3, type: 'pure', value: userAddress },
            { kind: 'Input', index: 4, type: 'object', value: '0x6' }, 
          ],
          typeArguments: [],
        } as any,
      });

     
      if (result.results && result.results.length > 0) {
        const returnValue = result.results[0].returnValues?.[0];
        if (returnValue) {
         
          const hasAccessBytes = returnValue[0] as number[];
          const hasAccess = hasAccessBytes[0] === 1;
          
          if (!hasAccess) {
            
            const statusResult = await this.config.suiClient.devInspectTransactionBlock({
              sender: userAddress,
              transactionBlock: {
                kind: 'moveCall',
                target: `${this.config.packageId}::subscription::get_subscription_status`,
                arguments: [
                  { kind: 'Input', index: 0, type: 'object', value: this.config.subscriptionRegistryId },
                  { kind: 'Input', index: 1, type: 'object', value: this.config.subscriptionConfigId },
                  { kind: 'Input', index: 2, type: 'pure', value: userAddress },
                  { kind: 'Input', index: 3, type: 'object', value: '0x6' },
                ],
                typeArguments: [],
              } as any,
            });

            if (statusResult.results && statusResult.results.length > 0) {
              const statusValues = statusResult.results[0].returnValues;
              if (statusValues && statusValues.length >= 3) {
               
                const parseU64 = (bytes: number[]): number => {
                  return Number(BigInt('0x' + Buffer.from(bytes).reverse().toString('hex')));
                };
                
                const endTimeBytes = statusValues[2][0] as number[];
                const endTime = parseU64(endTimeBytes);
                const now = Date.now();
                
                if (endTime > 0 && endTime < now) {
                  return {
                    hasAccess: false,
                    reason: 'expired',
                    message: 'Your subscription has expired. Please renew to continue accessing trading sentiment data.',
                  };
                }
              }
            }

            return {
              hasAccess: false,
              reason: 'no_subscription',
              message: 'You need an active subscription to access trading sentiment data.',
            };
          }

          return { hasAccess: true };
        }
      }

      return {
        hasAccess: false,
        reason: 'no_subscription',
        message: 'Unable to verify subscription status.',
      };
    } catch (error) {
      console.error('Error verifying subscription:', error);
      return {
        hasAccess: false,
        reason: 'error',
        message: error instanceof Error ? error.message : 'Error verifying subscription',
      };
    }
  }


  private checkRateLimit(userAddress: string): AccessCheckResult {
    const now = Date.now();
    const entry = this.rateLimitStore.get(userAddress);

    if (!entry) {
     
      this.rateLimitStore.set(userAddress, {
        count: 1,
        resetAt: now + this.config.rateLimitConfig.windowMs,
        hourlyCount: 1,
        hourlyResetAt: now + 3600000, 
      });
      return { hasAccess: true };
    }

   
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + this.config.rateLimitConfig.windowMs;
    } else {
      entry.count++;
    }

   
    if (now > entry.hourlyResetAt) {
      entry.hourlyCount = 1;
      entry.hourlyResetAt = now + 3600000;
    } else {
      entry.hourlyCount++;
    }

   
    if (entry.count > this.config.rateLimitConfig.maxRequestsPerMinute) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        hasAccess: false,
        reason: 'rate_limited',
        message: `Rate limit exceeded. Maximum ${this.config.rateLimitConfig.maxRequestsPerMinute} requests per minute.`,
        retryAfter,
        remainingRequests: 0,
      };
    }

    // Check hourly limit
    if (entry.hourlyCount > this.config.rateLimitConfig.maxRequestsPerHour) {
      const retryAfter = Math.ceil((entry.hourlyResetAt - now) / 1000);
      return {
        hasAccess: false,
        reason: 'rate_limited',
        message: `Rate limit exceeded. Maximum ${this.config.rateLimitConfig.maxRequestsPerHour} requests per hour.`,
        retryAfter,
        remainingRequests: 0,
      };
    }

    // Update store
    this.rateLimitStore.set(userAddress, entry);

    return {
      hasAccess: true,
      remainingRequests: Math.max(
        0,
        this.config.rateLimitConfig.maxRequestsPerMinute - entry.count
      ),
    };
  }

  
  private async checkFreeTierLimits(_userAddress: string): Promise<AccessCheckResult> {
    try {
      
      return { hasAccess: true };
    } catch (error) {
      console.error('Error checking free tier limits:', error);
      return { hasAccess: true }; 
    }
  }

  
  getRemainingRequests(userAddress: string): {
    perMinute: number;
    perHour: number;
  } {
    const entry = this.rateLimitStore.get(userAddress);
    if (!entry) {
      return {
        perMinute: this.config.rateLimitConfig.maxRequestsPerMinute,
        perHour: this.config.rateLimitConfig.maxRequestsPerHour,
      };
    }

    const now = Date.now();
    const perMinute = now > entry.resetAt 
      ? this.config.rateLimitConfig.maxRequestsPerMinute
      : Math.max(0, this.config.rateLimitConfig.maxRequestsPerMinute - entry.count);
    
    const perHour = now > entry.hourlyResetAt
      ? this.config.rateLimitConfig.maxRequestsPerHour
      : Math.max(0, this.config.rateLimitConfig.maxRequestsPerHour - entry.hourlyCount);

    return { perMinute, perHour };
  }

   
    clearRateLimit(userAddress: string): void {
    this.rateLimitStore.delete(userAddress);
    this.freeTierRequestCount.delete(userAddress);
  }

  
   
  cleanup(): void {
    const now = Date.now();
    for (const [address, entry] of this.rateLimitStore.entries()) {
     
      if (now > entry.hourlyResetAt + 3600000) {
        this.rateLimitStore.delete(address);
      }
    }

   
    for (const [address, entry] of this.freeTierRequestCount.entries()) {
      if (now > entry.resetAt) {
        this.freeTierRequestCount.delete(address);
      }
    }
  }
}

