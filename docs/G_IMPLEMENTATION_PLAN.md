# OpenTerm Implementation Plan

## Step-by-Step Build Sequence

---

## Overview

This plan follows the principle of **incremental delivery** - each step produces runnable, testable code that builds on the previous step.

```
Step 1: Infrastructure + Data Model
Step 2: Security Master + Search API
Step 3: Price Adapter + API
Step 4: Price Chart Frontend
Step 5: Fundamentals Adapter + API + Panel
Step 6: SEC Filings Integration
Step 7: Terminal Command System
Step 8: Watchlist Feature
Step 9: Analytics Endpoints
Step 10: Screener
Step 11: Hardening + Error Handling
Step 12: Tests + Documentation
```

---

## Step 1: Infrastructure + Data Model

**Goal:** Set up project structure, Docker, database, and migrations.

### Files Created

```
/backend/
├── pyproject.toml
├── Dockerfile
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Settings from env
│   │   ├── database.py            # SQLAlchemy setup
│   │   └── redis.py               # Redis connection
│   └── models/
│       ├── __init__.py
│       └── base.py                # Base model class
├── alembic/
│   ├── alembic.ini
│   ├── env.py
│   └── versions/
│       └── 001_initial_schema.py  # All tables

/frontend/
├── package.json
├── next.config.js
├── Dockerfile
└── src/
    └── app/
        └── page.tsx               # Placeholder

/infra/
├── docker-compose.yml
└── .env.example

/docs/
└── (documentation files)
```

### Key Implementation

**docker-compose.yml:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: openterm
      POSTGRES_USER: openterm
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://openterm:${POSTGRES_PASSWORD}@postgres:5432/openterm
      - REDIS_URL=redis://redis:6379
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  pgdata:
```

### Tests Added

- `tests/unit/test_config.py` - Config loading
- `tests/integration/test_database.py` - DB connection

### Manual Verification

- [ ] `docker compose up` starts all services
- [ ] `docker compose exec backend alembic upgrade head` runs migrations
- [ ] Can connect to Postgres via `psql`
- [ ] Can connect to Redis via `redis-cli`

---

## Step 2: Security Master + Search API

**Goal:** Load security master data and implement search.

### Files Created/Modified

```
/backend/app/
├── models/
│   ├── instrument.py              # Instrument, Listing models
├── schemas/
│   ├── __init__.py
│   └── instrument.py              # Pydantic schemas
├── services/
│   ├── __init__.py
│   └── instrument_service.py      # Search logic
├── api/
│   ├── __init__.py
│   ├── deps.py                    # Dependencies (DB session)
│   └── routes/
│       ├── __init__.py
│       └── instruments.py         # Instrument endpoints
└── adapters/
    ├── __init__.py
    ├── base.py                    # BaseAdapter ABC
    └── sec_tickers.py             # SEC ticker list loader
```

### Key Implementation

**instrument_service.py:**
```python
class InstrumentService:
    async def search(self, query: str, limit: int = 10) -> list[InstrumentSearchResult]:
        # 1. Check Redis cache
        # 2. Full-text search on instruments table
        # 3. Score and rank results
        # 4. Cache and return
```

**Data Ingestion Script:**
```python
# scripts/load_security_master.py
# Fetches https://www.sec.gov/files/company_tickers.json
# Inserts into instruments + listings tables
```

### Tests Added

- `tests/unit/test_instrument_search.py` - Search ranking
- `tests/contract/test_sec_tickers.py` - SEC endpoint contract

### Manual Verification

- [ ] `python scripts/load_security_master.py` loads ~10k securities
- [ ] `GET /api/v1/instruments/search?q=apple` returns Apple Inc. first
- [ ] `GET /api/v1/instruments/ticker/AAPL` returns instrument

---

## Step 3: Price Adapter + API

**Goal:** Implement price data adapters and historical price endpoint.

### Files Created/Modified

```
/backend/app/
├── adapters/
│   ├── stooq.py                   # Stooq adapter
│   └── yahoo_finance.py           # Yahoo adapter (fallback)
├── models/
│   └── price.py                   # DailyPrice model
├── schemas/
│   └── price.py                   # Price schemas
├── services/
│   └── price_service.py           # Price orchestration
├── api/routes/
│   └── prices.py                  # Price endpoints
└── core/
    ├── rate_limiter.py            # Token bucket limiter
    └── circuit_breaker.py         # Circuit breaker
```

### Key Implementation

**stooq.py:**
```python
class StooqAdapter(BaseAdapter):
    BASE_URL = "https://stooq.com/q/d/l/"

    async def get_daily_bars(
        self, ticker: str, start: date, end: date
    ) -> list[Bar]:
        # Rate limit check
        # Build URL with params
        # Fetch CSV
        # Parse to Bar objects
        # Handle errors
