import { useEffect, useState, useCallback, useRef } from 'react';

interface TokenData {
  address: string;
  symbol: string;
  amount: number;
}

interface SquadPerformance {
  totalValue: number;
  averagePercentageChange: number;
  tokenCount: number;
  tokenPerformance: Array<{
    symbol: string;
    address: string;
    currentPrice: number;
    percentageChange: number;
    value: number;
    amount: number;
  }>;
}

interface LiveMatchData {
  type: string;
  matchId: string;
  data: {
    tokens: any[];
    squadPerformance: SquadPerformance;
    timestamp: number;
  };
}

interface UseLiveMatchStreamProps {
  matchId: string;
  squadTokens: TokenData[];
  wsUrl?: string;
}

export const useLiveMatchStream = ({ 
  matchId, 
  squadTokens, 
  wsUrl = 'ws://localhost:8080' 
}: UseLiveMatchStreamProps) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchData, setMatchData] = useState<LiveMatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Don't attempt to connect if we've exceeded max attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError(`Max reconnection attempts (${maxReconnectAttempts}) exceeded`);
      return;
    }

    try {
      console.log(`🔄 Connecting to websocket: ${wsUrl} (attempt ${reconnectAttempts.current + 1})`);
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('✅ Connected to live match stream');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0; // Reset attempts on successful connection
        
        // Join the match
        websocket.send(JSON.stringify({
          type: 'JOIN_MATCH',
          matchId: matchId,
          squadTokens: squadTokens
        }));
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMatchData(data);
          
          // Handle different message types
          switch (data.type) {
            case 'JOIN_MATCH_SUCCESS':
              console.log('✅ Successfully joined live match:', data.matchId);
              break;
            case 'INITIAL_PRICES':
              console.log('📊 Received initial prices');
              break;
            case 'LIVE_MATCH_UPDATE':
              console.log('📈 Live match update received');
              break;
            case 'ERROR':
              console.error('❌ Server error:', data.message);
              setError(data.message);
              break;
          }
        } catch (err) {
          console.error('❌ Error parsing message:', err);
          setError('Failed to parse server message');
        }
      };
      
      websocket.onclose = (event) => {
        console.log(`🔌 Disconnected from live match stream (code: ${event.code}, reason: ${event.reason})`);
        setIsConnected(false);
        
        // Only attempt reconnection if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000); // Exponential backoff, max 10s
          console.log(`🔄 Will attempt reconnection in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      websocket.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
        const errorMessage = `WebSocket connection failed (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`;
        setError(errorMessage);
        setIsConnected(false);
      };
      
      setWs(websocket);
    } catch (err) {
      console.error('❌ Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [matchId, squadTokens, wsUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws) {
      ws.close(1000, 'Manual disconnect'); // Normal closure
      setWs(null);
      setIsConnected(false);
    }
    reconnectAttempts.current = 0; // Reset attempts
  }, [ws]);

  // Auto-connect when component mounts or dependencies change
  useEffect(() => {
    if (matchId && squadTokens.length > 0) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [matchId, squadTokens.length > 0 ? squadTokens.map(t => t.address).join(',') : '']); // Stable dependency

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    matchData,
    error,
    connect,
    disconnect,
    squadPerformance: matchData?.data?.squadPerformance,
    tokens: matchData?.data?.tokens || [],
    reconnectAttempts: reconnectAttempts.current,
    maxReconnectAttempts
  };
}; 