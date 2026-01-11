'use client';

import { useEffect, useState, useRef } from 'react';
import { api, MacroSeriesData, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

interface Props {
  seriesId: string;
}

// Common series metadata
const SERIES_INFO: Record<string, { name: string; description: string }> = {
  CPI: { name: 'Consumer Price Index', description: 'Inflation measure' },
  GDP: { name: 'Gross Domestic Product', description: 'Economic output' },
  UNRATE: { name: 'Unemployment Rate', description: 'Jobless rate' },
  FEDFUNDS: { name: 'Federal Funds Rate', description: 'Fed interest rate' },
  DGS10: { name: '10-Year Treasury', description: 'Long-term yield' },
  DGS2: { name: '2-Year Treasury', description: 'Short-term yield' },
  T10Y2Y: { name: '10Y-2Y Spread', description: 'Yield curve slope' },
};

export function MacroPanel({ seriesId }: Props) {
  const [data, setData] = useState<MacroSeriesData | null>(null);
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await api.getMacroSeries(seriesId, 60); // Last 60 observations
        setData(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError(`Failed to load ${seriesId} data`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [seriesId]);

  // Simple sparkline chart
  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const observations = data.observations.filter(o => o.value !== null);
    if (observations.length < 2) return;

    const values = observations.map(o => o.value as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;

    ctx.clearRect(0, 0, width, height);

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;

    values.forEach((value, i) => {
      const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw current value dot
    const lastValue = values[values.length - 1];
    const lastX = width - padding;
    const lastY = height - padding - ((lastValue - min) / range) * (height - 2 * padding);

    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#00ff88';
    ctx.fill();
  }, [data]);

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Macro: {seriesId}</span>
        </div>
        <div className="panel-content">
          <div className="loading">Loading {seriesId}...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Macro: {seriesId}</span>
        </div>
        <div className="panel-content text-terminal-red">{error || 'No data'}</div>
      </div>
    );
  }

  const observations = data.observations.filter(o => o.value !== null);
  const latest = observations[observations.length - 1];
  const previous = observations[observations.length - 2];
  const change = latest && previous ? latest.value! - previous.value! : null;
  const changePercent = change && previous?.value ? (change / previous.value) * 100 : null;

  const seriesInfo = SERIES_INFO[seriesId.toUpperCase()] || { name: data.title, description: '' };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">{seriesInfo.name}</span>
          <FreshnessBadge meta={meta} compact />
        </div>
        <span className="text-terminal-muted text-xs">{data.frequency}</span>
      </div>
      <div className="panel-content flex-1 flex flex-col">
        <div className="mb-4">
          <div className="text-3xl font-bold text-terminal-text">
            {latest?.value?.toFixed(2) || 'N/A'}
            <span className="text-terminal-muted text-sm ml-2">{data.units}</span>
          </div>
          {change !== null && (
            <div className={`text-sm ${change >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}
              {changePercent !== null && ` (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`}
              <span className="text-terminal-muted ml-2">from {previous?.date}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[120px]">
          <canvas ref={canvasRef} width={400} height={150} className="w-full h-full" />
        </div>

        <div className="mt-4">
          <div className="text-terminal-muted text-xs mb-2">Recent Values</div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {observations.slice(-8).map((obs) => (
              <div key={obs.date} className="text-center">
                <div className="text-terminal-text">{obs.value?.toFixed(1)}</div>
                <div className="text-terminal-muted">{obs.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
