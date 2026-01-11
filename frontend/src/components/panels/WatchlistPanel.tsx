'use client';

import { useEffect, useState } from 'react';
import { api, WatchlistData, WatchlistItem } from '@/lib/api';

interface WatchlistPanelProps {
  onSelectTicker?: (ticker: string, instrumentId: string) => void;
}

export function WatchlistPanel({ onSelectTicker }: WatchlistPanelProps) {
  const [watchlist, setWatchlist] = useState<WatchlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const data = await api.getDefaultWatchlist();
      setWatchlist(data);
    } catch (err) {
      setError('Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleSelectItem = (item: WatchlistItem) => {
    if (onSelectTicker) {
      onSelectTicker(item.ticker, item.instrument_id);
    }
  };

  const handleRemoveItem = async (e: React.MouseEvent, item: WatchlistItem) => {
    e.stopPropagation();
    if (!watchlist) return;

    try {
      await api.removeFromWatchlist(watchlist.id, item.instrument_id);
      await fetchWatchlist();
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
    }
  };

  const formatChange = (change: number | null, changePct: number | null) => {
    if (change === null) return { text: 'N/A', className: 'text-terminal-muted' };

    const sign = change >= 0 ? '+' : '';
    const pct = changePct !== null ? ` (${sign}${(changePct * 100).toFixed(2)}%)` : '';

    return {
      text: `${sign}${change.toFixed(2)}${pct}`,
      className: change >= 0 ? 'price-up' : 'price-down',
    };
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Watchlist</span>
        </div>
        <div className="panel-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Watchlist</span>
        </div>
        <div className="panel-content text-terminal-muted">{error}</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Watchlist</span>
        <span className="text-terminal-muted text-xs">
          {watchlist?.item_count || 0} items
        </span>
      </div>
      <div className="panel-content">
        {!watchlist || watchlist.items.length === 0 ? (
          <div className="text-terminal-muted text-sm">
            <p>No items in watchlist.</p>
            <p className="mt-2">Add with: WL ADD AAPL</p>
          </div>
        ) : (
          <div className="space-y-1">
            {watchlist.items.map((item) => {
              const change = formatChange(item.change, item.change_percent);
              return (
                <div
                  key={item.instrument_id}
                  onClick={() => handleSelectItem(item)}
                  className="flex items-center justify-between hover:bg-terminal-border/30 px-2 py-1 rounded cursor-pointer group"
                >
                  <div className="flex-1">
                    <span className="font-bold text-terminal-accent">{item.ticker}</span>
                    <span className="text-terminal-muted text-xs ml-2 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div>{item.price?.toFixed(2) || 'N/A'}</div>
                      <div className={`text-xs ${change.className}`}>{change.text}</div>
                    </div>
                    <button
                      onClick={(e) => handleRemoveItem(e, item)}
                      className="opacity-0 group-hover:opacity-100 text-terminal-muted hover:text-terminal-red text-xs px-1"
                    >
                      x
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
