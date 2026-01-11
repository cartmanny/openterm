# OpenTerm Architecture Blueprint

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js + TypeScript                          │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │   │
│  │  │ Command Bar  │ │ Panel System │ │ State (React Context)     │ │   │
│  │  │ - Parser     │ │ - Chart      │ │ - Current Ticker          │ │   │
│  │  │ - Autocomplete│ │ - Fundies   │ │ - Watchlist Cache        │ │   │
│  │  │ - History    │ │ - Filings    │ │ - Panel Layout           │ │   │
│  │  └──────────────┘ │ - News       │ └──────────────────────────┘ │   │
│  │                   │ - Watchlist  │                              │   │
│  │                   │ - Screener   │                              │   │
│  │                   └──────────────┘                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP/REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     FastAPI Application                           │   │
│  │                                                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │                      API Layer                             │   │   │
│  │  │  /instruments  /prices  /fundamentals  /filings  /macro   │   │   │
│  │  │  /watchlists   /portfolios  /screener  /analytics  /health│   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                              │                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │                   Service Layer                            │   │   │
│  │  │  InstrumentService  PriceService  FundamentalsService     │   │   │
│  │  │  FilingsService  MacroService  ScreenerService            │   │   │
│  │  │  PortfolioService  AnalyticsService  WatchlistService     │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                              │                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │                  Adapter Layer (Sources)                   │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │   │   │
│  │  │  │ Stooq   │ │ SEC     │ │ FRED    │ │ Yahoo Finance   │ │   │   │
│  │  │  │ Adapter │ │ EDGAR   │ │ Adapter │ │ Adapter         │ │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                     │   │   │
│  │  │  │ Alpha   │ │ GDELT   │ │ RSS     │                     │   │   │
│  │  │  │ Vantage │ │ News    │ │ Feeds   │                     │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘                     │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                              │                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │               Infrastructure Services                      │   │   │
│  │  │  RateLimiter  CircuitBreaker  RetryHandler  CacheManager │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬──────────────────┬──────────────────────────┘
                            │                  │
                            ▼                  ▼
