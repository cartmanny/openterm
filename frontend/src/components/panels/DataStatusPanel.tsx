'use client';

import { useState, useEffect } from 'react';
import { api, HealthSources, SourceHealth } from '@/lib/api';

function formatLatency(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function getCircuitStateColor(state: string): string {
  switch (state) {
    case 'closed': return 'text-green-500';
    case 'half_open': return 'text-yellow-500';
    case 'open': return 'text-red-500';
    default: return 'text-terminal-muted';
  }
}

function getCircuitStateLabel(state: string): string {
  switch (state) {
    case 'closed': return 'OK';
    case 'half_open': return 'RECOVERING';
    case 'open': return 'CIRCUIT OPEN';
    default: return state.toUpperCase();
  }
}

function SourceRow({ source }: { source: SourceHealth }) {
  const isHealthy = source.enabled && source.circuit_state === 'closed';
  const statusColor = isHealthy ? 'text-green-500' : source.enabled ? 'text-yellow-500' : 'text-terminal-muted';

  return (
    <tr className="border-b border-terminal-muted/20">
      <td className="py-2">
        <span className="font-mono text-terminal-text">{source.source.toUpperCase()}</span>
        {!source.enabled && (
          <span className="ml-2 text-xs text-terminal-muted">(disabled)</span>
        )}
      </td>
      <td className="py-2">
        <span className={statusColor}>
          {source.enabled ? getCircuitStateLabel(source.circuit_state) : 'DISABLED'}
        </span>
      </td>
      <td className="py-2 text-right text-terminal-muted">
        {source.requests_last_5m}
      </td>
      <td className="py-2 text-right">
        <span className={source.failure_rate > 10 ? 'text-red-500' : source.failure_rate > 0 ? 'text-yellow-500' : 'text-terminal-muted'}>
          {source.failure_rate.toFixed(1)}%
        </span>
      </td>
      <td className="py-2 text-right text-terminal-muted">
        {formatLatency(source.p95_latency_ms)}
      </td>
      <td className="py-2 text-right text-terminal-muted text-xs">
        {source.connectivity?.last_success
          ? formatTime(source.connectivity.last_success)
          : 'N/A'
        }
      </td>
    </tr>
  );
}

export function DataStatusPanel() {
  const [health, setHealth] = useState<HealthSources | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const data = await api.getHealthSources();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel h-full overflow-auto">
      <div className="panel-header">
        <span className="panel-title">Data Sources</span>
        {health && (
          <span className={`ml-2 text-sm ${health.status === 'healthy' ? 'text-green-500' : 'text-yellow-500'}`}>
            {health.status.toUpperCase()}
          </span>
        )}
      </div>
      <div className="panel-content">
        {loading && (
          <div className="text-terminal-muted">Loading...</div>
        )}

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {health && !loading && (
          <div className="space-y-4">
            {/* Status Summary */}
            {health.degraded_sources.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2 text-sm">
                <span className="text-yellow-500 font-bold">Warning:</span>{' '}
                <span className="text-terminal-muted">
                  {health.degraded_sources.join(', ')} {health.degraded_sources.length === 1 ? 'is' : 'are'} degraded
                </span>
              </div>
            )}

            {/* Source Table */}
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-terminal-muted text-xs uppercase">
                  <th className="text-left py-2">Source</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Reqs (5m)</th>
                  <th className="text-right py-2">Fail %</th>
                  <th className="text-right py-2">p95</th>
                  <th className="text-right py-2">Last OK</th>
                </tr>
              </thead>
              <tbody>
                {health.sources.map((source) => (
                  <SourceRow key={source.source} source={source} />
                ))}
              </tbody>
            </table>

            {/* Feature Flags */}
            <section>
              <h3 className="text-terminal-accent font-bold mb-2 text-sm">Feature Flags</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Stooq</span>
                  <span className={health.feature_flags.enable_stooq ? 'text-green-500' : 'text-red-500'}>
                    {health.feature_flags.enable_stooq ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Yahoo</span>
                  <span className={health.feature_flags.enable_yahoo ? 'text-green-500' : 'text-red-500'}>
                    {health.feature_flags.enable_yahoo ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">SEC EDGAR</span>
                  <span className={health.feature_flags.enable_edgar ? 'text-green-500' : 'text-red-500'}>
                    {health.feature_flags.enable_edgar ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">FRED</span>
                  <span className={health.feature_flags.enable_fred ? 'text-green-500' : 'text-red-500'}>
                    {health.feature_flags.enable_fred ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </section>

            {/* Legend */}
            <section className="text-xs text-terminal-muted border-t border-terminal-muted/20 pt-2">
              <p className="mb-1">
                <span className="text-green-500">OK</span> = Source operational |{' '}
                <span className="text-yellow-500">RECOVERING</span> = Testing after failure |{' '}
                <span className="text-red-500">CIRCUIT OPEN</span> = Temporarily disabled
              </p>
              <p>
                Last updated: {health.timestamp ? formatTime(health.timestamp) : 'Unknown'}
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
