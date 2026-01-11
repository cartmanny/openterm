'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time
} from 'lightweight-charts';
import { api, Bar, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { IndicatorPicker } from '@/components/chart/IndicatorPicker';
import {
  IndicatorType,
  IndicatorParams,
  IndicatorInstance,
  getIndicatorDefinition,
  INDICATOR_COLORS
} from '@/types/indicators';
import {
  calculateIndicator,
  generateIndicatorId,
  formatIndicatorLabel
} from '@/lib/indicators';
import { DrawingToolbar } from '@/components/chart/DrawingToolbar';
import {
  Drawing,
  DrawingMode,
  HorizontalLine,
  TextAnnotation,
  DRAWING_COLORS,
  generateDrawingId,
  loadDrawings,
  saveDrawing,
  deleteDrawing as deleteDrawingFromStorage,
  clearDrawings as clearDrawingsFromStorage
} from '@/types/drawings';
import { IPriceLine } from 'lightweight-charts';

interface Props {
  instrumentId: string;
  ticker: string;
  period?: string;
}

type AnySeries = ISeriesApi<'Line'> | ISeriesApi<'Histogram'>;

interface IndicatorSeries {
  instance: IndicatorInstance;
  series: AnySeries | AnySeries[];
}

export function ChartPanel({ instrumentId, ticker, period = '1Y' }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const subplotContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const subplotChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, IndicatorSeries>>(new Map());

  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [bars, setBars] = useState<Bar[]>([]);
  const [indicators, setIndicators] = useState<IndicatorInstance[]>([]);
  const [showIndicatorPicker, setShowIndicatorPicker] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  // Drawing tools state
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [drawingColor, setDrawingColor] = useState(DRAWING_COLORS[0]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());

  // Create main chart
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
      height: 280,
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

    // Add candlestick series
    const series = chart.addCandlestickSeries({
      upColor: '#00cc66',
      downColor: '#ff4444',
      borderUpColor: '#00cc66',
      borderDownColor: '#ff4444',
      wickUpColor: '#00cc66',
      wickDownColor: '#ff4444',
    });

    seriesRef.current = series;

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Create subplot chart for RSI, MACD, etc.
  useEffect(() => {
    const hasSubplotIndicators = indicators.some(
      (ind) => getIndicatorDefinition(ind.type)?.placement === 'subplot'
    );

    if (hasSubplotIndicators && !subplotChartRef.current && subplotContainerRef.current) {
      const subplotChart = createChart(subplotContainerRef.current, {
        layout: {
          background: { color: '#111111' },
          textColor: '#888888',
        },
        grid: {
          vertLines: { color: '#2a2a2a' },
          horzLines: { color: '#2a2a2a' },
        },
        width: subplotContainerRef.current.clientWidth,
        height: 120,
        crosshair: {
          vertLine: { color: '#ff6600', width: 1, style: 2 },
          horzLine: { color: '#ff6600', width: 1, style: 2 },
        },
        timeScale: {
          borderColor: '#2a2a2a',
          timeVisible: false,
          visible: false,
        },
        rightPriceScale: {
          borderColor: '#2a2a2a',
        },
      });

      subplotChartRef.current = subplotChart;

      // Sync time scales
      if (chartRef.current) {
        chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
          if (range) {
            subplotChart.timeScale().setVisibleRange(range);
          }
        });
      }

      const handleResize = () => {
        if (subplotContainerRef.current) {
          subplotChart.applyOptions({ width: subplotContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);
    } else if (!hasSubplotIndicators && subplotChartRef.current) {
      subplotChartRef.current.remove();
      subplotChartRef.current = null;
    }
  }, [indicators]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!seriesRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const result = await api.getDailyBars(instrumentId, selectedPeriod);
        setMeta(result.meta);
        setBars(result.data.bars);

        // Convert to chart format
        const chartData: CandlestickData[] = result.data.bars.map((bar: Bar) => ({
          time: bar.date as Time,
          open: bar.open ?? bar.close,
          high: bar.high ?? bar.close,
          low: bar.low ?? bar.close,
          close: bar.close,
        }));

        seriesRef.current.setData(chartData);

        // Volume data
        if (volumeSeriesRef.current && showVolume) {
          const volumeData: HistogramData[] = result.data.bars.map((bar: Bar) => ({
            time: bar.date as Time,
            value: bar.volume ?? 0,
            color: (bar.close >= (bar.open ?? bar.close)) ? '#00cc6640' : '#ff444440',
          }));
          volumeSeriesRef.current.setData(volumeData);
        }

        // Fit content
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        setError('Failed to load price data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [instrumentId, selectedPeriod, showVolume]);

  // Update indicators when bars or indicators change
  useEffect(() => {
    if (bars.length === 0 || !chartRef.current) return;

    // Remove old series
    indicatorSeriesRef.current.forEach((indSeries, id) => {
      if (!indicators.find((ind) => ind.id === id)) {
        const def = getIndicatorDefinition(indSeries.instance.type);
        const chart = def?.placement === 'overlay' ? chartRef.current : subplotChartRef.current;
        if (chart) {
          if (Array.isArray(indSeries.series)) {
            indSeries.series.forEach((s) => chart.removeSeries(s));
          } else {
            chart.removeSeries(indSeries.series);
          }
        }
        indicatorSeriesRef.current.delete(id);
      }
    });

    // Add/update indicators
    indicators.forEach((ind) => {
      if (!ind.visible) {
        // Hide series if not visible
        const existing = indicatorSeriesRef.current.get(ind.id);
        if (existing) {
          const seriesArray = Array.isArray(existing.series) ? existing.series : [existing.series];
          seriesArray.forEach((s) => s.applyOptions({ visible: false }));
        }
        return;
      }

      const data = calculateIndicator(ind.type, bars, ind.params);
      if (data.length === 0) return;

      const def = getIndicatorDefinition(ind.type);
      if (!def) return;

      const existing = indicatorSeriesRef.current.get(ind.id);

      if (def.placement === 'overlay') {
        // Overlay indicators on main chart
        if (ind.type === 'BB') {
          // Bollinger Bands - 3 lines
          if (existing && Array.isArray(existing.series)) {
            const [upper, middle, lower] = existing.series;
            (upper as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.upper! })));
            (middle as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.middle! })));
            (lower as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.lower! })));
            upper.applyOptions({ visible: true });
            middle.applyOptions({ visible: true });
            lower.applyOptions({ visible: true });
          } else {
            const upperSeries = chartRef.current!.addLineSeries({
              color: ind.color,
              lineWidth: 1,
              lineStyle: 2,
            });
            const middleSeries = chartRef.current!.addLineSeries({
              color: ind.color,
              lineWidth: 1,
            });
            const lowerSeries = chartRef.current!.addLineSeries({
              color: ind.color,
              lineWidth: 1,
              lineStyle: 2,
            });

            upperSeries.setData(data.map((d) => ({ time: d.time as Time, value: d.upper! })));
            middleSeries.setData(data.map((d) => ({ time: d.time as Time, value: d.middle! })));
            lowerSeries.setData(data.map((d) => ({ time: d.time as Time, value: d.lower! })));

            indicatorSeriesRef.current.set(ind.id, {
              instance: ind,
              series: [upperSeries, middleSeries, lowerSeries],
            });
          }
        } else {
          // Single line indicator
          if (existing && !Array.isArray(existing.series)) {
            (existing.series as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.value })));
            existing.series.applyOptions({ visible: true });
          } else {
            const series = chartRef.current!.addLineSeries({
              color: ind.color,
              lineWidth: 2,
            });
            series.setData(data.map((d) => ({ time: d.time as Time, value: d.value })));
            indicatorSeriesRef.current.set(ind.id, { instance: ind, series });
          }
        }
      } else if (def.placement === 'subplot' && subplotChartRef.current) {
        // Subplot indicators
        if (ind.type === 'MACD') {
          // MACD - line + signal + histogram
          if (existing && Array.isArray(existing.series)) {
            const [macdLine, signalLine, histogram] = existing.series;
            (macdLine as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.value })));
            (signalLine as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.signal! })));
            (histogram as ISeriesApi<'Histogram'>).setData(
              data.map((d) => ({
                time: d.time as Time,
                value: d.histogram!,
                color: d.histogram! >= 0 ? '#00cc6680' : '#ff444480',
              }))
            );
          } else {
            const macdLine = subplotChartRef.current.addLineSeries({
              color: '#2196F3',
              lineWidth: 2,
            });
            const signalLine = subplotChartRef.current.addLineSeries({
              color: '#FF9800',
              lineWidth: 1,
            });
            const histogram = subplotChartRef.current.addHistogramSeries({
              color: '#607D8B',
            });

            macdLine.setData(data.map((d) => ({ time: d.time as Time, value: d.value })));
            signalLine.setData(data.map((d) => ({ time: d.time as Time, value: d.signal! })));
            histogram.setData(
              data.map((d) => ({
                time: d.time as Time,
                value: d.histogram!,
                color: d.histogram! >= 0 ? '#00cc6680' : '#ff444480',
              }))
            );

            indicatorSeriesRef.current.set(ind.id, {
              instance: ind,
              series: [macdLine, signalLine, histogram],
            });
          }
        } else if (ind.type === 'Stochastic') {
          // Stochastic - K and D lines
          if (existing && Array.isArray(existing.series)) {
            const [kLine, dLine] = existing.series;
            (kLine as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.k! })));
            (dLine as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.d! })));
          } else {
            const kLine = subplotChartRef.current.addLineSeries({
              color: ind.color,
              lineWidth: 2,
            });
            const dLine = subplotChartRef.current.addLineSeries({
              color: '#FF9800',
              lineWidth: 1,
              lineStyle: 2,
            });

            kLine.setData(data.map((d) => ({ time: d.time as Time, value: d.k! })));
            dLine.setData(data.map((d) => ({ time: d.time as Time, value: d.d! })));

            indicatorSeriesRef.current.set(ind.id, {
              instance: ind,
              series: [kLine, dLine],
            });
          }
        } else {
          // RSI, ATR, ADX - single line
          if (existing && !Array.isArray(existing.series)) {
            (existing.series as ISeriesApi<'Line'>).setData(data.map((d) => ({ time: d.time as Time, value: d.value })));
          } else {
            const series = subplotChartRef.current.addLineSeries({
              color: ind.color,
              lineWidth: 2,
            });
            series.setData(data.map((d) => ({ time: d.time as Time, value: d.value })));

            // Add reference lines for RSI
            if (ind.type === 'RSI') {
              series.createPriceLine({
                price: 70,
                color: '#ff444480',
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: '',
              });
              series.createPriceLine({
                price: 30,
                color: '#00cc6680',
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: true,
                title: '',
              });
            }

            indicatorSeriesRef.current.set(ind.id, { instance: ind, series });
          }
        }
      }
    });
  }, [bars, indicators]);

  const handleAddIndicator = useCallback(
    (type: IndicatorType, params: IndicatorParams, color: string) => {
      const newIndicator: IndicatorInstance = {
        id: generateIndicatorId(),
        type,
        params,
        color,
        visible: true,
      };
      setIndicators((prev) => [...prev, newIndicator]);
    },
    []
  );

  const removeIndicator = useCallback((id: string) => {
    setIndicators((prev) => prev.filter((ind) => ind.id !== id));
  }, []);

  const toggleIndicator = useCallback((id: string) => {
    setIndicators((prev) =>
      prev.map((ind) => (ind.id === id ? { ...ind, visible: !ind.visible } : ind))
    );
  }, []);

  // Load drawings when ticker changes
  useEffect(() => {
    const savedDrawings = loadDrawings(ticker);
    setDrawings(savedDrawings);
  }, [ticker]);

  // Render price lines for horizontal line drawings
  useEffect(() => {
    if (!seriesRef.current) return;

    // Remove old price lines
    priceLinesRef.current.forEach((line, id) => {
      if (!drawings.find(d => d.id === id && d.type === 'horizontal_line')) {
        seriesRef.current?.removePriceLine(line);
        priceLinesRef.current.delete(id);
      }
    });

    // Add new price lines
    drawings
      .filter((d): d is HorizontalLine => d.type === 'horizontal_line' && d.visible)
      .forEach((d) => {
        if (!priceLinesRef.current.has(d.id)) {
          const priceLine = seriesRef.current!.createPriceLine({
            price: d.price,
            color: d.color,
            lineWidth: 1,
            lineStyle: 0, // Solid
            axisLabelVisible: true,
            title: d.label || '',
          });
          priceLinesRef.current.set(d.id, priceLine);
        }
      });
  }, [drawings]);

  // Handle chart click for drawing
  const handleChartClick = useCallback((price: number) => {
    if (drawingMode === 'horizontal_line') {
      const drawing: HorizontalLine = {
        id: generateDrawingId(),
        type: 'horizontal_line',
        ticker,
        createdAt: Date.now(),
        color: drawingColor,
        visible: true,
        price,
        label: `$${price.toFixed(2)}`,
      };
      saveDrawing(drawing);
      setDrawings(prev => [...prev, drawing]);
      setDrawingMode('none');
    } else if (drawingMode === 'text') {
      const text = prompt('Enter annotation text:');
      if (text) {
        const drawing: TextAnnotation = {
          id: generateDrawingId(),
          type: 'text',
          ticker,
          createdAt: Date.now(),
          color: drawingColor,
          visible: true,
          time: Date.now(),
          price,
          text,
        };
        saveDrawing(drawing);
        setDrawings(prev => [...prev, drawing]);
      }
      setDrawingMode('none');
    }
  }, [drawingMode, drawingColor, ticker]);

  // Delete a drawing
  const deleteDrawing = useCallback((id: string) => {
    deleteDrawingFromStorage(id);
    setDrawings(prev => prev.filter(d => d.id !== id));
  }, []);

  // Clear all drawings for this ticker
  const clearAllDrawings = useCallback(() => {
    clearDrawingsFromStorage(ticker);
    setDrawings([]);
  }, [ticker]);

  // Subscribe to chart crosshair move for drawing
  useEffect(() => {
    if (!chartRef.current || drawingMode === 'none') return;

    const chart = chartRef.current;

    const handleClick = (param: any) => {
      if (param.point && param.seriesData.size > 0) {
        // Get the price from the first series
        const priceData = param.seriesData.get(seriesRef.current);
        if (priceData) {
          const price = priceData.close || priceData.value;
          if (price) {
            handleChartClick(price);
          }
        }
      }
    };

    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [drawingMode, handleChartClick]);

  // Escape key to cancel drawing mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawingMode !== 'none') {
        setDrawingMode('none');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingMode]);

  const periods = ['1M', '3M', '6M', '1Y', '2Y', '5Y'];

  const hasSubplotIndicators = indicators.some(
    (ind) => ind.visible && getIndicatorDefinition(ind.type)?.placement === 'subplot'
  );

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="panel-title">{ticker} - Price Chart</span>
          <FreshnessBadge meta={meta} compact />
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
          {/* Add indicator button */}
          <button
            onClick={() => setShowIndicatorPicker(true)}
            className="px-2 py-0.5 text-xs rounded bg-terminal-border text-terminal-muted hover:bg-terminal-border/80 flex items-center gap-1"
          >
            <span>+</span> Indicator
          </button>
          {/* Drawing tools toggle */}
          <button
            onClick={() => setShowDrawingTools(!showDrawingTools)}
            className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
              showDrawingTools
                ? 'bg-terminal-accent text-terminal-bg'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            Draw
          </button>
        </div>
      </div>

      {/* Drawing toolbar */}
      {showDrawingTools && (
        <DrawingToolbar
          drawingMode={drawingMode}
          onModeChange={setDrawingMode}
          selectedColor={drawingColor}
          onColorChange={setDrawingColor}
          drawings={drawings}
          onClearDrawings={clearAllDrawings}
          onDeleteDrawing={deleteDrawing}
        />
      )}

      {/* Active indicators bar */}
      {indicators.length > 0 && (
        <div className="px-3 py-1.5 border-b border-terminal-border flex gap-1.5 flex-wrap">
          {indicators.map((ind) => (
            <div
              key={ind.id}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                ind.visible ? 'bg-terminal-border/50' : 'bg-terminal-border/20 opacity-50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ind.color }}
              />
              <button
                onClick={() => toggleIndicator(ind.id)}
                className="text-terminal-text hover:text-terminal-accent"
              >
                {formatIndicatorLabel(ind.type, ind.params)}
              </button>
              <button
                onClick={() => removeIndicator(ind.id)}
                className="text-terminal-muted hover:text-terminal-red ml-1"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="panel-content flex-1 relative flex flex-col">
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

        {/* Main chart */}
        <div
          ref={chartContainerRef}
          className="w-full min-h-[280px]"
          style={{ flex: hasSubplotIndicators ? '2' : '1' }}
        />

        {/* Subplot chart for RSI, MACD, etc. */}
        {hasSubplotIndicators && (
          <div
            ref={subplotContainerRef}
            className="w-full border-t border-terminal-border"
            style={{ height: '120px' }}
          />
        )}
      </div>

      {/* Indicator picker modal */}
      <IndicatorPicker
        isOpen={showIndicatorPicker}
        onClose={() => setShowIndicatorPicker(false)}
        onAddIndicator={handleAddIndicator}
        existingCount={indicators.length}
      />
    </div>
  );
}
