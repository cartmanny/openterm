# Cartman BBT - V1 Stability Pass Implementation

All code changes made for the OpenTerm v1 stability pass.

---

## Backend Changes

### 1. backend/app/core/config.py (Feature Flags Addition)

```python
# Feature Flags
enable_yahoo: bool = True  # Yahoo is unstable; set False to disable
enable_stooq: bool = True
enable_edgar: bool = True
enable_fred: bool = False  # Not implemented in MVP
```

### 2. backend/app/core/resilience.py (Source Metrics & Registry)

Added after existing code:

```python
# Metrics window: 5 minutes
METRICS_WINDOW_SECONDS = 300


@dataclass
class RequestRecord:
    """Record of a single request for metrics."""

    timestamp: float
    latency_ms: float
    success: bool


@dataclass
class SourceMetrics:
    """Metrics for a data source over a rolling window."""

    source: str
    circuit_breaker: CircuitBreaker = field(default_factory=CircuitBreaker)
    requests: deque[RequestRecord] = field(default_factory=lambda: deque(maxlen=1000))
    enabled: bool = True

    def record_request(self, latency_ms: float, success: bool) -> None:
        """Record a request."""
        now = time.time()
        self.requests.append(RequestRecord(timestamp=now, latency_ms=latency_ms, success=success))
        if success:
            self.circuit_breaker.record_success()
        else:
            self.circuit_breaker.record_failure()

    def _prune_old_records(self) -> list[RequestRecord]:
        """Get records within the metrics window."""
        cutoff = time.time() - METRICS_WINDOW_SECONDS
        return [r for r in self.requests if r.timestamp >= cutoff]

    def get_stats(self) -> dict:
        """Get current stats for this source."""
        records = self._prune_old_records()
        total = len(records)
        failures = sum(1 for r in records if not r.success)
        latencies = sorted([r.latency_ms for r in records if r.success])

        p95_latency = 0.0
        if latencies:
            idx = int(len(latencies) * 0.95)
            p95_latency = latencies[min(idx, len(latencies) - 1)]

        return {
            "source": self.source,
            "enabled": self.enabled,
            "circuit_state": self.circuit_breaker.state.value,
            "is_available": self.circuit_breaker.is_available(),
            "requests_last_5m": total,
            "failures_last_5m": failures,
            "failure_rate": (failures / total * 100) if total > 0 else 0.0,
            "p95_latency_ms": round(p95_latency, 2),
        }


class SourceRegistry:
    """Registry for all data sources with their circuit breakers and metrics."""

    def __init__(self) -> None:
        self._sources: dict[str, SourceMetrics] = {}

    def register(
        self,
        source: str,
        enabled: bool = True,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ) -> None:
        """Register a data source."""
        self._sources[source] = SourceMetrics(
            source=source,
            circuit_breaker=CircuitBreaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
            ),
            enabled=enabled,
        )

    def get(self, source: str) -> SourceMetrics | None:
        """Get metrics for a source."""
        return self._sources.get(source)

    def is_available(self, source: str) -> bool:
        """Check if a source is enabled and circuit is not open."""
        metrics = self._sources.get(source)
        if not metrics:
            return True
        return metrics.enabled and metrics.circuit_breaker.is_available()

    def record_request(self, source: str, latency_ms: float, success: bool) -> None:
        """Record a request result for a source."""
        metrics = self._sources.get(source)
        if metrics:
            metrics.record_request(latency_ms, success)

    def get_all_stats(self) -> list[dict]:
        """Get stats for all registered sources."""
        return [m.get_stats() for m in self._sources.values()]

    def get_health_summary(self) -> dict:
        """Get overall health summary."""
        stats = self.get_all_stats()
        degraded = [s for s in stats if s["circuit_state"] != "closed" or not s["enabled"]]
        return {
            "status": "healthy" if not degraded else "degraded",
            "sources": stats,
            "degraded_sources": [s["source"] for s in degraded],
        }


# Global source registry instance
source_registry = SourceRegistry()
```

### 3. backend/app/api/routes/health.py (Complete Replacement)

