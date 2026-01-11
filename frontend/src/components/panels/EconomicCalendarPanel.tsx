'use client';

import { useState, useEffect } from 'react';

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  indicator: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  unit: string;
  surprise?: number;
}

interface Props {
  filter?: 'today' | 'week' | 'month' | 'us' | 'eu';
}

// Mock economic calendar data (in production, fetch from Trading Economics or similar)
const MOCK_EVENTS: EconomicEvent[] = [
  {
    id: '1',
    date: '2025-01-13',
    time: '08:30',
    country: 'US',
    indicator: 'CPI YoY',
    description: 'Consumer Price Index Year-over-Year',
    importance: 'high',
    previous: 2.9,
    forecast: 2.8,
    actual: null,
    unit: '%'
  },
  {
    id: '2',
    date: '2025-01-13',
    time: '08:30',
    country: 'US',
    indicator: 'Core CPI YoY',
    description: 'Core Consumer Price Index (excluding food and energy)',
    importance: 'high',
    previous: 3.3,
    forecast: 3.2,
    actual: null,
    unit: '%'
  },
  {
    id: '3',
    date: '2025-01-14',
    time: '08:30',
    country: 'US',
    indicator: 'Retail Sales MoM',
    description: 'Retail Sales Month-over-Month',
    importance: 'medium',
    previous: 0.7,
    forecast: 0.5,
    actual: null,
    unit: '%'
  },
  {
    id: '4',
    date: '2025-01-15',
    time: '09:15',
    country: 'US',
    indicator: 'Industrial Production',
    description: 'Industrial Production Month-over-Month',
    importance: 'medium',
    previous: 0.1,
    forecast: 0.2,
    actual: null,
    unit: '%'
  },
  {
    id: '5',
    date: '2025-01-16',
    time: '08:30',
    country: 'US',
    indicator: 'Initial Jobless Claims',
    description: 'Weekly Initial Unemployment Claims',
    importance: 'medium',
    previous: 201,
    forecast: 210,
    actual: null,
    unit: 'K'
  },
  {
    id: '6',
    date: '2025-01-16',
    time: '08:30',
    country: 'US',
    indicator: 'Housing Starts',
    description: 'Housing Starts Month-over-Month',
    importance: 'medium',
    previous: 1.289,
    forecast: 1.320,
    actual: null,
    unit: 'M'
  },
  {
    id: '7',
    date: '2025-01-17',
    time: '10:00',
    country: 'US',
    indicator: 'Michigan Consumer Sentiment',
    description: 'University of Michigan Consumer Sentiment Index (Preliminary)',
    importance: 'medium',
    previous: 74.0,
    forecast: 73.5,
    actual: null,
    unit: ''
  },
  {
    id: '8',
    date: '2025-01-10',
    time: '08:30',
    country: 'US',
    indicator: 'NFP',
    description: 'Non-Farm Payrolls',
    importance: 'high',
    previous: 227,
    forecast: 160,
    actual: 256,
    unit: 'K',
    surprise: 60.0
  },
  {
    id: '9',
    date: '2025-01-10',
    time: '08:30',
    country: 'US',
    indicator: 'Unemployment Rate',
    description: 'Unemployment Rate',
    importance: 'high',
    previous: 4.2,
    forecast: 4.2,
    actual: 4.1,
    unit: '%',
    surprise: -2.4
  },
  {
    id: '10',
    date: '2025-01-20',
    time: '11:00',
    country: 'EU',
    indicator: 'ECB Minutes',
    description: 'European Central Bank Meeting Minutes',
    importance: 'high',
    previous: null,
    forecast: null,
    actual: null,
    unit: ''
  },
  {
    id: '11',
    date: '2025-01-21',
    time: '05:00',
    country: 'EU',
    indicator: 'GDP QoQ',
    description: 'Eurozone GDP Quarter-over-Quarter (Preliminary)',
    importance: 'high',
    previous: 0.4,
    forecast: 0.3,
    actual: null,
    unit: '%'
  }
];

const IMPORTANCE_COLORS = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500'
};

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  EU: '🇪🇺',
  UK: '🇬🇧',
  JP: '🇯🇵',
  CN: '🇨🇳',
  CA: '🇨🇦',
  AU: '🇦🇺',
  DE: '🇩🇪',
  FR: '🇫🇷'
};

