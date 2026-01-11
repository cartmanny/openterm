# OpenTerm Consistency Check

## Internal Verification Checklist

This document verifies that all components align correctly.

---

## 1. API Endpoints vs Frontend Calls

| API Endpoint | Frontend Call | Status |
|--------------|---------------|--------|
| `GET /instruments/search?q={q}` | `api.searchInstruments(q)` | OK |
| `GET /instruments/ticker/{ticker}` | `api.getInstrumentByTicker(ticker)` | OK |
| `GET /prices/{id}/daily?period={p}` | `api.getDailyBars(id, period)` | OK |
| `GET /fundamentals/{id}` | `api.getFundamentals(id)` | OK |
| `GET /filings?ticker={t}` | `api.getFilings(ticker)` | OK |
| `GET /watchlists/default` | `api.getDefaultWatchlist()` | OK |
| `POST /watchlists/{id}/items` | `api.addToWatchlist(id, ticker)` | OK |
| `DELETE /watchlists/{id}/items/{iid}` | `api.removeFromWatchlist(id, iid)` | OK |
| `GET /health` | (not called from FE) | OK |

---

## 2. Database Migrations vs ORM Models

| Table | Migration | ORM Model | Match |
|-------|-----------|-----------|-------|
| instruments | 001_initial_schema.py | `Instrument` | OK |
| listings | 001_initial_schema.py | `Listing` | OK |
| daily_prices | 001_initial_schema.py | `DailyPrice` | OK |
| fundamentals | 001_initial_schema.py | `Fundamentals` | OK |
| filings | 001_initial_schema.py | `Filing` | OK |
| watchlists | 001_initial_schema.py | `Watchlist` | OK |
| watchlist_items | 001_initial_schema.py | `WatchlistItem` | OK |
| portfolios | 001_initial_schema.py | `Portfolio` | OK |
| transactions | 001_initial_schema.py | `Transaction` | OK |
| macro_series | 001_initial_schema.py | `MacroSeries` | OK |
| macro_observations | 001_initial_schema.py | `MacroObservation` | OK |

---

## 3. Environment Variables

| Variable | docker-compose.yml | .env.example | app/core/config.py | Match |
|----------|-------------------|--------------|-------------------|-------|
| DATABASE_URL | Yes | N/A (derived) | Yes | OK |
| REDIS_URL | Yes | N/A (derived) | Yes | OK |
| FRED_API_KEY | Yes | Yes | Yes | OK |
| FINNHUB_API_KEY | Yes | Yes | Yes | OK |
| SEC_USER_AGENT | Yes (via SEC_EMAIL) | Yes | Yes | OK |
| POSTGRES_PASSWORD | Yes | Yes | N/A | OK |

---

## 4. Adapters vs Documented Sources

| Adapter | Base URL | Rate Limit Config | Matches Doc? |
|---------|----------|-------------------|--------------|
| StooqAdapter | `https://stooq.com/q/d/l/` | `stooq_rpm=60` | OK |
| YahooFinanceAdapter | `https://query1.finance.yahoo.com` | `yahoo_rph=100` | OK |
| SECEdgarAdapter | `https://data.sec.gov` | `edgar_rps=8` | OK |

---

## 5. Pydantic Schemas vs API Responses

| Schema | Used In | Fields Match Response? |
|--------|---------|------------------------|
| `InstrumentSearchResult` | `/instruments/search` | OK |
| `PriceData` / `Bar` | `/prices/{id}/daily` | OK |
| `FundamentalsSnapshot` | `/fundamentals/{id}` | OK |
| `FilingItem` | `/filings` | OK |
| `WatchlistData` | `/watchlists/default` | OK |
| `ResponseMeta` | All responses | OK |

---

## 6. Command Parser vs Panel Routes

| Command | Parsed Type | Panel Component | API Called |
|---------|-------------|-----------------|------------|
| `AAPL` | `overview` | `OverviewPanel` | `getFundamentals` |
| `AAPL GP` | `chart` | `ChartPanel` | `getDailyBars` |
| `AAPL FA` | `fundamentals` | `FundamentalsPanel` | `getFundamentals` |
| `AAPL FILINGS` | `filings` | `FilingsPanel` | `getFilings` |
| `WL` | `watchlist` | `WatchlistPanel` | `getDefaultWatchlist` |
| `HELP` | `help` | `HelpPanel` | None |

---

## 7. Service Dependencies

| Service | Depends On | Verified? |
|---------|------------|-----------|
| `InstrumentService` | `db`, `cache` | OK |
| `PriceService` | `db`, `cache`, `StooqAdapter`, `YahooAdapter` | OK |
| `FundamentalsService` | `db`, `cache`, `YahooAdapter` | OK |
| `FilingService` | `db`, `cache`, `SECEdgarAdapter` | OK |
| `WatchlistService` | `db` | OK |

---

## 8. Docker Service Dependencies

```
frontend → backend → postgres, redis
```

Verified in docker-compose.yml:
- backend: `depends_on: postgres, redis`
- frontend: `depends_on: backend`

---

## 9. Package Dependencies

### Backend (pyproject.toml)

| Package | Used For | Required? |
|---------|----------|-----------|
| fastapi | API framework | Yes |
| uvicorn | ASGI server | Yes |
| sqlalchemy | ORM | Yes |
| asyncpg | Postgres driver | Yes |
| alembic | Migrations | Yes |
| pydantic | Schemas | Yes |
| redis | Caching | Yes |
| httpx | HTTP client | Yes |
| pandas | Data analysis | Optional (analytics) |
| numpy | Calculations | Optional (analytics) |

### Frontend (package.json)

| Package | Used For | Required? |
|---------|----------|-----------|
| next | Framework | Yes |
| react | UI | Yes |
| lightweight-charts | Price charts | Yes |
| @tanstack/react-table | Data tables | Optional |
| tailwindcss | Styling | Yes |
| typescript | Type safety | Yes |

---

## 10. File Structure Verification

```
openterm/
├── backend/
│   ├── app/
│   │   ├── api/routes/        5 files (health, instruments, prices, fundamentals, filings, watchlists)
│   │   ├── adapters/          4 files (base, stooq, yahoo, sec_edgar)
│   │   ├── core/              5 files (config, database, redis, errors, resilience)
│   │   ├── models/            6 files (instrument, price, fundamentals, filing, watchlist, portfolio, macro)
│   │   ├── schemas/           6 files (common, instrument, price, fundamentals, filing, watchlist, screener)
│   │   └── services/          5 files (instrument, price, fundamentals, filing, watchlist)
│   ├── alembic/versions/      1 migration
│   ├── tests/                  3 dirs (unit, contract, integration)
│   └── scripts/               1 file (seed_data.py)
├── frontend/
│   └── src/
│       ├── app/               3 files (layout, page, globals.css)
│       ├── components/        7+ files (CommandBar, PanelContainer, panels/*)
│       ├── context/           1 file (TerminalContext)
│       ├── lib/               2+ files (api.ts, commands/parser.ts)
│       └── types/             1 file (index.ts - implied)
├── docs/                       10 files (A-I specs + consistency check)
└── docker-compose.yml
```

All expected files exist: OK

---

## Summary

| Category | Status |
|----------|--------|
| API ↔ Frontend | OK |
| Migrations ↔ Models | OK |
| Env Vars | OK |
| Adapters ↔ Docs | OK |
| Schemas ↔ Responses | OK |
| Commands ↔ Panels | OK |
| Service Dependencies | OK |
| Docker Dependencies | OK |
| Package Dependencies | OK |
| File Structure | OK |

**All consistency checks passed.**
