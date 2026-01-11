'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// WebSocket base URL - uses relative path through Next.js rewrites, or direct connection
const getWsBase = () => {
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws';

  // Use environment variable if available, otherwise construct from window location
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    return backendUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
  }

  // Fallback: use same host (works in development with docker-compose)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // includes port if present
  return `${protocol}//${host}/ws`;
};

export interface QuoteUpdate {
  type: 'quote' | 'trade' | 'heartbeat';
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  source?: string;
  timestamp?: string;
}

export interface OrderBookUpdate {
  type: 'orderbook';
  ticker: string;
  bids: [number, number][]; // [price, quantity][]
  asks: [number, number][];
  timestamp?: string;
}

export interface SectorUpdate {
  type: 'sectors';
  sectors: {
    name: string;
    ticker: string;
    price: number;
    change: number;
    volume: number;
  }[];
  timestamp?: string;
}

export interface TapeUpdate {
  type: 'tape';
  quotes: {
    symbol: string;
    price: number;
    change: number;
  }[];
  timestamp?: string;
}

type WebSocketMessage = QuoteUpdate | OrderBookUpdate | SectorUpdate | TapeUpdate;

interface UseRealtimeStreamOptions {
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Hook for subscribing to real-time ticker data via WebSocket.
 *
 * @param ticker - The ticker symbol to subscribe to (e.g., 'AAPL', 'BTCUSDT')
 * @param options - Configuration options
 * @returns Object with quote data and connection status
 */
export function useRealtimeStream(
  ticker: string | null,
  options: UseRealtimeStreamOptions = {}
) {
  const {
    enabled = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [quote, setQuote] = useState<QuoteUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!ticker || !enabled) return;

    const url = `${getWsBase()}/stream/${ticker}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as QuoteUpdate;
          if (data.type === 'quote' || data.type === 'trade') {
            setQuote(data);
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnect
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };
    } catch (e) {
      setError(`Failed to connect: ${e}`);
    }
  }, [ticker, enabled, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    quote,
    isConnected,
    error,
    reconnect: connect
  };
}

/**
 * Hook for subscribing to crypto order book via WebSocket.
 */
export function useOrderBook(
  symbol: string | null,
  options: UseRealtimeStreamOptions = {}
) {
  const { enabled = true } = options;

  const [orderBook, setOrderBook] = useState<OrderBookUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!symbol || !enabled) return;

    const url = `${getWsBase()}/orderbook/${symbol}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as OrderBookUpdate;
        if (data.type === 'orderbook') {
          setOrderBook(data);
        }
      } catch (e) {
        console.warn('Failed to parse orderbook message:', e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [symbol, enabled]);

  return { orderBook, isConnected };
}

/**
 * Hook for subscribing to sector performance data.
 */
export function useSectorStream(options: UseRealtimeStreamOptions = {}) {
  const { enabled = true } = options;

  const [sectors, setSectors] = useState<SectorUpdate['sectors']>([]);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const url = `${getWsBase()}/sectors`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SectorUpdate;
        if (data.type === 'sectors') {
          setSectors(data.sectors);
        }
      } catch (e) {
        console.warn('Failed to parse sectors message:', e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled]);

  return { sectors, isConnected };
}

/**
 * Hook for subscribing to ticker tape data.
 */
export function useTickerTape(options: UseRealtimeStreamOptions = {}) {
  const { enabled = true } = options;

  const [quotes, setQuotes] = useState<TapeUpdate['quotes']>([]);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const url = `${getWsBase()}/tape`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as TapeUpdate;
        if (data.type === 'tape') {
          setQuotes(data.quotes);
        }
      } catch (e) {
        console.warn('Failed to parse tape message:', e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled]);

  return { quotes, isConnected };
}
