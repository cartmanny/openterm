'use client';

import { useEffect, useState } from 'react';
import { api, FundamentalsSnapshot } from '@/lib/api';
import { SourceBadge } from '@/components/SourceBadge';

interface Props {
  instrumentId: string;
  ticker: string;
}

export function OverviewPanel({ instrumentId, ticker }: Props) {
  const [data, setData] = useState<FundamentalsSnapshot | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await api.getFundamentals(instrumentId);
        setData(result.data);
        setSource(result.meta.source);
      } catch (err) {
        setError('Failed to load fundamentals');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [instrumentId]);

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Overview</span>
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
          <span className="panel-title">{ticker}</span>
        </div>
        <div className="panel-content text-terminal-muted">
          {error || 'No data available'}
        </div>
      </div>
    );
  }

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

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">{ticker}</span>
        <SourceBadge source={source} />
      </div>
      <div className="panel-content">
        <table className="data-table">
          <tbody>
            <tr>
              <td className="text-terminal-muted">Market Cap</td>
              <td className="text-right">{formatValue(data.valuation.market_cap, 'currency')}</td>
            </tr>
            <tr>
              <td className="text-terminal-muted">P/E (TTM)</td>
              <td className="text-right">{formatValue(data.valuation.pe_trailing)}</td>
            </tr>
            <tr>
              <td className="text-terminal-muted">P/E (Fwd)</td>
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
            <tr>
              <td className="text-terminal-muted">Revenue</td>
              <td className="text-right">{formatValue(data.income.revenue, 'currency')}</td>
            </tr>
            <tr>
              <td className="text-terminal-muted">Profit Margin</td>
              <td className="text-right">{formatValue(data.margins.profit_margin, 'percent')}</td>
            </tr>
            <tr>
              <td className="text-terminal-muted">ROE</td>
              <td className="text-right">{formatValue(data.returns.roe, 'percent')}</td>
            </tr>
            <tr>
              <td className="text-terminal-muted">Div Yield</td>
              <td className="text-right">{formatValue(data.dividend.dividend_yield, 'percent')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
