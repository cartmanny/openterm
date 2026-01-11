'use client';

import { useEffect, useState } from 'react';
import { api, FundamentalsSnapshot, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

interface Props {
  instrumentId: string;
  ticker: string;
  compact?: boolean;
}

export function FundamentalsPanel({ instrumentId, ticker, compact = false }: Props) {
  const [data, setData] = useState<FundamentalsSnapshot | null>(null);
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'balance'>('overview');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await api.getFundamentals(instrumentId);
        setData(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError('Failed to load fundamentals');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [instrumentId]);

  const formatValue = (value: number | null, format: 'currency' | 'percent' | 'ratio' = 'ratio') => {
    if (value === null) return 'N/A';
    if (format === 'currency') {
      if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${value.toLocaleString()}`;
    }
    if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
    return value.toFixed(2);
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Fundamentals</span>
        </div>
        <div className="panel-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Fundamentals</span>
        </div>
        <div className="panel-content text-terminal-muted">
          {error || 'No data available'}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Key Metrics</span>
          <FreshnessBadge meta={meta} compact />
        </div>
        <div className="panel-content">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="text-terminal-muted">Mkt Cap</div>
            <div className="text-right">{formatValue(data.valuation.market_cap, 'currency')}</div>
            <div className="text-terminal-muted">P/E</div>
            <div className="text-right">{formatValue(data.valuation.pe_trailing)}</div>
            <div className="text-terminal-muted">ROE</div>
            <div className="text-right">{formatValue(data.returns.roe, 'percent')}</div>
            <div className="text-terminal-muted">Margin</div>
            <div className="text-right">{formatValue(data.margins.profit_margin, 'percent')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">{ticker} - Fundamentals</span>
          <FreshnessBadge meta={meta} compact />
        </div>
        <div className="flex gap-1">
          {(['overview', 'income', 'balance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 text-xs rounded capitalize ${
                activeTab === tab
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-content flex-1 overflow-auto">
        {activeTab === 'overview' && (
          <table className="data-table">
            <tbody>
              <tr><th colSpan={2} className="text-terminal-accent">Valuation</th></tr>
              <tr>
                <td className="text-terminal-muted">Market Cap</td>
                <td className="text-right">{formatValue(data.valuation.market_cap, 'currency')}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">P/E (TTM)</td>
                <td className="text-right">{formatValue(data.valuation.pe_trailing)}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">P/E (Forward)</td>
                <td className="text-right">{formatValue(data.valuation.pe_forward)}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">P/B</td>
                <td className="text-right">{formatValue(data.valuation.price_to_book)}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">EV/EBITDA</td>
                <td className="text-right">{formatValue(data.valuation.ev_to_ebitda)}</td>
              </tr>
              <tr><th colSpan={2} className="text-terminal-accent pt-2">Returns</th></tr>
              <tr>
                <td className="text-terminal-muted">ROE</td>
                <td className="text-right">{formatValue(data.returns.roe, 'percent')}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">ROA</td>
                <td className="text-right">{formatValue(data.returns.roa, 'percent')}</td>
              </tr>
              <tr><th colSpan={2} className="text-terminal-accent pt-2">Margins</th></tr>
              <tr>
                <td className="text-terminal-muted">Gross Margin</td>
                <td className="text-right">{formatValue(data.margins.gross_margin, 'percent')}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">Operating Margin</td>
                <td className="text-right">{formatValue(data.margins.operating_margin, 'percent')}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">Profit Margin</td>
                <td className="text-right">{formatValue(data.margins.profit_margin, 'percent')}</td>
              </tr>
            </tbody>
          </table>
        )}

        {activeTab === 'income' && (
          <table className="data-table">
            <tbody>
              <tr>
                <td className="text-terminal-muted">Revenue</td>
                <td className="text-right">{formatValue(data.income.revenue, 'currency')}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">Gross Profit</td>
                <td className="text-right">{formatValue(data.income.gross_profit, 'currency')}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">Net Income</td>
                <td className="text-right">{formatValue(data.income.net_income, 'currency')}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">EPS</td>
                <td className="text-right">{formatValue(data.income.eps)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {activeTab === 'balance' && (
          <table className="data-table">
            <tbody>
              <tr>
                <td className="text-terminal-muted">Debt/Equity</td>
                <td className="text-right">{formatValue(data.leverage.debt_to_equity)}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">Current Ratio</td>
                <td className="text-right">{formatValue(data.leverage.current_ratio)}</td>
              </tr>
              <tr>
                <td className="text-terminal-muted">Dividend Yield</td>
                <td className="text-right">{formatValue(data.dividend.dividend_yield, 'percent')}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
