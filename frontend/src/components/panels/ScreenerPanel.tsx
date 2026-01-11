'use client';

import { useEffect, useState } from 'react';
import { api, ScreenerResult, ScreenerFilter, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

interface Props {
  template?: string;
}

const TEMPLATES = [
  { id: 'value', name: 'Value', description: 'Low P/E stocks' },
  { id: 'growth', name: 'Growth', description: 'High growth' },
  { id: 'dividend', name: 'Dividend', description: 'High yield' },
  { id: 'quality', name: 'Quality', description: 'High ROE, low debt' },
  { id: 'large_cap', name: 'Large Cap', description: '> $10B' },
  { id: 'small_cap', name: 'Small Cap', description: '$300M-$2B' },
];

function formatValue(value: number | null, format: 'currency' | 'percent' | 'ratio' = 'ratio'): string {
  if (value === null) return '-';
  if (format === 'currency') {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  }
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(2);
}

export function ScreenerPanel({ template: initialTemplate }: Props) {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate || 'value');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await api.runScreenerTemplate(selectedTemplate);
        setResults(result.data.results);
        setTotalCount(result.data.total_count);
        setMeta(result.meta);
      } catch (err) {
        setError('Failed to run screener');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedTemplate]);

  const exportCSV = () => {
    if (results.length === 0) return;

    const headers = ['Ticker', 'Name', 'Sector', 'Market Cap', 'P/E', 'ROE', 'Margin', 'Div Yield', '1Y Return'];
    const rows = results.map(r => [
      r.ticker,
      r.name,
      r.sector || '',
      r.market_cap?.toString() || '',
      r.pe_trailing?.toFixed(2) || '',
      r.roe ? (r.roe * 100).toFixed(1) : '',
      r.profit_margin ? (r.profit_margin * 100).toFixed(1) : '',
      r.dividend_yield ? (r.dividend_yield * 100).toFixed(2) : '',
      r.return_1y?.toFixed(1) || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screener_${selectedTemplate}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Stock Screener</span>
        </div>
        <div className="panel-content">
          <div className="loading">Running screener...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Stock Screener</span>
        </div>
        <div className="panel-content text-terminal-red">{error}</div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">Stock Screener</span>
          <FreshnessBadge meta={meta} compact />
          <span className="text-terminal-muted text-xs">
            ({totalCount} matches)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="px-2 py-0.5 text-xs rounded bg-terminal-border text-terminal-muted hover:bg-terminal-border/80"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-terminal-border bg-terminal-bg/50">
        <div className="flex flex-wrap gap-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`px-2 py-1 text-xs rounded ${
                selectedTemplate === t.id
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
              title={t.description}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-content flex-1 overflow-auto">
        {results.length === 0 ? (
          <div className="text-terminal-muted">No stocks match criteria</div>
        ) : (
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Name</th>
                <th>Sector</th>
                <th className="text-right">Mkt Cap</th>
                <th className="text-right">P/E</th>
                <th className="text-right">ROE</th>
                <th className="text-right">Margin</th>
                <th className="text-right">Div Yld</th>
                <th className="text-right">1Y Ret</th>
              </tr>
            </thead>
            <tbody>
              {results.map((stock) => (
                <tr key={stock.instrument_id} className="hover:bg-terminal-border/30">
                  <td className="text-terminal-accent font-medium">{stock.ticker}</td>
                  <td className="text-terminal-text truncate max-w-[150px]">{stock.name}</td>
                  <td className="text-terminal-muted truncate max-w-[100px]">{stock.sector || '-'}</td>
                  <td className="text-right">{formatValue(stock.market_cap, 'currency')}</td>
                  <td className="text-right">{formatValue(stock.pe_trailing)}</td>
                  <td className="text-right">{formatValue(stock.roe, 'percent')}</td>
                  <td className="text-right">{formatValue(stock.profit_margin, 'percent')}</td>
                  <td className="text-right">{formatValue(stock.dividend_yield, 'percent')}</td>
                  <td className={`text-right ${
                    stock.return_1y && stock.return_1y > 0 ? 'text-terminal-green' : 'text-terminal-red'
                  }`}>
                    {stock.return_1y ? `${stock.return_1y >= 0 ? '+' : ''}${stock.return_1y.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
