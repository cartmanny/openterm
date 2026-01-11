'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts';
import { api, Bar } from '@/lib/api';

interface Props {
  tickers: string[];
  benchmark?: string;
  period?: string;
}

type NormalizationType = 'indexed' | 'percent' | 'absolute';

interface TickerData {
  ticker: string;
  color: string;
  data: LineData<Time>[];
  performance: {
    day: number;
    week: number;
    period: number;
  };
}

const CHART_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#673AB7', // Deep Purple
];

export function ComparePanel({ tickers, benchmark, period = '1Y' }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const [tickerData, setTickerData] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [normalization, setNormalization] = useState<NormalizationType>('indexed');
  const [allTickers, setAllTickers] = useState<string[]>(tickers);
  const [newTicker, setNewTicker] = useState('');

  // Add ticker
  const addTicker = useCallback(() => {
    if (newTicker && !allTickers.includes(newTicker.toUpperCase())) {
      setAllTickers(prev => [...prev, newTicker.toUpperCase()]);
      setNewTicker('');
    }
  }, [newTicker, allTickers]);

  // Remove ticker
  const removeTicker = useCallback((ticker: string) => {
    setAllTickers(prev => prev.filter(t => t !== ticker));
  }, []);

  // Create chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#111111' },
        textColor: '#888888',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      crosshair: {
        vertLine: { color: '#ff6600', width: 1, style: 2 },
        horzLine: { color: '#ff6600', width: 1, style: 2 },
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      seriesRefs.current.clear();
      chart.remove();
    };
  }, []);

  // Fetch and normalize data
  useEffect(() => {
    async function fetchData() {
      if (!chartRef.current || allTickers.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch data for all tickers
        const tickersToFetch = benchmark && !allTickers.includes(benchmark)
          ? [...allTickers, benchmark]
          : allTickers;

        const results = await Promise.all(
          tickersToFetch.map(async (ticker) => {
            try {
              const result = await api.getDailyBars(`instrument-${ticker.toLowerCase()}`, selectedPeriod);
              return { ticker, bars: result.data.bars };
            } catch (e) {
              console.error(`Failed to fetch ${ticker}:`, e);
              return { ticker, bars: [] as Bar[] };
            }
          })
        );

        // Find common date range
        const validResults = results.filter(r => r.bars.length > 0);
        if (validResults.length === 0) {
          setError('Failed to load data for any ticker');
          setLoading(false);
          return;
        }

        // Normalize data based on selected type
        const normalizedData: TickerData[] = validResults.map((result, index) => {
          const bars = result.bars;
          const firstPrice = bars[0]?.close ?? 1;
          const lastPrice = bars[bars.length - 1]?.close ?? firstPrice;

          let chartData: LineData<Time>[];

          switch (normalization) {
            case 'indexed':
              // Index to 100
              chartData = bars.map(bar => ({
                time: bar.date as Time,
                value: (bar.close / firstPrice) * 100
              }));
              break;
            case 'percent':
              // Percentage change
              chartData = bars.map(bar => ({
                time: bar.date as Time,
                value: ((bar.close - firstPrice) / firstPrice) * 100
              }));
              break;
            case 'absolute':
              // Raw prices
              chartData = bars.map(bar => ({
                time: bar.date as Time,
                value: bar.close
              }));
              break;
          }

          // Calculate performance stats
          const dayAgoIdx = Math.max(0, bars.length - 2);
          const weekAgoIdx = Math.max(0, bars.length - 6);

          return {
            ticker: result.ticker,
            color: result.ticker === benchmark ? '#666666' : CHART_COLORS[index % CHART_COLORS.length],
            data: chartData,
            performance: {
              day: ((lastPrice - bars[dayAgoIdx]?.close) / bars[dayAgoIdx]?.close) * 100 || 0,
              week: ((lastPrice - bars[weekAgoIdx]?.close) / bars[weekAgoIdx]?.close) * 100 || 0,
              period: ((lastPrice - firstPrice) / firstPrice) * 100
            }
          };
        });

        setTickerData(normalizedData);

        // Update chart series
        // Remove old series
        seriesRefs.current.forEach((series, ticker) => {
          if (!validResults.find(r => r.ticker === ticker)) {
            chartRef.current?.removeSeries(series);
            seriesRefs.current.delete(ticker);
          }
        });

        // Add/update series
        normalizedData.forEach((data) => {
          let series = seriesRefs.current.get(data.ticker);

          if (!series) {
            series = chartRef.current!.addLineSeries({
              color: data.color,
              lineWidth: data.ticker === benchmark ? 1 : 2,
              lineStyle: data.ticker === benchmark ? 2 : 0,
            });
            seriesRefs.current.set(data.ticker, series);
          } else {
            series.applyOptions({
              color: data.color,
              lineWidth: data.ticker === benchmark ? 1 : 2,
              lineStyle: data.ticker === benchmark ? 2 : 0,
            });
          }

          series.setData(data.data);
        });

        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        setError('Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [allTickers, benchmark, selectedPeriod, normalization]);

  const periods = ['1M', '3M', '6M', '1Y', '2Y', '5Y'];

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="panel-title">Compare Securities</span>
        </div>
        <div className="flex gap-1 items-center">
          {/* Period selector */}
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-2 py-0.5 text-xs rounded ${
                selectedPeriod === p
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
            >
              {p}
            </button>
          ))}
          <span className="w-px h-4 bg-terminal-border mx-1" />
          {/* Normalization toggle */}
          <select
            value={normalization}
            onChange={(e) => setNormalization(e.target.value as NormalizationType)}
            className="px-2 py-0.5 text-xs rounded bg-terminal-border text-terminal-muted"
          >
            <option value="indexed">Indexed to 100</option>
            <option value="percent">% Change</option>
            <option value="absolute">Absolute Price</option>
          </select>
        </div>
      </div>

      {/* Ticker chips */}
      <div className="px-3 py-2 border-b border-terminal-border flex gap-2 flex-wrap items-center">
        {tickerData.map((data) => (
          <div
            key={data.ticker}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-terminal-border/50"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="text-terminal-text font-medium">{data.ticker}</span>
            {allTickers.includes(data.ticker) && allTickers.length > 1 && (
              <button
                onClick={() => removeTicker(data.ticker)}
                className="text-terminal-muted hover:text-terminal-red ml-1"
              >
                x
              </button>
            )}
          </div>
        ))}
        {/* Add ticker input */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addTicker()}
            placeholder="Add..."
            className="w-16 px-2 py-0.5 text-xs bg-terminal-bg border border-terminal-border rounded text-terminal-text placeholder:text-terminal-muted"
          />
          <button
            onClick={addTicker}
            className="px-2 py-0.5 text-xs rounded bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/90"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Chart */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-terminal-panel/80 z-10">
              <span className="text-terminal-muted">Loading...</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-terminal-red">{error}</span>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Legend with performance */}
        <div className="w-48 border-l border-terminal-border p-3 overflow-y-auto">
          <div className="text-xs text-terminal-muted uppercase mb-2">Performance</div>
          <div className="space-y-3">
            {tickerData.map((data) => (
              <div key={data.ticker} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: data.color }}
                  />
                  <span className="font-medium text-terminal-text">{data.ticker}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs pl-5">
                  <div>
                    <span className="text-terminal-muted">1D</span>
                    <span className={`block ${data.performance.day >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {formatPercent(data.performance.day)}
                    </span>
                  </div>
                  <div>
                    <span className="text-terminal-muted">1W</span>
                    <span className={`block ${data.performance.week >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {formatPercent(data.performance.week)}
                    </span>
                  </div>
                  <div>
                    <span className="text-terminal-muted">{selectedPeriod}</span>
                    <span className={`block ${data.performance.period >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {formatPercent(data.performance.period)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