```python
"""Health check endpoints."""
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from app.adapters.stooq import StooqAdapter
from app.adapters.yahoo import YahooFinanceAdapter
from app.adapters.sec_edgar import SECEdgarAdapter
from app.core.config import settings
from app.core.resilience import source_registry

router = APIRouter()


def _initialize_source_registry() -> None:
    """Initialize source registry with configured sources."""
    if source_registry.get("stooq") is None:
        source_registry.register(
            "stooq",
            enabled=settings.enable_stooq,
            failure_threshold=5,
            recovery_timeout=60.0,
        )
    if source_registry.get("yahoo_finance") is None:
        source_registry.register(
            "yahoo_finance",
            enabled=settings.enable_yahoo,
            failure_threshold=3,  # Lower threshold - Yahoo is unstable
            recovery_timeout=120.0,  # Longer recovery - give it time
        )
    if source_registry.get("sec_edgar") is None:
        source_registry.register(
            "sec_edgar",
            enabled=settings.enable_edgar,
            failure_threshold=5,
            recovery_timeout=60.0,
        )


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """Basic health check - is the service running."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/sources")
async def health_sources() -> dict[str, Any]:
    """Detailed health check for all data sources.

    Returns circuit breaker state, request counts, failure rates, and latency.
    """
    _initialize_source_registry()

    # Get stats from the registry
    health = source_registry.get_health_summary()

    # Also do a quick connectivity check for each adapter
    adapters = []
    if settings.enable_stooq:
        adapters.append(StooqAdapter())
    if settings.enable_yahoo:
        adapters.append(YahooFinanceAdapter())
    if settings.enable_edgar:
        adapters.append(SECEdgarAdapter())

    connectivity = {}
    for adapter in adapters:
        adapter_health = await adapter.health_check()
        connectivity[adapter.source_name] = {
            "reachable": adapter_health.status.value == "healthy",
            "last_success": adapter_health.last_success.isoformat() if adapter_health.last_success else None,
            "last_failure": adapter_health.last_failure.isoformat() if adapter_health.last_failure else None,
        }
        if adapter_health.error:
            connectivity[adapter.source_name]["error"] = adapter_health.error

    # Merge registry stats with connectivity info
    for source_stat in health["sources"]:
        source_name = source_stat["source"]
        if source_name in connectivity:
            source_stat["connectivity"] = connectivity[source_name]

    return {
        "status": health["status"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "degraded_sources": health["degraded_sources"],
        "sources": health["sources"],
        "feature_flags": {
            "enable_stooq": settings.enable_stooq,
            "enable_yahoo": settings.enable_yahoo,
            "enable_edgar": settings.enable_edgar,
            "enable_fred": settings.enable_fred,
        },
    }


@router.get("/health/ready")
async def readiness_check() -> dict[str, Any]:
    """Readiness check - is the service ready to accept traffic.

    Checks that at least one price source is available.
    """
    _initialize_source_registry()

    # We need at least one price source working
    stooq_available = source_registry.is_available("stooq") if settings.enable_stooq else False
    yahoo_available = source_registry.is_available("yahoo_finance") if settings.enable_yahoo else False

    price_source_available = stooq_available or yahoo_available

    if not price_source_available:
        return {
            "status": "not_ready",
            "reason": "No price data source available",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
```

### 4. backend/app/services/price_service.py (_fetch_from_source method)

```python
async def _fetch_from_source(
    self, ticker: str, start: date, end: date
) -> tuple[list[AdapterBar], str]:
    """Fetch bars from external source with fallback.

    Respects feature flags and records metrics for each source.
    """
    # Try Stooq first (primary) if enabled and circuit is closed
    if settings.enable_stooq and source_registry.is_available("stooq"):
        start_time = time.time()
        try:
            bars = await self.stooq.get_daily_bars(ticker, start, end)
            latency_ms = (time.time() - start_time) * 1000
            source_registry.record_request("stooq", latency_ms, success=True)
            if bars:
                return bars, "stooq"
        except Exception:
            latency_ms = (time.time() - start_time) * 1000
            source_registry.record_request("stooq", latency_ms, success=False)

    # Fallback to Yahoo if enabled and circuit is closed
    if settings.enable_yahoo and source_registry.is_available("yahoo_finance"):
        start_time = time.time()
        try:
            bars = await self.yahoo.get_daily_bars(ticker, start, end)
            latency_ms = (time.time() - start_time) * 1000
            source_registry.record_request("yahoo_finance", latency_ms, success=True)
            if bars:
                return bars, "yahoo_finance"
        except Exception:
            latency_ms = (time.time() - start_time) * 1000
            source_registry.record_request("yahoo_finance", latency_ms, success=False)

    return [], "none"
```