┌───────────────────────────────┐  ┌───────────────────────────────────────┐
│          PostgreSQL           │  │              Redis                     │
│  ┌─────────────────────────┐ │  │  ┌─────────────────────────────────┐  │
│  │ instruments             │ │  │  │ Cache Layer                      │  │
│  │ listings                │ │  │  │ - search results (TTL: 1h)       │  │
│  │ daily_prices            │ │  │  │ - quotes (TTL: 5min)             │  │
│  │ fundamentals            │ │  │  │ - fundamentals (TTL: 1h)         │  │
│  │ filings                 │ │  │  │ - filings index (TTL: 15min)     │  │
│  │ macro_series            │ │  │  └─────────────────────────────────┘  │
│  │ news_items              │ │  │  ┌─────────────────────────────────┐  │
│  │ watchlists              │ │  │  │ Rate Limit Counters              │  │
│  │ portfolios              │ │  │  │ - per-source token buckets       │  │
│  │ transactions            │ │  │  └─────────────────────────────────┘  │
│  └─────────────────────────┘ │  └───────────────────────────────────────┘
└───────────────────────────────┘
```

---

## 2. Module Breakdown

### 2.1 Frontend Modules

| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| **Command Bar** | Parse input, autocomplete, command history | `CommandBar.tsx`, `parser.ts`, `commands.ts` |
| **Panel System** | Render panels, manage layout | `PanelContainer.tsx`, `panels/*.tsx` |
| **State Management** | Global state, current context | `context/TerminalContext.tsx` |
| **API Client** | HTTP calls to backend | `lib/api.ts`, `hooks/use*.ts` |
| **Charts** | Price visualization | `components/PriceChart.tsx` |
| **Tables** | Data grids for filings, screener | `components/DataTable.tsx` |

### 2.2 Backend Modules

| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| **API Layer** | HTTP endpoints, request validation | `api/routes/*.py` |
| **Services** | Business logic, orchestration | `services/*.py` |
| **Adapters** | External data source integration | `adapters/*.py` |
| **Models** | SQLAlchemy ORM definitions | `models/*.py` |
| **Schemas** | Pydantic request/response schemas | `schemas/*.py` |
| **Core** | Config, errors, utilities | `core/*.py` |

---

## 3. Data Flow Diagrams

### 3.1 Price Data Flow

```
User: "AAPL GP 1Y"
        │
        ▼
┌───────────────────┐
│ Frontend: Parse   │
│ command, extract  │
│ ticker=AAPL       │
│ function=GP       │
│ period=1Y         │
└─────────┬─────────┘
          │ GET /api/v1/prices/AAPL/daily?period=1Y
          ▼
┌───────────────────┐
│ API: PriceRouter  │
│ Validate params   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ PriceService      │
│ 1. Check Redis    │◄─── Cache HIT? Return cached
│ 2. Check Postgres │◄─── DB HIT (recent)? Return
│ 3. Call Adapter   │
└─────────┬─────────┘
          │ Cache MISS
          ▼
┌───────────────────┐     ┌───────────────────┐
│ StooqAdapter      │────►│ Rate Limiter      │
│ (Primary)         │     │ Check bucket      │
└─────────┬─────────┘     └───────────────────┘
          │
          │ Stooq fails/rate limited?
          ▼
┌───────────────────┐
│ YahooAdapter      │
│ (Fallback)        │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Normalize to      │
│ canonical Bar     │
│ schema            │
└─────────┬─────────┘
          │
          ├───────────────┐
          ▼               ▼
┌───────────────┐  ┌─────────────┐
│ Postgres      │  │ Redis       │
│ (persist)     │  │ (cache)     │
└───────────────┘  └─────────────┘
          │
          ▼
┌───────────────────┐
│ API Response      │
│ + freshness_badge │
│ + source_name     │
└───────────────────┘
```

### 3.2 Search Flow

```
User types: "AAP"
        │
        ▼
┌───────────────────┐
│ Frontend: Debounce│
│ 300ms             │
└─────────┬─────────┘
          │ GET /api/v1/instruments/search?q=AAP
          ▼
┌───────────────────┐
│ InstrumentService │
│ 1. Redis lookup   │◄─── Cache key: search:aap:v1
│ 2. Postgres FTS   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Return top 10     │
│ - AAPL (Apple)    │
│ - AAP (Advance..) │
│ + match_score     │
└───────────────────┘
```

### 3.3 Ingestion Flow (Background)

```
┌───────────────────┐
│ APScheduler       │
│ Cron: Daily 6 PM  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ IngestionService  │
│ 1. Get instrument │
│    list           │
│ 2. Batch by source│
└─────────┬─────────┘
          │
          ├─────────────────────────────────────┐
          ▼                                     ▼
┌───────────────────┐                 ┌───────────────────┐
│ Fetch prices      │                 │ Fetch fundamentals│
│ (rate limited)    │                 │ (rate limited)    │
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          ▼                                     ▼
┌───────────────────┐                 ┌───────────────────┐
│ Normalize + flag  │                 │ Normalize + flag  │
│ quality issues    │                 │ quality issues    │
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          └─────────────────┬───────────────────┘
                            ▼
                  ┌───────────────────┐
                  │ Upsert to Postgres│
                  │ (conflict on PK)  │
                  └───────────────────┘
```

---

## 4. Failure Modes and Handling

### 4.1 Rate Limit Exceeded

| Scenario | Detection | Handling |
|----------|-----------|----------|
| Stooq 429 | HTTP 429 or known limit | Switch to fallback (Yahoo) |
| All sources exhausted | All adapters return rate_limited | Return cached data + stale badge, or 503 with retry-after |
| Burst requests | Token bucket empty | Queue request, serve from cache if available |

**Implementation:**
```python
class RateLimiter:
    def __init__(self, source: str, tokens_per_minute: int):
        self.source = source
        self.tokens = tokens_per_minute
        self.refill_rate = tokens_per_minute / 60.0

    async def acquire(self) -> bool:
        # Redis-backed token bucket
        # Returns False if exhausted
```

### 4.2 Source Outage

| Scenario | Detection | Handling |
|----------|-----------|----------|
| Stooq down | Connection timeout, 5xx | Circuit breaker opens, use fallback |
| SEC EDGAR slow | Latency > threshold | Return partial data, show degraded badge |
| Complete outage | All sources fail | Serve cached data with prominent warning |

**Circuit Breaker States:**
```
CLOSED ──(failures > threshold)──► OPEN
   ▲                                  │
   │                                  │
   └──(success)◄── HALF_OPEN ◄──(timeout)──┘
```

### 4.3 Partial Data

| Scenario | Detection | Handling |
|----------|-----------|----------|
| Missing fields | Null in response | Mark quality_flag: "missing_revenue" |
| Stale price | asof > 24h old | Show "stale" badge, attempt refresh |
| Conflicting values | Sources disagree | Use primary, flag as "conflict" |

### 4.4 Error Response Contract

All API errors return:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Price source rate limit exceeded. Using cached data.",
    "source": "stooq",
    "retryable": true,
    "retry_after_seconds": 60,
    "details": {
      "cached_data_age_seconds": 3600,
      "fallback_attempted": true
    }
  }
}
```

---

## 5. Adapter Interface Contract

Every source adapter MUST implement:

```python
from abc import ABC, abstractmethod
from typing import Optional
from datetime import date

class BaseAdapter(ABC):
    """All source adapters implement this interface."""

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Unique identifier for this source."""
        pass

    @abstractmethod
    async def search_instruments(
        self, query: str, limit: int = 10
    ) -> list[InstrumentCandidate]:
        """Search for instruments matching query."""
        pass

    @abstractmethod
    async def get_profile(
        self, identifier: str
    ) -> Optional[InstrumentProfile]:
        """Get instrument profile/metadata."""
        pass

    @abstractmethod
    async def get_daily_bars(
        self, identifier: str, start: date, end: date
    ) -> list[Bar]:
        """Get daily OHLCV bars."""
        pass

    @abstractmethod
    async def get_fundamentals(
        self, identifier: str
    ) -> Optional[FundamentalsSnapshot]:
        """Get latest fundamentals snapshot."""
        pass

    @abstractmethod
    async def get_filings(
        self, identifier: str, form_types: list[str], start: date, end: date
    ) -> list[Filing]:
        """Get SEC filings."""
        pass

    @abstractmethod
    async def get_news(
        self, identifier: str, start: date, end: date
    ) -> list[NewsItem]:
        """Get news items."""
        pass

    @abstractmethod
    async def health_check(self) -> SourceHealth:
        """Check if source is healthy."""
        pass
```

Each adapter includes:
- `RateLimiter` instance
- `CircuitBreaker` instance
- Retry logic with exponential backoff + jitter
- Timeout handling
- Structured error types (never raises to caller)

---

## 6. Caching Strategy

### 6.1 Redis Cache Layers

| Data Type | Cache Key Pattern | TTL | Invalidation |
|-----------|-------------------|-----|--------------|
| Search results | `search:{query}:{version}` | 1 hour | On security master update |
| Quote snapshot | `quote:{ticker}:{source}` | 5 min | On new price ingestion |
| Daily bars | `bars:{ticker}:{start}:{end}:{version}` | 24 hours | On ingestion |
| Fundamentals | `fundies:{ticker}:{source}` | 1 hour | On quarterly update |
| Filings index | `filings:{cik}:{form}:{version}` | 15 min | On new filing detected |
| Macro series | `macro:{series_id}:{version}` | 6 hours | On FRED update |

### 6.2 Cache Versioning

Cache keys include `{version}` hash to allow invalidation on schema changes:

```python
CACHE_VERSION = "v1"  # Bump when schema changes

def cache_key(prefix: str, *args) -> str:
    return f"{prefix}:{':'.join(str(a) for a in args)}:{CACHE_VERSION}"
```

### 6.3 Cache-Through Pattern

```python
async def get_with_cache(
    cache_key: str,
    ttl: int,
    fetch_fn: Callable,
) -> tuple[Any, CacheStatus]:
    cached = await redis.get(cache_key)
    if cached:
        return deserialize(cached), CacheStatus.HIT

    data = await fetch_fn()
    await redis.setex(cache_key, ttl, serialize(data))
    return data, CacheStatus.MISS
```

---

## 7. Security Considerations

### 7.1 MVP (Single User, Local)

- No authentication required
- All data is read-only from external sources
- No PII stored
- Docker network isolation

### 7.2 v1.0+ (Multi-User)

- JWT-based authentication
- API key management for programmatic access
- Rate limiting per user
- Audit logging
- Secrets management (not in env files)

---

## 8. Observability

### 8.1 Health Endpoint

`GET /api/v1/health`

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "sources": {
    "stooq": {
      "status": "healthy",
      "last_success": "2024-01-15T10:30:00Z",
      "last_failure": null,
      "rate_limit_remaining": 45,
      "rate_limit_reset": "2024-01-15T10:31:00Z",
      "avg_latency_ms": 234
    },
    "sec_edgar": {
      "status": "healthy",
      "last_success": "2024-01-15T10:29:00Z",
      "last_failure": null,
      "avg_latency_ms": 567
    },
    "fred": {
      "status": "degraded",
      "last_success": "2024-01-15T09:00:00Z",
      "last_failure": "2024-01-15T10:15:00Z",
      "error": "Timeout after 10s"
    }
  },
  "database": {
    "status": "healthy",
    "connection_pool_used": 5,
    "connection_pool_max": 20
  },
  "cache": {
    "status": "healthy",
    "memory_used_mb": 128
  }
}
```

### 8.2 Logging

Structured JSON logging with:
- Request ID for tracing
- Source name for adapter calls
- Latency metrics
- Cache hit/miss
- Error details

---

## 9. Deployment Architecture

### 9.1 Local Development (Docker Compose)

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

### 9.2 Production (Future)

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Frontend) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Railway   │
                    │  (Backend)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Supabase │ │ Upstash  │ │ External │
        │ Postgres │ │ Redis    │ │ Sources  │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 10. Scalability Notes

### MVP Constraints (Acceptable)

- Single backend instance
- Synchronous ingestion
- In-memory scheduler state
- Simple connection pooling

### v1.0 Improvements (Planned)

- Celery for async task queue
- Connection pool tuning
- Read replicas for Postgres
- Redis cluster for cache

### v2.0 (Future)

- Horizontal backend scaling
- Event-driven ingestion
- Time-series DB for prices (TimescaleDB)
- CDN for static assets
