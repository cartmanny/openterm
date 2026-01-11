'use client';

import { useState, useEffect } from 'react';
import { usePanel } from '@/context/PanelContext';
import { api } from '@/lib/api';

interface EarningsEvent {
  id: string;
  ticker: string;
  companyName: string;
  date: string;
  time: 'BMO' | 'AMC' | 'DURING'; // Before Market Open, After Market Close, During Market
  estimatedEps: number | null;
  actualEps: number | null;
  estimatedRevenue: number | null;
  actualRevenue: number | null;
  surprise?: number; // EPS surprise percentage
  marketCap?: number;
  fiscalQuarter: string;
  isWatchlisted?: boolean;
}

interface Props {
  filter?: 'today' | 'week' | 'watchlist';
}

// Mock earnings calendar data (in production, fetch from Finnhub or similar)
const MOCK_EARNINGS: EarningsEvent[] = [
  {
    id: '1',
    ticker: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    date: '2025-01-15',
    time: 'BMO',
    estimatedEps: 4.02,
    actualEps: null,
    estimatedRevenue: 41.5,
    actualRevenue: null,
    marketCap: 635,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '2',
    ticker: 'WFC',
    companyName: 'Wells Fargo & Company',
    date: '2025-01-15',
    time: 'BMO',
    estimatedEps: 1.35,
    actualEps: null,
    estimatedRevenue: 20.4,
    actualRevenue: null,
    marketCap: 235,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '3',
    ticker: 'BLK',
    companyName: 'BlackRock, Inc.',
    date: '2025-01-15',
    time: 'BMO',
    estimatedEps: 11.28,
    actualEps: null,
    estimatedRevenue: 5.3,
    actualRevenue: null,
    marketCap: 150,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '4',
    ticker: 'C',
    companyName: 'Citigroup Inc.',
    date: '2025-01-15',
    time: 'BMO',
    estimatedEps: 1.22,
    actualEps: null,
    estimatedRevenue: 19.5,
    actualRevenue: null,
    marketCap: 128,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '5',
    ticker: 'GS',
    companyName: 'Goldman Sachs Group, Inc.',
    date: '2025-01-15',
    time: 'BMO',
    estimatedEps: 8.18,
    actualEps: null,
    estimatedRevenue: 12.1,
    actualRevenue: null,
    marketCap: 182,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '6',
    ticker: 'MS',
    companyName: 'Morgan Stanley',
    date: '2025-01-16',
    time: 'BMO',
    estimatedEps: 1.66,
    actualEps: null,
    estimatedRevenue: 14.5,
    actualRevenue: null,
    marketCap: 195,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '7',
    ticker: 'BAC',
    companyName: 'Bank of America Corporation',
    date: '2025-01-16',
    time: 'BMO',
    estimatedEps: 0.77,
    actualEps: null,
    estimatedRevenue: 25.0,
    actualRevenue: null,
    marketCap: 350,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '8',
    ticker: 'UNH',
    companyName: 'UnitedHealth Group Incorporated',
    date: '2025-01-16',
    time: 'BMO',
    estimatedEps: 6.72,
    actualEps: null,
    estimatedRevenue: 100.5,
    actualRevenue: null,
    marketCap: 480,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '9',
    ticker: 'TSM',
    companyName: 'Taiwan Semiconductor Manufacturing',
    date: '2025-01-16',
    time: 'BMO',
    estimatedEps: 2.16,
    actualEps: null,
    estimatedRevenue: 26.2,
    actualRevenue: null,
    marketCap: 980,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '10',
    ticker: 'NFLX',
    companyName: 'Netflix, Inc.',
    date: '2025-01-21',
    time: 'AMC',
    estimatedEps: 4.18,
    actualEps: null,
    estimatedRevenue: 10.1,
    actualRevenue: null,
    marketCap: 380,
    fiscalQuarter: 'Q4 2024',
    isWatchlisted: true
  },
  {
    id: '11',
    ticker: 'JNJ',
    companyName: 'Johnson & Johnson',
    date: '2025-01-22',
    time: 'BMO',
    estimatedEps: 2.27,
    actualEps: null,
    estimatedRevenue: 22.4,
    actualRevenue: null,
    marketCap: 370,
    fiscalQuarter: 'Q4 2024'
  },
  {
    id: '12',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    date: '2025-01-10',
    time: 'AMC',
    estimatedEps: 2.35,
    actualEps: 2.40,
    estimatedRevenue: 118.0,
    actualRevenue: 124.3,
    surprise: 2.1,
    marketCap: 3500,
    fiscalQuarter: 'Q1 2025',
    isWatchlisted: true
  },
  {
    id: '13',
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    date: '2025-01-28',
    time: 'AMC',
    estimatedEps: 3.12,
    actualEps: null,
    estimatedRevenue: 68.5,
    actualRevenue: null,
    marketCap: 3200,
    fiscalQuarter: 'Q2 2025',
    isWatchlisted: true
  },
  {
    id: '14',
    ticker: 'META',
    companyName: 'Meta Platforms, Inc.',
    date: '2025-01-29',
    time: 'AMC',
    estimatedEps: 6.75,
    actualEps: null,
    estimatedRevenue: 46.5,
    actualRevenue: null,
    marketCap: 1500,
    fiscalQuarter: 'Q4 2024',
    isWatchlisted: true
  },
  {
    id: '15',
    ticker: 'TSLA',
    companyName: 'Tesla, Inc.',
    date: '2025-01-29',
    time: 'AMC',
    estimatedEps: 0.73,
    actualEps: null,
    estimatedRevenue: 27.2,
    actualRevenue: null,
    marketCap: 1200,
    fiscalQuarter: 'Q4 2024',
    isWatchlisted: true
  },
  {
    id: '16',
    ticker: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    date: '2025-01-30',
    time: 'AMC',
    estimatedEps: 1.49,
    actualEps: null,
    estimatedRevenue: 186.0,
    actualRevenue: null,
    marketCap: 2400,
    fiscalQuarter: 'Q4 2024',
    isWatchlisted: true
  },
  {
    id: '17',
    ticker: 'GOOGL',
    companyName: 'Alphabet Inc.',
    date: '2025-01-28',
    time: 'AMC',
    estimatedEps: 2.08,
    actualEps: null,
    estimatedRevenue: 96.5,
    actualRevenue: null,
    marketCap: 2200,
    fiscalQuarter: 'Q4 2024',
    isWatchlisted: true
  }
];