export function EconomicCalendarPanel({ filter = 'week' }: Props) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(filter);
  const [importanceFilter, setImportanceFilter] = useState<'all' | 'high'>('all');

  useEffect(() => {
    // Simulate loading - in production, fetch from API
    setLoading(true);
    setTimeout(() => {
      let filtered = [...MOCK_EVENTS];

      // Filter by country/time
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (selectedFilter === 'today') {
        filtered = filtered.filter(e => e.date === todayStr);
      } else if (selectedFilter === 'us') {
        filtered = filtered.filter(e => e.country === 'US');
      } else if (selectedFilter === 'eu') {
        filtered = filtered.filter(e => e.country === 'EU');
      }

      // Filter by importance
      if (importanceFilter === 'high') {
        filtered = filtered.filter(e => e.importance === 'high');
      }

      // Sort by date and time
      filtered.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      setEvents(filtered);
      setLoading(false);
    }, 300);
  }, [selectedFilter, importanceFilter]);

  const formatValue = (value: number | null, unit: string): string => {
    if (value === null) return '-';
    return `${value}${unit}`;
  };

  const getSurpriseColor = (surprise?: number): string => {
    if (surprise === undefined) return 'text-terminal-muted';
    if (surprise > 0) return 'text-terminal-green';
    if (surprise < 0) return 'text-terminal-red';
    return 'text-terminal-muted';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isUpcoming = (dateStr: string, time: string): boolean => {
    const eventDate = new Date(`${dateStr}T${time}:00`);
    return eventDate > new Date();
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, EconomicEvent[]>);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="panel-title">Economic Calendar</span>
        </div>
        <div className="flex gap-1 items-center">
          {/* Time filter */}
          {(['today', 'week', 'us', 'eu'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-2 py-0.5 text-xs rounded ${
                selectedFilter === f
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <span className="w-px h-4 bg-terminal-border mx-1" />
          {/* Importance filter */}
          <button
            onClick={() => setImportanceFilter(importanceFilter === 'all' ? 'high' : 'all')}
            className={`px-2 py-0.5 text-xs rounded ${
              importanceFilter === 'high'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            High Impact Only
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
            <span className="text-terminal-muted">No events found</span>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Date header */}
                <div className="sticky top-0 bg-terminal-bg px-3 py-2 text-xs text-terminal-accent font-semibold uppercase">
                  {formatDate(date)}
                </div>

                {/* Events for this date */}
                <div className="divide-y divide-terminal-border/50">
                  {dateEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`px-3 py-2 hover:bg-terminal-border/20 ${
                        !isUpcoming(event.date, event.time) && event.actual === null ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Time & Importance */}
                        <div className="w-16 flex-shrink-0">
                          <div className="text-sm text-terminal-text font-mono">{event.time} ET</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${IMPORTANCE_COLORS[event.importance]}`} />
                            <span className="text-xs text-terminal-muted capitalize">{event.importance}</span>
                          </div>
                        </div>

                        {/* Indicator info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{COUNTRY_FLAGS[event.country] || '🌐'}</span>
                            <div>
                              <div className="font-medium text-terminal-text">{event.indicator}</div>
                              <div className="text-xs text-terminal-muted truncate">{event.description}</div>
                            </div>
                          </div>
                        </div>

                        {/* Values */}
                        <div className="flex gap-4 text-right text-sm">
                          <div>
                            <div className="text-terminal-muted text-xs">Previous</div>
                            <div className="text-terminal-text">{formatValue(event.previous, event.unit)}</div>
                          </div>
                          <div>
                            <div className="text-terminal-muted text-xs">Forecast</div>
                            <div className="text-terminal-text">{formatValue(event.forecast, event.unit)}</div>
                          </div>
                          <div className="w-16">
                            <div className="text-terminal-muted text-xs">Actual</div>
                            <div className={`font-medium ${event.actual !== null ? getSurpriseColor(event.surprise) : 'text-terminal-muted'}`}>
                              {formatValue(event.actual, event.unit)}
                            </div>
                            {event.surprise !== undefined && (
                              <div className={`text-xs ${getSurpriseColor(event.surprise)}`}>
                                {event.surprise > 0 ? '+' : ''}{event.surprise.toFixed(1)}%
                              </div>
                            )}
                          </div>
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
          <span className="w-2 h-2 rounded-full bg-red-500" /> High Impact
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-500" /> Low
        </span>
        <span className="ml-auto">All times ET (Eastern)</span>
      </div>
    </div>
  );
}
