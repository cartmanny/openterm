'use client';

import { useEffect, useState } from 'react';
import { api, CorrelationMatrix, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

interface Props {
  tickers: string[];
  period?: string;
}

// Color interpolation for correlation values
function getCorrelationColor(value: number): string {
  // -1 = red, 0 = gray, +1 = green
  if (value >= 0) {
    const intensity = Math.floor(value * 255);
    return `rgb(0, ${intensity}, ${Math.floor(intensity * 0.5)})`;
  } else {
    const intensity = Math.floor(Math.abs(value) * 255);
    return `rgb(${intensity}, ${Math.floor(intensity * 0.3)}, ${Math.floor(intensity * 0.3)})`;
  }
}

function getTextColor(value: number): string {
  return Math.abs(value) > 0.5 ? '#fff' : '#888';
}

export function CorrelationPanel({ tickers, period = '1y' }: Props) {
  const [data, setData] = useState<CorrelationMatrix | null>(null);
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const periods = ['1m', '3m', '6m', '1y', '2y'];

  useEffect(() => {
    async function fetchData() {
      if (tickers.length < 2) {
        setError('Need at least 2 tickers for correlation');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await api.getCorrelation(tickers, selectedPeriod);
        setData(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError('Failed to calculate correlation');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tickers, selectedPeriod]);

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Correlation Matrix</span>
        </div>
        <div className="panel-content">
          <div className="loading">Calculating correlations...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Correlation Matrix</span>
        </div>
        <div className="panel-content text-terminal-red">{error || 'No data'}</div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">Correlation Matrix</span>
          <FreshnessBadge meta={meta} compact />
        </div>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-2 py-0.5 text-xs rounded uppercase ${
                selectedPeriod === p
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-content flex-1 overflow-auto">
        {/* Correlation Matrix */}
        <div className="mb-6">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2"></th>
                {data.tickers.map((ticker) => (
                  <th key={ticker} className="p-2 text-terminal-accent font-medium">
                    {ticker}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tickers.map((ticker, i) => (
                <tr key={ticker}>
                  <td className="p-2 text-terminal-accent font-medium">{ticker}</td>
                  {data.matrix[i].map((value, j) => (
                    <td
                      key={`${i}-${j}`}
                      className="p-2 text-center font-mono"
                      style={{
                        backgroundColor: getCorrelationColor(value),
                        color: getTextColor(value),
                      }}
                    >
                      {value.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Color legend */}
        <div className="flex items-center justify-center gap-2 text-xs mb-4">
          <span className="text-terminal-red">-1.0</span>
          <div className="w-32 h-3 rounded" style={{
            background: 'linear-gradient(to right, rgb(255,76,76), rgb(128,128,128), rgb(0,255,128))'
          }}></div>
          <span className="text-terminal-green">+1.0</span>
        </div>

        {/* Notable Correlations */}
        <div className="mt-4">
          <h3 className="text-terminal-accent font-medium mb-2">Notable Pairs</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Highest positive correlations */}
            {data.pairs
              .filter(p => p.correlation > 0.5)
              .sort((a, b) => b.correlation - a.correlation)
              .slice(0, 3)
              .map((pair) => (
                <div key={`${pair.ticker1}-${pair.ticker2}`} className="flex justify-between">
                  <span>{pair.ticker1}/{pair.ticker2}</span>
                  <span className="text-terminal-green">{pair.correlation.toFixed(2)}</span>
                </div>
              ))
            }
            {/* Highest negative correlations */}
            {data.pairs
              .filter(p => p.correlation < -0.2)
              .sort((a, b) => a.correlation - b.correlation)
              .slice(0, 3)
              .map((pair) => (
                <div key={`${pair.ticker1}-${pair.ticker2}`} className="flex justify-between">
                  <span>{pair.ticker1}/{pair.ticker2}</span>
                  <span className="text-terminal-red">{pair.correlation.toFixed(2)}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Interpretation */}
        <div className="mt-4 p-2 bg-terminal-border/30 rounded text-xs text-terminal-muted">
          <div className="font-medium text-terminal-text mb-1">Interpretation</div>
          <ul className="space-y-1">
            <li><span className="text-terminal-green">+0.7 to +1.0:</span> Strong positive - move together</li>
            <li><span className="text-terminal-green">+0.3 to +0.7:</span> Moderate positive</li>
            <li><span className="text-terminal-muted">-0.3 to +0.3:</span> Weak/no correlation</li>
            <li><span className="text-terminal-red">-0.7 to -0.3:</span> Moderate negative</li>
            <li><span className="text-terminal-red">-1.0 to -0.7:</span> Strong negative - move opposite</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
