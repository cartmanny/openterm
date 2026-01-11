'use client';

import { useState, useEffect } from 'react';
import { useSectorStream } from '@/hooks/useRealtimeStream';

interface SectorData {
  name: string;
  ticker: string;
  price: number;
  change: number;
  volume: number;
}

// Mock data for when WebSocket isn't available
const MOCK_SECTORS: SectorData[] = [
  { name: 'Technology', ticker: 'XLK', price: 210.50, change: 1.25, volume: 15000000 },
  { name: 'Healthcare', ticker: 'XLV', price: 145.30, change: 0.45, volume: 8000000 },
  { name: 'Financials', ticker: 'XLF', price: 42.80, change: -0.32, volume: 12000000 },
  { name: 'Energy', ticker: 'XLE', price: 88.20, change: 2.15, volume: 9000000 },
  { name: 'Consumer Discretionary', ticker: 'XLY', price: 185.60, change: 0.85, volume: 6000000 },
  { name: 'Consumer Staples', ticker: 'XLP', price: 78.40, change: -0.18, volume: 5000000 },
  { name: 'Industrials', ticker: 'XLI', price: 125.90, change: 0.65, volume: 7000000 },
  { name: 'Materials', ticker: 'XLB', price: 92.30, change: 1.10, volume: 4000000 },
  { name: 'Real Estate', ticker: 'XLRE', price: 42.50, change: -0.55, volume: 3000000 },
  { name: 'Utilities', ticker: 'XLU', price: 72.80, change: -0.25, volume: 4500000 },
  { name: 'Communications', ticker: 'XLC', price: 82.40, change: 0.95, volume: 5500000 },
];

export function HeatmapPanel() {
  const { sectors: liveSectors, isConnected } = useSectorStream();
  const [sectors, setSectors] = useState<SectorData[]>(MOCK_SECTORS);

  useEffect(() => {
    if (liveSectors.length > 0) {
      setSectors(liveSectors);
    }
  }, [liveSectors]);

  // Calculate color intensity based on change magnitude
  const getColorStyle = (change: number) => {
    const intensity = Math.min(Math.abs(change) / 3, 1); // Max intensity at 3%
    const opacity = 0.3 + intensity * 0.7;

    if (change > 0) {
      return {
        backgroundColor: `rgba(34, 197, 94, ${opacity})`, // Green
        borderColor: 'rgb(34, 197, 94)',
      };
    } else if (change < 0) {
      return {
        backgroundColor: `rgba(239, 68, 68, ${opacity})`, // Red
        borderColor: 'rgb(239, 68, 68)',
      };
    }
    return {
      backgroundColor: 'rgba(156, 163, 175, 0.3)', // Gray
      borderColor: 'rgb(156, 163, 175)',
    };
  };

  // Sort by absolute change for visual impact
  const sortedSectors = [...sectors].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // Calculate market summary
  const advancing = sectors.filter(s => s.change > 0).length;
  const declining = sectors.filter(s => s.change < 0).length;
  const unchanged = sectors.filter(s => s.change === 0).length;

  return (
    <div className="flex flex-col h-full bg-terminal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent font-bold">HEATMAP</span>
          <span className="text-terminal-muted text-sm">Sector Performance</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-500">{advancing} ▲</span>
          <span className="text-red-500">{declining} ▼</span>
          <span className="text-terminal-muted">{unchanged} ─</span>
          {isConnected && (
            <span className="flex items-center gap-1 text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedSectors.map((sector) => (
            <div
              key={sector.ticker}
              className="p-4 rounded-lg border transition-all hover:scale-105 cursor-pointer"
              style={getColorStyle(sector.change)}
            >
              <div className="font-bold text-white text-sm mb-1 truncate">
                {sector.name}
              </div>
              <div className="text-xs text-white/70 mb-2">
                {sector.ticker}
              </div>
              <div className="text-2xl font-bold text-white">
                {sector.change > 0 ? '+' : ''}{sector.change.toFixed(2)}%
              </div>
              <div className="text-xs text-white/60 mt-1">
                ${sector.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-terminal-border flex items-center justify-center gap-4 text-xs text-terminal-muted">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500" />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-500/30 border border-red-500" />
          <span>Negative</span>
        </div>
        <span className="text-terminal-muted">| Color intensity = magnitude</span>
      </div>
    </div>
  );
}
