'use client';

import { useState, useEffect } from 'react';
import { useTickerTape } from '@/hooks/useRealtimeStream';

interface TapeQuote {
  symbol: string;
  price: number;
  change: number;
}

// Mock data for when WebSocket isn't available
const MOCK_QUOTES: TapeQuote[] = [
  { symbol: 'SPY', price: 495.32, change: 0.45 },
  { symbol: 'QQQ', price: 432.18, change: 0.82 },
  { symbol: 'DIA', price: 388.45, change: 0.23 },
  { symbol: 'IWM', price: 198.76, change: -0.35 },
  { symbol: 'AAPL', price: 182.50, change: 1.25 },
  { symbol: 'MSFT', price: 412.30, change: 0.95 },
  { symbol: 'GOOGL', price: 175.80, change: -0.42 },
  { symbol: 'AMZN', price: 185.60, change: 1.15 },
  { symbol: 'META', price: 512.40, change: 2.05 },
  { symbol: 'NVDA', price: 875.20, change: 3.25 },
  { symbol: 'TSLA', price: 248.90, change: -1.85 },
  { symbol: 'BTC-USD', price: 98500, change: 2.45 },
  { symbol: 'ETH-USD', price: 3450, change: 1.85 },
];

interface TickerTapeProps {
  enabled?: boolean;
}

export function TickerTape({ enabled = true }: TickerTapeProps) {
  const { quotes: liveQuotes, isConnected } = useTickerTape({ enabled });
  const [quotes, setQuotes] = useState<TapeQuote[]>(MOCK_QUOTES);

  useEffect(() => {
    if (liveQuotes.length > 0) {
      setQuotes(liveQuotes);
    }
  }, [liveQuotes]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-terminal-bg border-t border-terminal-border overflow-hidden z-50">
      <div className="flex items-center h-full animate-ticker">
        {/* Duplicate quotes for seamless scrolling */}
        {[...quotes, ...quotes].map((quote, index) => (
          <div
            key={`${quote.symbol}-${index}`}
            className="flex items-center px-4 whitespace-nowrap border-r border-terminal-border/50"
          >
            <span className="font-bold text-terminal-text mr-2">
              {quote.symbol}
            </span>
            <span className="text-terminal-muted mr-2">
              ${quote.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
            <span className={`font-medium ${
              quote.change > 0
                ? 'text-green-500'
                : quote.change < 0
                ? 'text-red-500'
                : 'text-terminal-muted'
            }`}>
              {quote.change > 0 ? '▲' : quote.change < 0 ? '▼' : '─'}
              {' '}
              {Math.abs(quote.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* Live indicator */}
      {isConnected && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-500">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