const TIME_LABELS = {
  BMO: { label: 'Before Open', icon: '🌅' },
  AMC: { label: 'After Close', icon: '🌆' },
  DURING: { label: 'During Hours', icon: '☀️' }
};

export function EarningsCalendarPanel({ filter = 'week' }: Props) {
  const { setTicker, setType } = usePanel();
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(filter);
  const [watchlistOnly, setWatchlistOnly] = useState(filter === 'watchlist');

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      let filtered = [...MOCK_EARNINGS];

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Calculate week end date
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      if (selectedFilter === 'today') {
        filtered = filtered.filter(e => e.date === todayStr);
      } else if (selectedFilter === 'week') {
        filtered = filtered.filter(e => e.date >= todayStr && e.date <= weekEndStr);
      }

      if (watchlistOnly) {
        filtered = filtered.filter(e => e.isWatchlisted);
      }

      // Sort by date and time
      filtered.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        // BMO before AMC before DURING
        const timeOrder = { BMO: 0, DURING: 1, AMC: 2 };
        return timeOrder[a.time] - timeOrder[b.time];
      });

      setEvents(filtered);
      setLoading(false);
    }, 300);
  }, [selectedFilter, watchlistOnly]);

  const formatMoney = (value: number | null, isBillions = true): string => {
    if (value === null) return '-';
    if (isBillions) return `$${value.toFixed(1)}B`;
    return `$${value.toFixed(2)}`;
  };

  const getSurpriseColor = (surprise?: number): string => {
    if (surprise === undefined) return 'text-terminal-muted';
    if (surprise > 0) return 'text-terminal-green';
    if (surprise < 0) return 'text-terminal-red';
    return 'text-terminal-muted';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isReported = (event: EarningsEvent): boolean => {
    return event.actualEps !== null;
  };

  const handleTickerClick = async (ticker: string) => {
    try {
      const instrument = await api.getInstrumentByTicker(ticker);
      setTicker(instrument.ticker, instrument.id);
      setType('chart');
    } catch (error) {
      console.error('Failed to load ticker:', error);
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, EarningsEvent[]>);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="panel-title">Earnings Calendar</span>
        </div>
        <div className="flex gap-1 items-center">
          {(['today', 'week'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-2 py-0.5 text-xs rounded ${
                selectedFilter === f && !watchlistOnly
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <span className="w-px h-4 bg-terminal-border mx-1" />
          <button
            onClick={() => setWatchlistOnly(!watchlistOnly)}
            className={`px-2 py-0.5 text-xs rounded ${
              watchlistOnly
                ? 'bg-terminal-accent text-terminal-bg'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            WATCHLIST
          </button>
        </div>
      </div>

      <div className="panel-content flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-terminal-muted">Loading...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-terminal-muted">No earnings found</span>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Date header */}
                <div className="sticky top-0 bg-terminal-bg px-3 py-2 text-xs text-terminal-accent font-semibold uppercase flex items-center justify-between">
                  <span>{formatDate(date)}</span>
                  <span className="text-terminal-muted font-normal">{dateEvents.length} reports</span>
                </div>

                {/* Events for this date */}
                <div className="divide-y divide-terminal-border/50">
                  {dateEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`px-3 py-2 hover:bg-terminal-border/20 ${
                        isReported(event) ? 'bg-terminal-border/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Time */}
                        <div className="w-16 flex-shrink-0">
                          <div className="text-xs text-terminal-muted">
                            {TIME_LABELS[event.time].icon} {event.time}
                          </div>
                          <div className="text-xs text-terminal-muted mt-0.5">
                            {event.fiscalQuarter}
                          </div>
                        </div>

                        {/* Company info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTickerClick(event.ticker)}
                              className="font-bold text-terminal-accent hover:underline"
                            >
                              {event.ticker}
                            </button>
                            {event.isWatchlisted && (
                              <span className="text-yellow-500 text-xs">★</span>
                            )}
                            {isReported(event) && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-terminal-green/20 text-terminal-green">
                                REPORTED
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-terminal-muted truncate">{event.companyName}</div>
                          {event.marketCap && (
                            <div className="text-xs text-terminal-muted mt-0.5">
                              Mkt Cap: ${event.marketCap}B
                            </div>
                          )}
                        </div>

                        {/* EPS */}
                        <div className="text-right w-20">
                          <div className="text-terminal-muted text-xs">EPS</div>
                          <div className="text-xs text-terminal-muted">
                            Est: {event.estimatedEps !== null ? `$${event.estimatedEps.toFixed(2)}` : '-'}
                          </div>
                          {event.actualEps !== null && (
                            <>
                              <div className={`text-sm font-medium ${getSurpriseColor(event.surprise)}`}>
                                ${event.actualEps.toFixed(2)}
                              </div>
                              {event.surprise !== undefined && (
                                <div className={`text-xs ${getSurpriseColor(event.surprise)}`}>
                                  {event.surprise > 0 ? '+' : ''}{event.surprise.toFixed(1)}%
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Revenue */}
                        <div className="text-right w-20">
                          <div className="text-terminal-muted text-xs">Revenue</div>
                          <div className="text-xs text-terminal-muted">
                            Est: {formatMoney(event.estimatedRevenue)}
                          </div>
                          {event.actualRevenue !== null && (
                            <div className="text-sm font-medium text-terminal-text">
                              {formatMoney(event.actualRevenue)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-terminal-border px-3 py-1.5 flex items-center gap-4 text-xs text-terminal-muted">
        <span className="flex items-center gap-1">
          🌅 BMO = Before Market Open
        </span>
        <span className="flex items-center gap-1">
          🌆 AMC = After Market Close
        </span>
        <span className="ml-auto">★ = Watchlisted</span>
      </div>
    </div>
  );
}
