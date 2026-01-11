'use client';

import { useState, useMemo } from 'react';

interface InsiderTransaction {
  id: string;
  ticker: string;
  companyName: string;
  insiderName: string;
  insiderTitle: string;
  transactionType: 'Buy' | 'Sell' | 'Option Exercise';
  shares: number;
  price: number;
  value: number;
  sharesOwned: number;
  filingDate: string;
  transactionDate: string;
  formType: string;
}

interface Props {
  ticker?: string;
}

// Mock insider trading data
const MOCK_TRANSACTIONS: InsiderTransaction[] = [
  {
    id: '1',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    insiderName: 'Timothy D. Cook',
    insiderTitle: 'Chief Executive Officer',
    transactionType: 'Sell',
    shares: 75000,
    price: 182.45,
    value: 13683750,
    sharesOwned: 3280120,
    filingDate: '2025-01-08',
    transactionDate: '2025-01-06',
    formType: 'Form 4',
  },
  {
    id: '2',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    insiderName: 'Luca Maestri',
    insiderTitle: 'SVP, CFO',
    transactionType: 'Sell',
    shares: 25000,
    price: 181.90,
    value: 4547500,
    sharesOwned: 856432,
    filingDate: '2025-01-07',
    transactionDate: '2025-01-05',
    formType: 'Form 4',
  },
  {
    id: '3',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    insiderName: 'Jensen Huang',
    insiderTitle: 'President and CEO',
    transactionType: 'Sell',
    shares: 120000,
    price: 875.30,
    value: 105036000,
    sharesOwned: 86234567,
    filingDate: '2025-01-09',
    transactionDate: '2025-01-07',
    formType: 'Form 4',
  },
  {
    id: '4',
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    insiderName: 'Satya Nadella',
    insiderTitle: 'Chief Executive Officer',
    transactionType: 'Sell',
    shares: 50000,
    price: 412.15,
    value: 20607500,
    sharesOwned: 778234,
    filingDate: '2025-01-08',
    transactionDate: '2025-01-06',
    formType: 'Form 4',
  },
  {
    id: '5',
    ticker: 'META',
    companyName: 'Meta Platforms, Inc.',
    insiderName: 'Mark Zuckerberg',
    insiderTitle: 'CEO and Chairman',
    transactionType: 'Sell',
    shares: 200000,
    price: 512.40,
    value: 102480000,
    sharesOwned: 350678901,
    filingDate: '2025-01-07',
    transactionDate: '2025-01-05',
    formType: 'Form 4',
  },
  {
    id: '6',
    ticker: 'GOOGL',
    companyName: 'Alphabet Inc.',
    insiderName: 'Sundar Pichai',
    insiderTitle: 'CEO',
    transactionType: 'Sell',
    shares: 35000,
    price: 175.80,
    value: 6153000,
    sharesOwned: 156789,
    filingDate: '2025-01-09',
    transactionDate: '2025-01-07',
    formType: 'Form 4',
  },
  {
    id: '7',
    ticker: 'TSLA',
    companyName: 'Tesla, Inc.',
    insiderName: 'Robyn Denholm',
    insiderTitle: 'Chair of the Board',
    transactionType: 'Buy',
    shares: 10000,
    price: 248.50,
    value: 2485000,
    sharesOwned: 125678,
    filingDate: '2025-01-06',
    transactionDate: '2025-01-04',
    formType: 'Form 4',
  },
  {
    id: '8',
    ticker: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    insiderName: 'Jamie Dimon',
    insiderTitle: 'Chairman and CEO',
    transactionType: 'Buy',
    shares: 25000,
    price: 195.30,
    value: 4882500,
    sharesOwned: 8567890,
    filingDate: '2025-01-08',
    transactionDate: '2025-01-06',
    formType: 'Form 4',
  },
];

// Detect insider buying/selling clusters
function detectClusters(transactions: InsiderTransaction[]): { ticker: string; type: 'BUY_CLUSTER' | 'SELL_CLUSTER'; count: number; signal: string }[] {
  const clusters: { ticker: string; type: 'BUY_CLUSTER' | 'SELL_CLUSTER'; count: number; signal: string }[] = [];
  const byTicker: Record<string, InsiderTransaction[]> = {};

  // Group by ticker
  transactions.forEach(t => {
    if (!byTicker[t.ticker]) byTicker[t.ticker] = [];
    byTicker[t.ticker].push(t);
  });

  // Find clusters (3+ transactions of same type within 7 days)
  Object.entries(byTicker).forEach(([ticker, txns]) => {
    const buys = txns.filter(t => t.transactionType === 'Buy').length;
    const sells = txns.filter(t => t.transactionType === 'Sell').length;

    if (buys >= 2) {
      clusters.push({ ticker, type: 'BUY_CLUSTER', count: buys, signal: 'BULLISH' });
    }
    if (sells >= 3) {
      clusters.push({ ticker, type: 'SELL_CLUSTER', count: sells, signal: 'BEARISH' });
    }
  });

  return clusters;
}