```

**price_service.py:**
```python
class PriceService:
    async def get_daily_bars(
        self, instrument_id: UUID, start: date, end: date
    ) -> PriceResponse:
        # 1. Check cache
        # 2. Check DB for recent data
        # 3. Determine missing date ranges
        # 4. Fetch from Stooq (or fallback)
        # 5. Normalize and store
        # 6. Return with freshness metadata
```

### Tests Added

- `tests/unit/test_stooq_parser.py` - CSV parsing
- `tests/contract/test_stooq.py` - Stooq endpoint contract
- `tests/contract/test_yahoo.py` - Yahoo endpoint contract

### Manual Verification

- [ ] `GET /api/v1/prices/{instrument_id}/daily?period=1Y` returns bars
- [ ] Response includes `source` and `freshness` metadata
- [ ] Rate limiting prevents burst requests

---

## Step 4: Price Chart Frontend

**Goal:** Implement frontend shell and price chart panel.

### Files Created/Modified

```
/frontend/src/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main terminal page
│   └── globals.css                # Global styles
├── components/
│   ├── CommandBar.tsx             # Command input
│   ├── PanelContainer.tsx         # Panel layout manager
│   └── panels/
│       ├── OverviewPanel.tsx      # Security overview
│       └── ChartPanel.tsx         # Price chart
├── lib/
│   ├── api.ts                     # API client
│   └── commands/
│       └── parser.ts              # Command parser (basic)
├── hooks/
│   ├── useApi.ts                  # API fetching hook
│   └── useTerminal.ts             # Terminal state hook
└── types/
    └── index.ts                   # TypeScript types
```

### Key Implementation

**ChartPanel.tsx:**
```tsx
import { createChart } from 'lightweight-charts';

export function ChartPanel({ instrumentId, period }: Props) {
  // Fetch price data
  // Initialize TradingView chart
  // Display with freshness badge
}
```

**CommandBar.tsx:**
```tsx
export function CommandBar({ onCommand }: Props) {
  // Input field
  // Basic autocomplete
  // Command history (up/down)
  // Execute on Enter
}
```

### Tests Added

- `tests/frontend/CommandBar.test.tsx` - Basic input behavior

### Manual Verification

- [ ] Frontend loads at http://localhost:3000
- [ ] Command bar accepts input
- [ ] Typing `AAPL` and Enter shows overview
- [ ] Typing `AAPL GP` shows price chart
- [ ] Chart displays correctly with date range

---

## Step 5: Fundamentals Adapter + Panel

**Goal:** Implement fundamentals data and display.

### Files Created/Modified

```
/backend/app/
├── adapters/
│   └── yahoo_finance.py           # Add fundamentals methods
├── models/
│   └── fundamentals.py            # Fundamentals model
├── schemas/
│   └── fundamentals.py            # Fundamentals schemas
├── services/
│   └── fundamentals_service.py
└── api/routes/
    └── fundamentals.py

/frontend/src/components/panels/
└── FundamentalsPanel.tsx
```

### Key Implementation

**yahoo_finance.py additions:**
```python
async def get_fundamentals(self, ticker: str) -> FundamentalsSnapshot:
    url = f"{self.BASE_URL}/quoteSummary/{ticker}"
    modules = "summaryDetail,financialData,defaultKeyStatistics"
    # Fetch and parse
    # Map to canonical schema
```

**FundamentalsPanel.tsx:**
```tsx
export function FundamentalsPanel({ instrumentId }: Props) {
  // Tabs: Overview | Income | Balance | Cash Flow
  // Display key metrics
  // Show freshness badge
}
```

### Tests Added

- `tests/unit/test_fundamentals_parser.py` - Yahoo response parsing
- `tests/contract/test_yahoo_fundamentals.py` - Endpoint contract

### Manual Verification

- [ ] `AAPL FA` command shows fundamentals panel
- [ ] Market cap, P/E, margins displayed
- [ ] Source badge shows "yahoo_finance"

---

## Step 6: SEC Filings Integration

**Goal:** Implement SEC EDGAR filings viewer.

### Files Created/Modified

```
/backend/app/
├── adapters/
│   └── sec_edgar.py               # SEC EDGAR adapter
├── models/
│   └── filing.py                  # Filing model
├── schemas/
│   └── filing.py
├── services/
│   └── filing_service.py
└── api/routes/
    └── filings.py