### 5. backend/app/services/fundamentals_service.py (Yahoo fetch section)

```python
if not db_fundies or self._data_is_stale(db_fundies):
    # Fetch from Yahoo if enabled and circuit is closed
    if settings.enable_yahoo and source_registry.is_available("yahoo_finance"):
        start_time = time.time()
        try:
            yahoo_data = await self.yahoo.get_fundamentals(ticker)
            latency_ms = (time.time() - start_time) * 1000
            source_registry.record_request("yahoo_finance", latency_ms, success=True)
            if yahoo_data:
                # Store in database
                await self._store_fundamentals(instrument_id, yahoo_data, period_type)
                db_fundies = await self._get_from_db(instrument_id, period_type)
                source = "yahoo_finance"
        except Exception:
            latency_ms = (time.time() - start_time) * 1000
            source_registry.record_request("yahoo_finance", latency_ms, success=False)
            if not db_fundies:
                raise NotFoundError("Fundamentals", ticker)
            quality_flags.append("stale_data")
    elif not db_fundies:
        # Yahoo disabled and no cached data
        raise NotFoundError("Fundamentals", ticker)
    else:
        quality_flags.append("yahoo_disabled")
```

### 6. backend/app/services/filing_service.py (SEC fetch section)

```python
# If no data or potentially stale, fetch from SEC if enabled
if not db_filings and settings.enable_edgar and source_registry.is_available("sec_edgar"):
    form_types = [form_type] if form_type else ["10-K", "10-Q", "8-K"]
    start_time = time.time()
    try:
        sec_filings = await self.sec.get_filings(resolved_cik, form_types, limit=50)
        latency_ms = (time.time() - start_time) * 1000
        source_registry.record_request("sec_edgar", latency_ms, success=True)

        if sec_filings:
            await self._store_filings(sec_filings, resolved_instrument_id)
            db_filings = await self._get_from_db(
                resolved_cik, form_type, start, end, limit, offset
            )
    except Exception:
        latency_ms = (time.time() - start_time) * 1000
        source_registry.record_request("sec_edgar", latency_ms, success=False)
```

### 7. .env.example (Feature Flags)

```bash
# Feature Flags
# Set to false to disable specific data sources
ENABLE_STOOQ=true
ENABLE_YAHOO=true  # Yahoo is unstable; disable if causing issues
ENABLE_EDGAR=true
ENABLE_FRED=false  # Not implemented in MVP
```

---

## Frontend Changes

### 1. frontend/src/lib/api.ts (New Types & Method)

```typescript
export interface SourceHealth {
  source: string;
  enabled: boolean;
  circuit_state: 'closed' | 'open' | 'half_open';
  is_available: boolean;
  requests_last_5m: number;
  failures_last_5m: number;
  failure_rate: number;
  p95_latency_ms: number;
  connectivity?: {
    reachable: boolean;
    last_success: string | null;
    last_failure: string | null;
    error?: string;
  };
}

export interface HealthSources {
  status: 'healthy' | 'degraded';
  timestamp: string;
  degraded_sources: string[];
  sources: SourceHealth[];
  feature_flags: {
    enable_stooq: boolean;
    enable_yahoo: boolean;
    enable_edgar: boolean;
    enable_fred: boolean;
  };
}

// Add to ApiClient class:
async getHealthSources(): Promise<HealthSources> {
  const url = `${API_BASE}/health/sources`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch health status');
  }
  return response.json();
}
```

### 2. frontend/src/components/FreshnessBadge.tsx (New File)

```typescript
'use client';

import { ResponseMeta } from '@/lib/api';

interface Props {
  meta: ResponseMeta | null;
  compact?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  stooq: 'Stooq',
  yahoo_finance: 'Yahoo',
  sec_edgar: 'SEC',
  fred: 'FRED',
  database: 'Cached',
};

const FRESHNESS_LABELS: Record<string, string> = {
  eod: 'End of Day',
  quarterly: 'Quarterly',
  realtime: 'Real-time',
  stale: 'Stale',
};

function formatAsOf(asof: string | null): string {
  if (!asof) return '';

  const date = new Date(asof);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins <= 1 ? 'Just now' : `${mins}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStalenessColor(freshness: string | null, asof: string | null): string {
  if (freshness === 'stale') return 'text-yellow-500 bg-yellow-500/10';

  if (!asof) return 'text-terminal-muted bg-terminal-muted/10';

  const date = new Date(asof);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = diff / 86400000;

  if (days > 7) return 'text-yellow-500 bg-yellow-500/10';
  if (days > 1) return 'text-terminal-muted bg-terminal-muted/10';
  return 'text-green-500 bg-green-500/10';
}