export function InsiderPanel({ ticker }: Props) {
  const [filterTicker, setFilterTicker] = useState(ticker || '');
  const [filterType, setFilterType] = useState<'all' | 'Buy' | 'Sell'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');

  const filteredTransactions = useMemo(() => {
    let txns = [...MOCK_TRANSACTIONS];

    if (filterTicker) {
      txns = txns.filter(t => t.ticker.toLowerCase().includes(filterTicker.toLowerCase()));
    }

    if (filterType !== 'all') {
      txns = txns.filter(t => t.transactionType === filterType);
    }

    txns.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime();
      }
      return b.value - a.value;
    });

    return txns;
  }, [filterTicker, filterType, sortBy]);

  const clusters = useMemo(() => detectClusters(MOCK_TRANSACTIONS), []);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatShares = (shares: number) => {
    if (shares >= 1000000) {
      return `${(shares / 1000000).toFixed(1)}M`;
    }
    if (shares >= 1000) {
      return `${(shares / 1000).toFixed(0)}K`;
    }
    return shares.toString();
  };

  // Calculate summary stats
  const totalBuys = filteredTransactions.filter(t => t.transactionType === 'Buy').reduce((sum, t) => sum + t.value, 0);
  const totalSells = filteredTransactions.filter(t => t.transactionType === 'Sell').reduce((sum, t) => sum + t.value, 0);

  return (
    <div className="flex flex-col h-full bg-terminal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-4">
          <span className="text-terminal-accent font-bold">INSIDER</span>
          <input
            type="text"
            value={filterTicker}
            onChange={(e) => setFilterTicker(e.target.value.toUpperCase())}
            className="bg-terminal-panel border border-terminal-border rounded px-2 py-1 text-sm text-terminal-text w-20 uppercase"
            placeholder="Filter"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-terminal-panel border border-terminal-border rounded px-2 py-1 text-xs text-terminal-text"
          >
            <option value="all">All Types</option>
            <option value="Buy">Buys Only</option>
            <option value="Sell">Sells Only</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-terminal-panel border border-terminal-border rounded px-2 py-1 text-xs text-terminal-text"
          >
            <option value="date">Sort by Date</option>
            <option value="value">Sort by Value</option>
          </select>
        </div>
      </div>

      {/* Cluster Alerts */}
      {clusters.length > 0 && (
        <div className="px-4 py-2 border-b border-terminal-border bg-terminal-panel/50">
          <div className="text-xs text-terminal-muted mb-1">CLUSTER ALERTS</div>
          <div className="flex flex-wrap gap-2">
            {clusters.map((cluster, index) => (
              <div
                key={index}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  cluster.type === 'BUY_CLUSTER'
                    ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                    : 'bg-red-500/20 text-red-500 border border-red-500/50'
                }`}
              >
                {cluster.ticker}: {cluster.count}x {cluster.type === 'BUY_CLUSTER' ? 'BUY' : 'SELL'} ({cluster.signal})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="px-4 py-2 border-b border-terminal-border flex items-center gap-6 text-sm">
        <div>
          <span className="text-terminal-muted">Total Buys: </span>
          <span className="text-green-500 font-medium">{formatValue(totalBuys)}</span>
        </div>
        <div>
          <span className="text-terminal-muted">Total Sells: </span>
          <span className="text-red-500 font-medium">{formatValue(totalSells)}</span>
        </div>
        <div>
          <span className="text-terminal-muted">Net: </span>
          <span className={`font-medium ${totalBuys - totalSells >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatValue(totalBuys - totalSells)}
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-terminal-bg z-10">
            <tr className="border-b border-terminal-border text-xs text-terminal-muted">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Ticker</th>
              <th className="text-left py-2 px-3">Insider</th>
              <th className="text-center py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">Shares</th>
              <th className="text-right py-2 px-3">Price</th>
              <th className="text-right py-2 px-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((txn) => (
              <tr
                key={txn.id}
                className="border-b border-terminal-border/50 hover:bg-terminal-panel/50 cursor-pointer"
              >
                <td className="py-2 px-3 text-terminal-muted font-mono text-xs">
                  {txn.filingDate}
                </td>
                <td className="py-2 px-3">
                  <div className="font-bold text-terminal-text">{txn.ticker}</div>
                  <div className="text-xs text-terminal-muted truncate max-w-[120px]">
                    {txn.companyName}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-terminal-text">{txn.insiderName}</div>
                  <div className="text-xs text-terminal-muted truncate max-w-[150px]">
                    {txn.insiderTitle}
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    txn.transactionType === 'Buy'
                      ? 'bg-green-500/20 text-green-500'
                      : txn.transactionType === 'Sell'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {txn.transactionType}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {formatShares(txn.shares)}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  ${txn.price.toFixed(2)}
                </td>
                <td className={`py-2 px-3 text-right font-mono font-medium ${
                  txn.transactionType === 'Buy' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatValue(txn.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-terminal-border text-xs text-terminal-muted flex justify-between">
        <span>Data from SEC Form 4 filings (EDGAR)</span>
        <span>{filteredTransactions.length} transactions</span>
      </div>
    </div>
  );
}
