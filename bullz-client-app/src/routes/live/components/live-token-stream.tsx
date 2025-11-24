import React, { useState, useEffect } from 'react';
import { useSuiClient } from "@mysten/dapp-kit";
import { CONSTANTS_ID } from "@/constantsId";
import SuiLogo from "@/components/svg/sui.logo";
import { useLiveMatchStream } from "@/lib/hooks/use-live-match-stream";
import { SquadTokenService, SquadToken } from "@/lib/services/squad-token.service";

interface ActiveMatch {
  id: string;
  squad1Id: number;
  squad2Id: number;
  player1: string;
  player2: string;
  totalPrize: number;
  endsAt: number;
}

interface LiveTokenStreamProps {
  activeMatches: ActiveMatch[];
}

const LiveTokenStream: React.FC<LiveTokenStreamProps> = ({ activeMatches }) => {
  const [squadTokenService] = useState(() => new SquadTokenService());
  const [allSquadTokens, setAllSquadTokens] = useState<SquadToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const suiClient = useSuiClient();

  // Get WebSocket URL from environment
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

  // Initialize squad token service and fetch tokens
  useEffect(() => {
    const initializeAndFetchTokens = async () => {
      if (!suiClient || activeMatches.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        
        const network = import.meta.env.VITE_SUI_NETWORK || "testnet";
        const networkConstants = CONSTANTS_ID[network as keyof typeof CONSTANTS_ID];
        
        if (!networkConstants?.squadRegistryId) {
          console.error('❌ Squad registry ID not found for network:', network);
          setIsLoading(false);
          return;
        }

        // Initialize service
        squadTokenService.initialize(suiClient, networkConstants.squadRegistryId);

        // Fetch tokens for all squads in active matches
        const allTokens: SquadToken[] = [];
        for (const match of activeMatches) {
          console.log(`🔍 Fetching tokens for squads ${match.squad1Id} and ${match.squad2Id}`);
          
          const [squad1Tokens, squad2Tokens] = await Promise.all([
            squadTokenService.getSquadTokens(match.squad1Id),
            squadTokenService.getSquadTokens(match.squad2Id)
          ]);

          allTokens.push(...squad1Tokens, ...squad2Tokens);
        }

        // Remove duplicates by address
        const uniqueTokens = allTokens.filter((token, index, arr) => 
          arr.findIndex(t => t.address === token.address) === index
        );

        console.log(`✅ Fetched ${uniqueTokens.length} unique tokens for ${activeMatches.length} matches`);
        setAllSquadTokens(uniqueTokens);
        
      } catch (error) {
        console.error('❌ Error fetching squad tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndFetchTokens();
  }, [suiClient, activeMatches, squadTokenService]);

  // Use real WebSocket connection with the first active match
  // TODO: In production, handle multiple matches separately
  const firstMatch = activeMatches[0];
  const { isConnected, squadPerformance, tokens, error } = useLiveMatchStream({
    matchId: firstMatch?.id || '',
    squadTokens: allSquadTokens,
    wsUrl
  });

  if (activeMatches.length === 0) return null;

  if (isLoading) {
    return (
      <div className="bg-gray-850 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex items-center justify-center py-8">
          <p className="font-offbit text-gray-400">Loading squad tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-850 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-offbit text-white text-[1.125rem] font-[700] leading-[100%] tracking-[0.04em]">
          LIVE TOKEN PERFORMANCE
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`font-offbit text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Connection Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <p className="font-offbit text-red-400 text-[0.875rem]">
            ⚠️ WebSocket Error: {error}
          </p>
        </div>
      )}

      {/* Live Token Prices */}
      {tokens.length > 0 && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <h4 className="font-offbit text-white text-[0.875rem] font-[700] mb-2">LIVE TOKEN PRICES</h4>
          <div className="grid grid-cols-3 gap-4">
            {tokens.slice(0, 6).map((token: any, index: number) => (
              <div key={index} className="text-center">
                <p className="font-offbit text-gray-400 text-[0.75rem]">{token.symbol || 'TOKEN'}</p>
                <p className="font-offbit text-white text-[0.875rem] font-[700]">
                  ${token.currentPrice?.toFixed(4) || '0.0000'}
                </p>
                {token.percentageChange !== undefined && (
                  <p className={`font-offbit text-[0.75rem] ${
                    token.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {token.percentageChange >= 0 ? '+' : ''}{token.percentageChange.toFixed(2)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Performance */}
      <div className="space-y-3">
        {activeMatches.map((match) => {
          // Get performance data for this specific match
          const performance = squadPerformance?.averagePercentageChange || 0;
          const isPositive = performance >= 0;
          
          return (
            <div key={match.id} className="p-3 bg-gray-800 rounded border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-offbit text-white text-[0.875rem] font-[700]">
                    Match #{match.id.slice(0, 8)}...
                  </p>
                  <p className="font-offbit text-gray-400 text-[0.75rem]">
                    Squad {match.squad1Id} vs Squad {match.squad2Id}
                  </p>
                  <p className="font-offbit text-gray-500 text-[0.75rem]">
                    {match.player1.slice(0, 6)}... vs {match.player2.slice(0, 6)}...
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className={`font-offbit text-[1rem] font-[700] ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{performance.toFixed(2)}%
                    </span>
                    <div className="flex items-center gap-1">
                      <SuiLogo className="w-[0.875rem] h-[0.875rem] rounded-full" />
                      <span className="font-offbit text-white text-[0.875rem] font-[700]">
                        {(match.totalPrize / 1000000000).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="font-offbit text-gray-400 text-[0.75rem]">
                    Prize Pool
                  </p>
                </div>
              </div>
              
              {/* Performance Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    isPositive ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.min(Math.abs(performance) * 10, 100)}%`,
                    minWidth: '2px'
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Squad Tokens Debug Info */}
      {allSquadTokens.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <h4 className="font-offbit text-white text-[0.875rem] font-[700] mb-2">
            TRACKED TOKENS ({allSquadTokens.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {allSquadTokens.slice(0, 6).map((token, index) => (
              <div key={index} className="text-center">
                <p className="font-offbit text-gray-400 text-[0.75rem]">{token.symbol}</p>
                <p className="font-offbit text-gray-500 text-[0.625rem]">
                  {token.address.slice(0, 6)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTokenStream; 