export function FreshnessBadge({ meta, compact = false }: Props) {
  if (!meta) return null;

  const sourceLabel = meta.source ? (SOURCE_LABELS[meta.source] || meta.source) : 'Unknown';
  const freshnessLabel = meta.freshness ? FRESHNESS_LABELS[meta.freshness] : '';
  const asofLabel = formatAsOf(meta.asof);
  const stalenessColor = getStalenessColor(meta.freshness, meta.asof);

  if (compact) {
    return (
      <span
        className={`text-xs px-1.5 py-0.5 rounded ${stalenessColor}`}
        title={`Source: ${sourceLabel}${freshnessLabel ? ` | ${freshnessLabel}` : ''}${asofLabel ? ` | Updated: ${asofLabel}` : ''}`}
      >
        {sourceLabel}
        {meta.cached && <span className="ml-1">*</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`px-1.5 py-0.5 rounded ${stalenessColor}`}>
        {sourceLabel}
      </span>
      {freshnessLabel && (
        <span className="text-terminal-muted">{freshnessLabel}</span>
      )}
      {asofLabel && (
        <span className="text-terminal-muted" title={meta.asof || ''}>
          {asofLabel}
        </span>
      )}
      {meta.cached && (
        <span className="text-terminal-muted" title="Served from cache">
          (cached)
        </span>
      )}
    </div>
  );
}
```

### 3. frontend/src/components/panels/DataStatusPanel.tsx (New File)

```typescript
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
```

### 4. frontend/src/lib/commands/parser.ts (Changes)

Added to Command type:
```typescript
| { type: 'status' }
```

Added to SYSTEM_COMMANDS:
```typescript
const SYSTEM_COMMANDS = ['WL', 'WATCHLIST', 'HELP', '?', 'PORT', 'PORTFOLIO', 'SCREEN', 'MACRO', 'STATUS', 'HEALTH'];
```

Added to parseCommand function:
```typescript
if (first === 'STATUS' || first === 'HEALTH') {
  return { type: 'status' };
}
```

### 5. frontend/src/components/CommandBar.tsx (Changes)

Added case in handleExecute switch:
```typescript
case 'status':
  setActivePanel('status');
  break;
```

### 6. frontend/src/components/PanelContainer.tsx (Changes)

Added import:
```typescript
import { DataStatusPanel } from '@/components/panels/DataStatusPanel';
```

Added render condition:
```typescript
{activePanel === 'status' && <DataStatusPanel />}
```

### 7. Panel Updates (ChartPanel, FundamentalsPanel, FilingsPanel)

All panels updated to use `FreshnessBadge` instead of `SourceBadge`:

```typescript
// Import
import { FreshnessBadge } from '@/components/FreshnessBadge';

// State
const [meta, setMeta] = useState<ResponseMeta | null>(null);

// Usage
<FreshnessBadge meta={meta} compact />
```

### 8. frontend/src/components/panels/HelpPanel.tsx (Changes)

Added System section:
```typescript
<section>
  <h3 className="text-terminal-accent font-bold mb-2">System</h3>
  <table className="data-table">
    <tbody>
      <tr>
        <td className="text-terminal-text w-1/3">STATUS</td>
        <td className="text-terminal-muted">Data source health</td>
      </tr>
      <tr>
        <td className="text-terminal-text">HELP</td>
        <td className="text-terminal-muted">Show this help</td>
      </tr>
    </tbody>
  </table>
</section>
```

---

## Summary

This v1 stability pass adds:
1. **Feature flags** to enable/disable data sources
2. **Source metrics tracking** (requests, failures, latency)
3. **Circuit breaker integration** with health reporting
4. **Health endpoints** (`/health/sources`, `/health/ready`)
5. **Data Status panel** accessible via `STATUS` command
6. **Freshness badges** on all data panels showing source, staleness, and update time