/frontend/src/components/panels/
└── FilingsPanel.tsx
```

### Key Implementation

**sec_edgar.py:**
```python
class SECEdgarAdapter(BaseAdapter):
    BASE_URL = "https://data.sec.gov"
    HEADERS = {"User-Agent": "OpenTerm/0.1 (contact@example.com)"}

    async def get_filings(
        self, cik: str, form_types: list[str], limit: int
    ) -> list[Filing]:
        # Fetch /submissions/CIK{cik}.json
        # Filter by form_types
        # Parse and return
```

**FilingsPanel.tsx:**
```tsx
export function FilingsPanel({ instrumentId }: Props) {
  // List of filings with date, type
  // Click to expand/view
  // Link to SEC document
  // Basic summary if available
}
```

### Tests Added

- `tests/contract/test_sec_edgar.py` - SEC endpoint contract
- `tests/unit/test_filing_parser.py` - Response parsing

### Manual Verification

- [ ] `AAPL FILINGS` shows list of filings
- [ ] `AAPL 10K` filters to 10-K only
- [ ] Clicking filing opens detail view
- [ ] Link to SEC.gov works

---

## Step 7: Terminal Command System

**Goal:** Implement full command parser, router, and autocomplete.

### Files Created/Modified

```
/frontend/src/lib/commands/
├── parser.ts                      # Full parser implementation
├── router.ts                      # Command routing
├── autocomplete.ts                # Autocomplete engine
└── types.ts                       # Command types

/frontend/src/components/
├── CommandBar.tsx                 # Enhanced with autocomplete
└── AutocompleteDropdown.tsx       # Dropdown UI

/frontend/src/context/
└── TerminalContext.tsx            # Terminal state
```

### Key Implementation

**parser.ts:**
```typescript
export function parseCommand(input: string): Command {
  const tokens = tokenize(input);

  // Pattern matching for command types
  // Handle SCREEN specially
  // Validate and return
}
```

**TerminalContext.tsx:**
```typescript
interface TerminalState {
  contextTicker: string | null;
  commandHistory: string[];
  // ...
}

export function TerminalProvider({ children }) {
  // State management
  // Command execution
  // History management
}
```

### Tests Added

- `tests/frontend/parser.test.ts` - Parser unit tests
- `tests/frontend/autocomplete.test.ts` - Autocomplete tests

### Manual Verification

- [ ] All command formats work: `AAPL`, `AAPL GP`, `AAPL GP 1Y`
- [ ] Context ticker persists after selecting ticker
- [ ] `GP` uses context ticker
- [ ] Autocomplete shows suggestions
- [ ] Tab completes selection
- [ ] Up/Down navigates history
- [ ] `HELP` shows help panel

---

## Step 8: Watchlist Feature

**Goal:** Implement watchlist CRUD with persistence.

### Files Created/Modified

```
/backend/app/
├── models/
│   └── watchlist.py               # Watchlist, WatchlistItem
├── schemas/
│   └── watchlist.py
├── services/
│   └── watchlist_service.py
└── api/routes/
    └── watchlists.py

/frontend/src/components/panels/
└── WatchlistPanel.tsx
```

### Key Implementation

**watchlist_service.py:**
```python
class WatchlistService:
    async def get_default_watchlist(self) -> Watchlist:
        # Get or create default watchlist
        # Include current prices for each item

    async def add_item(self, ticker: str) -> WatchlistItem:
        # Resolve ticker to instrument
        # Add to watchlist
```

**WatchlistPanel.tsx:**
```tsx
export function WatchlistPanel() {
  // Display watchlist items
  // Show price, change for each
  // Click to select ticker
  // Delete button
}
```

### Tests Added

- `tests/integration/test_watchlist.py` - CRUD operations

### Manual Verification

- [ ] `WL` shows watchlist
- [ ] `WL ADD AAPL` adds Apple
- [ ] `WL REMOVE AAPL` removes
- [ ] Prices shown for each item
- [ ] Watchlist persists after refresh

---

## Step 9: Analytics Endpoints

**Goal:** Implement return/risk analytics.

### Files Created/Modified

```
/backend/app/
├── services/
│   └── analytics_service.py       # Analytics calculations
├── schemas/
│   └── analytics.py
└── api/routes/
    └── analytics.py

/frontend/src/components/panels/
└── AnalyticsPanel.tsx
```

### Key Implementation

**analytics_service.py:**
```python
class AnalyticsService:
    def calculate_returns(self, prices: list[Bar]) -> ReturnMetrics:
        # Daily returns
        # Cumulative return
        # Annualized return

    def calculate_risk(self, prices: list[Bar]) -> RiskMetrics:
        # Volatility
        # Max drawdown
        # Sharpe ratio

    def calculate_correlation(
        self, price_series: dict[str, list[Bar]]
    ) -> CorrelationMatrix:
        # Pairwise correlations
