'use client';

import { useState, useEffect } from 'react';
import { useOrderBook, useRealtimeStream } from '@/hooks/useRealtimeStream';

interface Props {
  symbol?: string;
}

// Mock order book data
const MOCK_ORDERBOOK = {
  bids: [
    [98450.00, 0.5234],
    [98445.00, 1.2340],
    [98440.00, 0.8765],
    [98435.00, 2.1234],
    [98430.00, 0.4321],
    [98425.00, 1.5678],
    [98420.00, 0.9876],
    [98415.00, 3.2100],
    [98410.00, 0.6543],
    [98405.00, 1.8765],
  ] as [number, number][],
  asks: [
    [98455.00, 0.4567],
    [98460.00, 1.1234],
    [98465.00, 0.7890],
    [98470.00, 1.9876],
    [98475.00, 0.3456],
    [98480.00, 2.3456],
    [98485.00, 0.8901],
    [98490.00, 1.4567],
    [98495.00, 0.5678],
    [98500.00, 2.0123],
  ] as [number, number][],
};

const CRYPTO_PAIRS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', name: 'Ethereum' },
  { symbol: 'BNBUSDT', name: 'BNB' },
  { symbol: 'SOLUSDT', name: 'Solana' },
  { symbol: 'XRPUSDT', name: 'XRP' },
];

export function OrderBookPanel({ symbol: initialSymbol }: Props) {
  const [symbol, setSymbol] = useState(initialSymbol || 'BTCUSDT');
  const { orderBook: liveOrderBook, isConnected } = useOrderBook(symbol);
  const { quote } = useRealtimeStream(symbol);
  const [orderBook, setOrderBook] = useState(MOCK_ORDERBOOK);

  useEffect(() => {
    if (liveOrderBook) {
      setOrderBook({
        bids: liveOrderBook.bids,
        asks: liveOrderBook.asks,
      });
    }
  }, [liveOrderBook]);

  // Calculate total volume at each level for depth visualization
  const maxBidVolume = Math.max(...orderBook.bids.map(([, qty]) => qty));
  const maxAskVolume = Math.max(...orderBook.asks.map(([, qty]) => qty));

  // Calculate spread
  const bestBid = orderBook.bids[0]?.[0] || 0;
  const bestAsk = orderBook.asks[0]?.[0] || 0;
  const spread = bestAsk - bestBid;
  const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-terminal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent font-bold">ORDER BOOK</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-terminal-panel border border-terminal-border rounded px-2 py-1 text-sm text-terminal-text"
          >
            {CRYPTO_PAIRS.map((pair) => (
              <option key={pair.symbol} value={pair.symbol}>
                {pair.name} ({pair.symbol})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {quote && (
            <span className="text-terminal-text font-mono">
              ${quote.price.toLocaleString()}
            </span>
          )}
          {isConnected && (
            <span className="flex items-center gap-1 text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Spread Indicator */}
      <div className="px-4 py-2 bg-terminal-panel/50 border-b border-terminal-border flex items-center justify-center gap-4 text-sm">
        <span className="text-terminal-muted">Spread:</span>
        <span className="text-terminal-text font-mono">
          ${spread.toFixed(2)} ({spreadPercent.toFixed(4)}%)
        </span>
      </div>

      {/* Order Book Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bids (Buy Orders) */}
        <div className="flex-1 flex flex-col border-r border-terminal-border">
          <div className="px-4 py-2 bg-green-500/10 border-b border-terminal-border">
            <span className="text-green-500 font-bold text-sm">BIDS (BUY)</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-terminal-bg">
                <tr className="text-terminal-muted text-xs">
                  <th className="text-left py-1 px-2">Price</th>
                  <th className="text-right py-1 px-2">Amount</th>
                  <th className="text-right py-1 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.bids.map(([price, quantity], index) => {
                  const depthPercent = (quantity / maxBidVolume) * 100;
                  const total = orderBook.bids
                    .slice(0, index + 1)
                    .reduce((sum, [, qty]) => sum + qty, 0);

                  return (
                    <tr
                      key={`bid-${index}`}
                      className="hover:bg-green-500/10 cursor-pointer relative"
                    >
                      <td className="text-green-500 font-mono py-1 px-2 relative z-10">
                        {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-terminal-text font-mono text-right py-1 px-2 relative z-10">
                        {quantity.toFixed(4)}
                      </td>
                      <td className="text-terminal-muted font-mono text-right py-1 px-2 relative z-10">
                        {total.toFixed(4)}
                      </td>
                      {/* Depth Bar */}
                      <td
                        className="absolute inset-0 bg-green-500/20 z-0"
                        style={{ width: `${depthPercent}%` }}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 bg-red-500/10 border-b border-terminal-border">
            <span className="text-red-500 font-bold text-sm">ASKS (SELL)</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-terminal-bg">
                <tr className="text-terminal-muted text-xs">
                  <th className="text-left py-1 px-2">Price</th>
                  <th className="text-right py-1 px-2">Amount</th>
                  <th className="text-right py-1 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.asks.map(([price, quantity], index) => {
                  const depthPercent = (quantity / maxAskVolume) * 100;
                  const total = orderBook.asks
                    .slice(0, index + 1)
                    .reduce((sum, [, qty]) => sum + qty, 0);

                  return (
                    <tr
                      key={`ask-${index}`}
                      className="hover:bg-red-500/10 cursor-pointer relative"
                    >
                      <td className="text-red-500 font-mono py-1 px-2 relative z-10">
                        {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-terminal-text font-mono text-right py-1 px-2 relative z-10">
                        {quantity.toFixed(4)}
                      </td>
                      <td className="text-terminal-muted font-mono text-right py-1 px-2 relative z-10">
                        {total.toFixed(4)}
                      </td>
                      {/* Depth Bar */}
                      <td
                        className="absolute inset-0 bg-red-500/20 z-0"
                        style={{ width: `${depthPercent}%` }}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-terminal-border text-xs text-terminal-muted">
        Data from Binance WebSocket (free, real-time)
      </div>
    </div>
  );
}
