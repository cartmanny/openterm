'use client';

import { useState } from 'react';
import { useAlerts } from '@/context/AlertsContext';
import { usePanel } from '@/context/PanelContext';
import { Alert, CONDITION_LABELS, CONDITION_UNITS } from '@/types/alerts';
import { api } from '@/lib/api';

interface Props {
  onCreateAlert?: () => void;
}

export function AlertsPanel({ onCreateAlert }: Props) {
  const { state, deleteAlert, pauseAlert, resumeAlert, markNotificationRead, clearNotifications, checkAlerts } = useAlerts();
  const { setTicker, setType } = usePanel();
  const [view, setView] = useState<'alerts' | 'notifications'>('alerts');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'triggered'>('all');
  const [isChecking, setIsChecking] = useState(false);

  const filteredAlerts = state.alerts.filter((alert) => {
    if (statusFilter === 'all') return true;
    return alert.status === statusFilter;
  });

  const handleTickerClick = async (ticker: string) => {
    try {
      const instrument = await api.getInstrumentByTicker(ticker);
      setTicker(instrument.ticker, instrument.id);
      setType('chart');
    } catch (error) {
      console.error('Failed to load ticker:', error);
    }
  };

  const handleCheckNow = async () => {
    setIsChecking(true);
    await checkAlerts();
    setIsChecking(false);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: Alert['status']): string => {
    switch (status) {
      case 'active':
        return 'bg-terminal-green/20 text-terminal-green';
      case 'triggered':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'paused':
        return 'bg-terminal-muted/20 text-terminal-muted';
      case 'expired':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-terminal-muted/20 text-terminal-muted';
    }
  };

  const formatAlertValue = (alert: Alert): string => {
    const unit = CONDITION_UNITS[alert.condition];
    if (unit === '$') return `$${alert.value.toFixed(2)}`;
    if (unit === '%') return `${alert.value}%`;
    if (unit === 'x avg') return `${alert.value}x`;
    if (unit === 'days') return `${alert.value} days`;
    return String(alert.value);
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="panel-title">Alerts</span>
          {state.notifications.filter((n) => !n.read).length > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
              {state.notifications.filter((n) => !n.read).length}
            </span>
          )}
        </div>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setView('alerts')}
            className={`px-2 py-0.5 text-xs rounded ${
              view === 'alerts'
                ? 'bg-terminal-accent text-terminal-bg'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            ALERTS ({state.alerts.length})
          </button>
          <button
            onClick={() => setView('notifications')}
            className={`px-2 py-0.5 text-xs rounded relative ${
              view === 'notifications'
                ? 'bg-terminal-accent text-terminal-bg'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            HISTORY
          </button>
          <span className="w-px h-4 bg-terminal-border mx-1" />
          {onCreateAlert && (
            <button
              onClick={onCreateAlert}
              className="px-2 py-0.5 text-xs rounded bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30"
            >
              + NEW
            </button>
          )}
          <button
            onClick={handleCheckNow}
            disabled={isChecking}
            className="px-2 py-0.5 text-xs rounded bg-terminal-border text-terminal-muted hover:bg-terminal-border/80 disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check Now'}
          </button>
        </div>
      </div>

      {view === 'alerts' && (
        <>
          {/* Status filter */}
          <div className="flex gap-1 px-3 py-2 border-b border-terminal-border">
            {(['all', 'active', 'triggered'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2 py-0.5 text-xs rounded ${
                  statusFilter === status
                    ? 'bg-terminal-accent/20 text-terminal-accent'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="panel-content flex-1 overflow-auto">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-terminal-muted">
                <p>No alerts found</p>
                {onCreateAlert && (
                  <button
                    onClick={onCreateAlert}
                    className="mt-2 px-3 py-1 text-sm rounded bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/80"
                  >
                    Create Alert
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-terminal-border">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="px-3 py-2 hover:bg-terminal-border/20"
                  >
                    <div className="flex items-start gap-3">
                      {/* Ticker */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleTickerClick(alert.ticker)}
                          className="font-bold text-terminal-accent hover:underline"
                        >
                          {alert.ticker}
                        </button>
                        <div className={`mt-1 px-1.5 py-0.5 text-xs rounded ${getStatusColor(alert.status)}`}>
                          {alert.status.toUpperCase()}
                        </div>
                      </div>

                      {/* Condition */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-terminal-text">
                          {CONDITION_LABELS[alert.condition]}
                        </div>
                        <div className="text-lg font-bold text-terminal-text">
                          {formatAlertValue(alert)}
                        </div>
                        {alert.currentValue !== undefined && (
                          <div className="text-xs text-terminal-muted">
                            Current: ${alert.currentValue.toFixed(2)}
                          </div>
                        )}
                        {alert.note && (
                          <div className="text-xs text-terminal-muted mt-1 truncate">
                            {alert.note}
                          </div>
                        )}
                      </div>

                      {/* Meta & Actions */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs text-terminal-muted">
                          {formatTime(alert.createdAt)}
                        </div>
                        {alert.triggerCount > 0 && (
                          <div className="text-xs text-yellow-400">
                            Triggered {alert.triggerCount}x
                          </div>
                        )}
                        <div className="flex gap-1 mt-1">
                          {alert.status === 'active' ? (
                            <button
                              onClick={() => pauseAlert(alert.id)}
                              className="px-1.5 py-0.5 text-xs rounded bg-terminal-border text-terminal-muted hover:bg-terminal-border/80"
                            >
                              Pause
                            </button>
                          ) : alert.status === 'paused' ? (
                            <button
                              onClick={() => resumeAlert(alert.id)}
                              className="px-1.5 py-0.5 text-xs rounded bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30"
                            >
                              Resume
                            </button>
                          ) : null}
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {view === 'notifications' && (
        <div className="panel-content flex-1 overflow-auto">
          {state.notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full text-terminal-muted">
              No notifications yet
            </div>
          ) : (
            <>
              <div className="flex justify-end px-3 py-1 border-b border-terminal-border">
                <button
                  onClick={clearNotifications}
                  className="text-xs text-terminal-muted hover:text-terminal-text"
                >
                  Clear All
                </button>
              </div>
              <div className="divide-y divide-terminal-border">
                {state.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationRead(notification.id)}
                    className={`px-3 py-2 cursor-pointer hover:bg-terminal-border/20 ${
                      !notification.read ? 'bg-terminal-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-terminal-accent mt-1.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTickerClick(notification.ticker);
                            }}
                            className="font-bold text-terminal-accent hover:underline"
                          >
                            {notification.ticker}
                          </button>
                          <span className="text-xs text-terminal-muted">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm text-terminal-text mt-0.5">
                          {notification.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-terminal-border px-3 py-1.5 flex items-center justify-between text-xs text-terminal-muted">
        <span>
          {state.alerts.filter((a) => a.status === 'active').length} active alerts
        </span>
        <span>
          Last checked: {state.lastCheck > 0 ? formatTime(state.lastCheck) : 'Never'}
        </span>
      </div>
    </div>
  );
}