```

### Tests Added

- `tests/unit/test_analytics.py` - Analytics calculations

### Manual Verification

- [ ] `AAPL ANALYTICS` shows metrics
- [ ] Returns match expected values
- [ ] `CORR AAPL MSFT GOOGL` shows matrix

---

## Step 10: Screener

**Goal:** Implement server-side screening.

### Files Created/Modified

```
/backend/app/
├── services/
│   └── screener_service.py
├── schemas/
│   └── screener.py
└── api/routes/
    └── screener.py

/frontend/src/
├── lib/commands/
│   └── parser.ts                  # Add SCREEN parsing
└── components/panels/
    └── ScreenerPanel.tsx
```

### Key Implementation

**screener_service.py:**
```python
class ScreenerService:
    async def screen(self, filters: list[Filter], sort: Sort, pagination: Pagination) -> ScreenerResult:
        # Build dynamic SQL query
        # Join instruments + fundamentals
        # Apply filters
        # Sort and paginate
```

**ScreenerPanel.tsx:**
```tsx
export function ScreenerPanel({ filters }: Props) {
  // Results table with AG Grid
  // Sortable columns
  // Click row to select ticker
  // Export button
}
```

### Tests Added

- `tests/unit/test_screener_query.py` - Query building
- `tests/integration/test_screener.py` - End-to-end

### Manual Verification

- [ ] `SCREEN MKT_CAP>10B AND PE<25` returns results
- [ ] Results sortable by column
- [ ] Export CSV works
- [ ] Click row sets context ticker

---

## Step 11: Hardening + Error Handling

**Goal:** Add resilience patterns and polish error handling.

### Files Created/Modified

```
/backend/app/
├── core/
│   ├── errors.py                  # Custom exception types
│   └── middleware.py              # Error handling middleware
├── adapters/
│   └── base.py                    # Add retry, circuit breaker

/frontend/src/components/
└── ErrorBoundary.tsx              # React error boundary
```

### Key Implementation

**base.py enhancements:**
```python
class BaseAdapter:
    async def _request(self, url: str, **kwargs) -> Response:
        # Rate limit check
        # Circuit breaker check
        # Retry with exponential backoff + jitter
        # Timeout handling
        # Error classification
```

**middleware.py:**
```python
@app.exception_handler(OpenTermError)
async def handle_openterm_error(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.to_dict()}
    )
```

### Tests Added

- `tests/unit/test_circuit_breaker.py`
- `tests/unit/test_rate_limiter.py`
- `tests/unit/test_retry.py`

### Manual Verification

- [ ] Rate limit exceeded returns 429 with retry-after
- [ ] Source timeout returns graceful error
- [ ] Circuit breaker opens after failures
- [ ] Frontend displays errors properly

---

## Step 12: Tests + Documentation

**Goal:** Complete test coverage and documentation.

### Files Created/Modified

```
/backend/tests/
├── conftest.py                    # Pytest fixtures
├── unit/                          # All unit tests
├── integration/                   # Integration tests
└── contract/                      # Contract tests

/docs/
├── RUNBOOK.md                     # Operations guide
├── KNOWN_ISSUES.md                # Known limitations
└── CONTRIBUTING.md                # Dev setup

/.github/
└── workflows/
    └── ci.yml                     # CI pipeline

/Makefile                          # Common commands
```

### Key Implementation

**conftest.py:**
```python
@pytest.fixture
async def db_session():
    # Create test database
    # Run migrations
    # Yield session
    # Cleanup

@pytest.fixture
def mock_stooq():
    # Mock Stooq responses
```

**Makefile:**
```makefile
.PHONY: dev test lint

dev:
	docker compose up

test:
	docker compose exec backend pytest

lint:
	docker compose exec backend ruff check .
	cd frontend && npm run lint
```

### Verification

- [ ] `make test` passes all tests
- [ ] `make lint` passes
- [ ] README has clear setup instructions
- [ ] Known issues documented

---

## Implementation Checklist Summary

| Step | Component | Status |
|------|-----------|--------|
| 1 | Infrastructure + Data Model | |
| 2 | Security Master + Search | |
| 3 | Price Adapter + API | |
| 4 | Price Chart Frontend | |
| 5 | Fundamentals | |
| 6 | SEC Filings | |
| 7 | Terminal Commands | |
| 8 | Watchlist | |
| 9 | Analytics | |
| 10 | Screener | |
| 11 | Hardening | |
| 12 | Tests + Docs | |

---

## Estimated File Count

| Directory | Files |
|-----------|-------|
| `/backend/app/` | ~35 |
| `/backend/tests/` | ~20 |
| `/backend/alembic/` | ~5 |
| `/frontend/src/` | ~25 |
| `/infra/` | ~3 |
| `/docs/` | ~10 |
| **Total** | **~100** |
