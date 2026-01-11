'use client';

import { useEffect, useState, useRef } from 'react';
import { api, YieldCurveData, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

// Maturity order for plotting
const MATURITIES = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'];

export function YieldCurvePanel() {
  const [data, setData] = useState<YieldCurveData | null>(null);
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result = await api.getYieldCurve();
        setData(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError('Failed to load yield curve');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Draw yield curve
  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const yields: { maturity: string; value: number }[] = [];
    MATURITIES.forEach((mat) => {
      const point = data.curve[mat];
      if (point?.yield !== null && point?.yield !== undefined) {
        yields.push({ maturity: mat, value: point.yield });
      }
    });

    if (yields.length < 2) return;

    const values = yields.map(y => y.value);
    const min = Math.min(...values) - 0.5;
    const max = Math.max(...values) + 0.5;
    const range = max - min || 1;

    const width = canvas.width;
    const height = canvas.height;
    const paddingX = 40;
    const paddingY = 30;

    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = paddingY + (i / 4) * (height - 2 * paddingY);
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();

      // Y-axis labels
      const yieldValue = max - (i / 4) * range;
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${yieldValue.toFixed(1)}%`, paddingX - 5, y + 3);
    }

    // Draw curve
    ctx.beginPath();
    ctx.strokeStyle = data.is_inverted ? '#ff4444' : '#00ff88';
    ctx.lineWidth = 2;

    yields.forEach((point, i) => {
      const x = paddingX + (i / (yields.length - 1)) * (width - paddingX - 10);
      const y = paddingY + ((max - point.value) / range) * (height - 2 * paddingY);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points and labels
    yields.forEach((point, i) => {
      const x = paddingX + (i / (yields.length - 1)) * (width - paddingX - 10);
      const y = paddingY + ((max - point.value) / range) * (height - 2 * paddingY);

      // Point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = data.is_inverted ? '#ff4444' : '#00ff88';
      ctx.fill();

      // Maturity label
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(point.maturity, x, height - 10);
    });
  }, [data]);

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">US Treasury Yield Curve</span>
        </div>
        <div className="panel-content">
          <div className="loading">Loading yield curve...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">US Treasury Yield Curve</span>
        </div>
        <div className="panel-content text-terminal-red">{error || 'No data'}</div>
      </div>
    );
  }

  const y2 = data.curve['2Y']?.yield;
  const y10 = data.curve['10Y']?.yield;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">US Treasury Yield Curve</span>
          <FreshnessBadge meta={meta} compact />
          {data.is_inverted && (
            <span className="px-2 py-0.5 text-xs rounded bg-terminal-red text-terminal-bg font-bold">
              INVERTED
            </span>
          )}
        </div>
      </div>
      <div className="panel-content flex-1 flex flex-col">
        {data.is_inverted && (
          <div className="mb-3 p-2 bg-terminal-red/20 border border-terminal-red/50 rounded text-sm">
            Yield curve is inverted (2Y: {y2?.toFixed(2)}% &gt; 10Y: {y10?.toFixed(2)}%).
            Historically a recession indicator.
          </div>
        )}

        <div className="flex-1 min-h-[200px]">
          <canvas ref={canvasRef} width={500} height={250} className="w-full h-full" />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {MATURITIES.map((mat) => {
            const point = data.curve[mat];
            const yieldVal = point?.yield;
            return (
              <div key={mat} className="text-center p-2 bg-terminal-border/30 rounded">
                <div className="text-terminal-muted text-xs">{mat}</div>
                <div className="text-terminal-text font-medium">
                  {yieldVal !== null && yieldVal !== undefined ? `${yieldVal.toFixed(2)}%` : 'N/A'}
                </div>
              </div>
            );
          })}
        </div>

        {data.spread_2y_10y !== null && (
          <div className="mt-3 text-center">
            <span className="text-terminal-muted text-sm">2Y-10Y Spread: </span>
            <span className={`font-medium ${data.spread_2y_10y >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {data.spread_2y_10y >= 0 ? '+' : ''}{(data.spread_2y_10y * 100).toFixed(0)} bps
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
