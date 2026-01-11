# OpenTerm API Specification

## REST API v1

Base URL: `http://localhost:8000/api/v1`

---

## Common Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "source": "stooq",
    "asof": "2024-01-15T16:00:00Z",
    "cached": true,
    "cache_age_seconds": 120,
    "freshness": "eod"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Human-readable error message",
    "source": "yahoo_finance",
    "retryable": true,
    "retry_after_seconds": 60,
    "details": { ... }
  }
}
```

### Freshness Values

| Value | Meaning |
|-------|---------|
| `realtime` | Within 1 minute (not available with free sources) |
| `delayed` | 15-20 minute delay |
| `eod` | End of day |
| `stale` | Older than expected |

---

## 1. Instruments

### 1.1 Search Instruments

`GET /instruments/search`

Search for securities by name or ticker.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 1 char) |
| `type` | string | No | Filter by type: equity, etf, adr |
| `limit` | int | No | Max results (default: 10, max: 50) |

**Example Request:**
```
GET /api/v1/instruments/search?q=apple&type=equity&limit=5
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ",
      "security_type": "equity",
      "sector": "Technology",
      "match_score": 0.95
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "ticker": "APLE",
      "name": "Apple Hospitality REIT Inc.",
      "exchange": "NYSE",
      "security_type": "equity",
      "sector": "Real Estate",
      "match_score": 0.72
    }
  ],
  "meta": {
    "query": "apple",
    "total_matches": 12,
    "cached": true,
    "cache_age_seconds": 45
  }
}
```

---

### 1.2 Get Instrument Profile

`GET /instruments/{id}`

Get detailed instrument information.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | uuid | Instrument ID |

**Example Request:**
```
GET /api/v1/instruments/550e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apple Inc.",
    "short_name": "Apple",
    "security_type": "equity",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "cik": "0000320193",
    "listings": [
      {
        "exchange": "NASDAQ",
        "ticker": "AAPL",
        "is_primary": true
      }
    ],
    "is_active": true
  },
  "meta": {
    "source": "sec_edgar",
    "asof": "2024-01-15T00:00:00Z"
  }
}
```

---

### 1.3 Get Instrument by Ticker

`GET /instruments/ticker/{ticker}`

Resolve ticker to instrument.

**Example Request:**
```
GET /api/v1/instruments/ticker/AAPL
```

**Example Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "exchange": "NASDAQ",
    "security_type": "equity"
  },
  "meta": {
    "source": "database",
    "cached": true
  }
}
```

---

## 2. Prices

### 2.1 Get Daily Price Bars

`GET /prices/{instrument_id}/daily`

Get historical daily OHLCV bars.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `instrument_id` | uuid | Instrument ID |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | date | No | Start date (default: 1 year ago) |
| `end` | date | No | End date (default: today) |
| `period` | string | No | Shorthand: 1M, 3M, 6M, 1Y, 2Y, 5Y, MAX |
| `adjusted` | bool | No | Use adjusted close (default: true) |

**Example Request:**
```
GET /api/v1/prices/550e8400-e29b-41d4-a716-446655440000/daily?period=1Y
```

**Example Response:**
```json
{
  "data": {
    "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
    "ticker": "AAPL",
    "currency": "USD",
    "bars": [
      {
        "date": "2024-01-15",
        "open": 182.16,
        "high": 184.26,
        "low": 180.93,
        "close": 183.63,
        "adj_close": 183.63,
        "volume": 65076800
      },
      {
        "date": "2024-01-12",
        "open": 186.06,
        "high": 186.74,
        "low": 183.62,
        "close": 185.92,
        "adj_close": 185.92,
        "volume": 40477800
      }
    ]
  },
  "meta": {
    "source": "stooq",
    "asof": "2024-01-15T21:00:00Z",
    "freshness": "eod",
    "bar_count": 252,
    "quality_flags": []
  }
}
```

---

### 2.2 Get Latest Quote

`GET /prices/{instrument_id}/quote`

Get most recent price data.

**Example Request:**
```
GET /api/v1/prices/550e8400-e29b-41d4-a716-446655440000/quote
```

**Example Response:**
```json
{
  "data": {
    "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
    "ticker": "AAPL",
    "price": 183.63,
    "change": 1.47,
    "change_percent": 0.0081,
    "open": 182.16,
    "high": 184.26,
    "low": 180.93,
    "prev_close": 182.16,
    "volume": 65076800,
    "market_cap": 2850000000000,
    "trade_date": "2024-01-15",
    "currency": "USD"
  },
  "meta": {
    "source": "yahoo_finance",
    "asof": "2024-01-15T21:00:00Z",
    "freshness": "eod",
    "cached": true,
    "cache_age_seconds": 300
  }
}
```

---

## 3. Fundamentals

### 3.1 Get Fundamentals Snapshot

`GET /fundamentals/{instrument_id}`

Get latest fundamental data.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `period_type` | string | No | annual, quarterly, ttm (default: ttm) |

**Example Request:**
```
GET /api/v1/fundamentals/550e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "data": {
    "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
    "ticker": "AAPL",
    "period_type": "ttm",
    "period_end": "2023-12-30",

    "valuation": {
      "market_cap": 2850000000000,
      "enterprise_value": 2920000000000,
      "pe_trailing": 29.5,
      "pe_forward": 27.2,
      "peg_ratio": 2.1,
      "price_to_book": 45.2,
      "price_to_sales": 7.8,
      "ev_to_ebitda": 23.1
    },

    "income": {
      "revenue": 383285000000,
      "gross_profit": 169148000000,
      "operating_income": 114301000000,
      "net_income": 96995000000,
      "ebitda": 125820000000,
      "eps": 6.16,
      "eps_diluted": 6.13
    },

    "margins": {
      "gross_margin": 0.4413,
      "operating_margin": 0.2982,
      "profit_margin": 0.2531
    },

    "balance_sheet": {
      "total_assets": 352583000000,
      "total_liabilities": 290437000000,
      "total_equity": 62146000000,
      "total_debt": 111088000000,
      "cash": 61555000000
    },

    "returns": {
      "roe": 1.5607,
      "roa": 0.2751,
      "roic": 0.5623
    },

    "leverage": {
      "debt_to_equity": 1.79,
      "debt_to_ebitda": 0.88,
      "current_ratio": 0.99,
      "quick_ratio": 0.84
    },

    "dividend": {
      "dividend_yield": 0.0052,
      "payout_ratio": 0.15
    }
  },
  "meta": {
    "source": "yahoo_finance",
    "asof": "2024-01-14T00:00:00Z",
    "freshness": "quarterly",
    "quality_flags": []
  }
}
```

---

### 3.2 Get Financial Statements

`GET /fundamentals/{instrument_id}/statements`

Get historical financial statements.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `statement` | string | Yes | income, balance_sheet, cash_flow |
| `period_type` | string | No | annual, quarterly (default: annual) |
| `limit` | int | No | Number of periods (default: 4) |

**Example Request:**
```
GET /api/v1/fundamentals/550e8400.../statements?statement=income&period_type=annual&limit=4
```

**Example Response:**
```json
{
  "data": {
    "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
    "ticker": "AAPL",
    "statement": "income",
    "period_type": "annual",
    "periods": [
      {
        "period_end": "2023-09-30",
        "fiscal_year": 2023,
        "revenue": 383285000000,
        "cost_of_revenue": 214137000000,
        "gross_profit": 169148000000,
        "operating_expenses": 54847000000,
        "operating_income": 114301000000,
        "interest_expense": 3933000000,
        "income_before_tax": 113736000000,
        "income_tax": 16741000000,
        "net_income": 96995000000
      }
    ]
  },
  "meta": {
    "source": "yahoo_finance",
    "asof": "2024-01-14T00:00:00Z"
  }
}
```

---

## 4. SEC Filings

### 4.1 List Filings

`GET /filings`

Search and list SEC filings.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `instrument_id` | uuid | No | Filter by instrument |
| `ticker` | string | No | Filter by ticker |
| `cik` | string | No | Filter by CIK |
| `form_type` | string | No | Filter by form: 10-K, 10-Q, 8-K, etc. |
| `start` | date | No | Filing date start |
| `end` | date | No | Filing date end |
| `limit` | int | No | Max results (default: 20) |
| `offset` | int | No | Pagination offset |

**Example Request:**
```
GET /api/v1/filings?ticker=AAPL&form_type=10-K&limit=5
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
      "ticker": "AAPL",
      "cik": "0000320193",
      "form_type": "10-K",
      "filing_date": "2023-11-03",
      "accepted_date": "2023-11-03T06:01:14Z",
      "accession_number": "0000320193-23-000106",
      "title": "Annual Report",
      "primary_doc_url": "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930.htm",
      "summary": "Apple Inc. fiscal 2023 annual report showing revenue of $383.3B..."
    }
  ],
  "meta": {
    "source": "sec_edgar",
    "total_count": 28,
    "limit": 5,
    "offset": 0
  }
}
```

---

### 4.2 Get Filing Detail

`GET /filings/{id}`

Get filing details and content links.

**Example Request:**
```
GET /api/v1/filings/660e8400-e29b-41d4-a716-446655440000
```

**Example Response:**
```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "cik": "0000320193",
    "form_type": "10-K",
    "filing_date": "2023-11-03",
    "accepted_date": "2023-11-03T06:01:14Z",
    "accession_number": "0000320193-23-000106",
    "fiscal_year_end": "2023-09-30",
    "documents": [
      {
        "filename": "aapl-20230930.htm",
        "description": "10-K",
        "url": "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930.htm",
        "size_bytes": 2847293,
        "type": "primary"
      },
      {
        "filename": "aapl-20230930_g1.jpg",
        "description": "Graphic",
        "url": "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930_g1.jpg",
        "type": "exhibit"
      }
    ],
    "summary": "Fiscal 2023 annual report. Total net sales: $383.3B (down 3% YoY). iPhone revenue: $200.6B. Services revenue: $85.2B (up 9%). Net income: $97.0B.",
    "is_amended": false
  },
  "meta": {
    "source": "sec_edgar",
    "asof": "2023-11-03T06:01:14Z"
  }
}
```

---

## 5. Screener

### 5.1 Screen Instruments

`POST /screener/screen`

Filter universe by criteria.

**Request Body:**
```json
{
  "filters": [
    {
      "field": "market_cap",
      "operator": "gte",
      "value": 10000000000
    },
    {
      "field": "pe_trailing",
      "operator": "lte",
      "value": 25
    },
    {
      "field": "roe",
      "operator": "gte",
      "value": 0.15
    },
    {
      "field": "sector",
      "operator": "eq",
      "value": "Technology"
    }
  ],
  "sort": {
    "field": "market_cap",
    "order": "desc"
  },
  "limit": 50,
  "offset": 0
}
```

**Filter Operators:**
- `eq`: Equal
- `neq`: Not equal
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `in`: In list
- `contains`: String contains

**Available Filter Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `market_cap` | number | Market capitalization |
| `pe_trailing` | number | Trailing P/E |
| `pe_forward` | number | Forward P/E |
| `price_to_book` | number | Price to book |
| `roe` | number | Return on equity |
| `roa` | number | Return on assets |
| `roic` | number | Return on invested capital |
| `gross_margin` | number | Gross margin |
| `operating_margin` | number | Operating margin |
| `profit_margin` | number | Profit margin |
| `debt_to_equity` | number | Debt to equity |
| `current_ratio` | number | Current ratio |
| `dividend_yield` | number | Dividend yield |
| `sector` | string | Sector |
| `industry` | string | Industry |
| `security_type` | string | equity, etf |
| `return_1m` | number | 1-month return |
| `return_3m` | number | 3-month return |
| `return_6m` | number | 6-month return |
| `return_1y` | number | 1-year return |

**Example Response:**
```json
{
  "data": {
    "results": [
      {
        "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "sector": "Technology",
        "market_cap": 2850000000000,
        "pe_trailing": 29.5,
        "roe": 1.56,
        "price": 183.63,
        "return_1y": 0.48
      }
    ],
    "total_count": 127,
    "filters_applied": 4
  },
  "meta": {
    "freshness": "mixed",
    "note": "Some fundamental data may be up to 90 days old"
  }
}
```

---

### 5.2 Export Screener Results

`POST /screener/export`

Export results to CSV.

**Request Body:** Same as screen endpoint

**Response:** CSV file download

---

## 6. Macro / Economic Data

### 6.1 List Available Series

`GET /macro/series`

List available macro series.

**Example Response:**
```json
{
  "data": [
    {
      "id": "CPIAUCSL",
      "title": "Consumer Price Index for All Urban Consumers",
      "frequency": "monthly",
      "units": "Index 1982-1984=100"
    },
    {
      "id": "UNRATE",
      "title": "Unemployment Rate",
      "frequency": "monthly",
      "units": "Percent"
    },
    {
      "id": "DGS10",
      "title": "10-Year Treasury Constant Maturity Rate",
      "frequency": "daily",
      "units": "Percent"
    }
  ]
}
```

---

### 6.2 Get Series Data

`GET /macro/series/{series_id}`

Get observations for a macro series.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | date | No | Start date |
| `end` | date | No | End date |
| `limit` | int | No | Max observations |

**Example Request:**
```
GET /api/v1/macro/series/CPIAUCSL?start=2023-01-01&limit=12
```

**Example Response:**
```json
{
  "data": {
    "series_id": "CPIAUCSL",
    "title": "Consumer Price Index for All Urban Consumers",
    "units": "Index 1982-1984=100",
    "frequency": "monthly",
    "observations": [
      {"date": "2024-01-01", "value": 308.417},
      {"date": "2023-12-01", "value": 307.671},
      {"date": "2023-11-01", "value": 307.051}
    ]
  },
  "meta": {
    "source": "fred",
    "last_updated": "2024-02-13T08:31:00Z"
  }
}
```

---

### 6.3 Get Yield Curve

`GET /macro/yield-curve`

Get current US Treasury yield curve.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | date | No | Specific date (default: latest) |

**Example Response:**
```json
{
  "data": {
    "date": "2024-01-15",
    "curve": [
      {"tenor": "1M", "rate": 5.53},
      {"tenor": "3M", "rate": 5.46},
      {"tenor": "6M", "rate": 5.35},
      {"tenor": "1Y", "rate": 5.02},
      {"tenor": "2Y", "rate": 4.37},
      {"tenor": "3Y", "rate": 4.15},
      {"tenor": "5Y", "rate": 4.02},
      {"tenor": "7Y", "rate": 4.05},
      {"tenor": "10Y", "rate": 4.06},
      {"tenor": "20Y", "rate": 4.38},
      {"tenor": "30Y", "rate": 4.27}
    ],
    "spread_10y_2y": -0.31
  },
  "meta": {
    "source": "fred",
    "freshness": "eod"
  }
}
```

---

## 7. Watchlists

### 7.1 Get Default Watchlist

`GET /watchlists/default`

Get user's default watchlist with current prices.

**Example Response:**
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "Default",
    "items": [
      {
        "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "price": 183.63,
        "change": 1.47,
        "change_percent": 0.0081,
        "added_at": "2024-01-10T12:00:00Z"
      },
      {
        "instrument_id": "550e8400-e29b-41d4-a716-446655440001",
        "ticker": "MSFT",
        "name": "Microsoft Corporation",
        "price": 390.45,
        "change": -2.15,
        "change_percent": -0.0055,
        "added_at": "2024-01-11T09:30:00Z"
      }
    ],
    "item_count": 2
  },
  "meta": {
    "price_freshness": "eod"
  }
}
```

---

### 7.2 Add to Watchlist

`POST /watchlists/{watchlist_id}/items`

**Request Body:**
```json
{
  "ticker": "GOOGL"
}
```

Or:
```json
{
  "instrument_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Response:**
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "watchlist_id": "770e8400-e29b-41d4-a716-446655440000",
    "instrument_id": "550e8400-e29b-41d4-a716-446655440002",
    "ticker": "GOOGL",
    "added_at": "2024-01-15T14:30:00Z"
  }
}
```

---

### 7.3 Remove from Watchlist

`DELETE /watchlists/{watchlist_id}/items/{instrument_id}`

**Response:** 204 No Content

---

## 8. Portfolio

### 8.1 Get Portfolio

`GET /portfolios/default`

Get default portfolio with holdings.

**Example Response:**
```json
{
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "name": "Main Portfolio",
    "currency": "USD",
    "holdings": [
      {
        "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "quantity": 100,
        "avg_cost": 150.00,
        "current_price": 183.63,
        "market_value": 18363.00,
        "cost_basis": 15000.00,
        "unrealized_pnl": 3363.00,
        "unrealized_pnl_percent": 0.2242,
        "weight": 0.45
      }
    ],
    "summary": {
      "total_value": 40800.00,
      "total_cost": 35000.00,
      "total_pnl": 5800.00,
      "total_pnl_percent": 0.1657,
      "cash": 0
    }
  },
  "meta": {
    "price_freshness": "eod"
  }
}
```

---

### 8.2 Add Transaction

`POST /portfolios/{portfolio_id}/transactions`

**Request Body:**
```json
{
  "ticker": "AAPL",
  "transaction_type": "buy",
  "transaction_date": "2024-01-15",
  "quantity": 10,
  "price": 183.00,
  "fees": 0
}
```

---

## 9. Analytics

### 9.1 Get Price Analytics

`GET /analytics/prices/{instrument_id}`

Get return and risk metrics.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `period` | string | No | 1M, 3M, 6M, 1Y, 2Y, 5Y (default: 1Y) |

**Example Response:**
```json
{
  "data": {
    "instrument_id": "550e8400-e29b-41d4-a716-446655440000",
    "ticker": "AAPL",
    "period": "1Y",
    "start_date": "2023-01-15",
    "end_date": "2024-01-15",

    "returns": {
      "total_return": 0.48,
      "annualized_return": 0.48,
      "daily_returns_mean": 0.0019,
      "daily_returns_std": 0.0152
    },

    "risk": {
      "volatility_annualized": 0.241,
      "max_drawdown": -0.127,
      "max_drawdown_start": "2023-08-01",
      "max_drawdown_end": "2023-10-27",
      "sharpe_ratio": 1.82,
      "sortino_ratio": 2.41
    },

    "benchmark": {
      "ticker": "SPY",
      "beta": 1.23,
      "correlation": 0.78,
      "alpha": 0.12
    }
  },
  "meta": {
    "source": "calculated",
    "risk_free_rate": 0.05
  }
}
```

---

### 9.2 Get Correlation Matrix

`POST /analytics/correlation`

Get correlation matrix for instruments.

**Request Body:**
```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL", "AMZN"],
  "period": "1Y"
}
```

**Example Response:**
```json
{
  "data": {
    "period": "1Y",
    "tickers": ["AAPL", "MSFT", "GOOGL", "AMZN"],
    "matrix": [
      [1.00, 0.78, 0.72, 0.65],
      [0.78, 1.00, 0.81, 0.70],
      [0.72, 0.81, 1.00, 0.68],
      [0.65, 0.70, 0.68, 1.00]
    ]
  }
}
```

---

## 10. Health & Status

### 10.1 Health Check

`GET /health`

**Example Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-01-15T14:30:00Z",
  "sources": {
    "stooq": {
      "status": "healthy",
      "last_success": "2024-01-15T14:25:00Z",
      "rate_limit_remaining": 45,
      "avg_latency_ms": 234
    },
    "yahoo_finance": {
      "status": "degraded",
      "last_success": "2024-01-15T14:20:00Z",
      "last_failure": "2024-01-15T14:25:00Z",
      "error": "Rate limited"
    },
    "sec_edgar": {
      "status": "healthy",
      "last_success": "2024-01-15T14:28:00Z",
      "avg_latency_ms": 567
    },
    "fred": {
      "status": "healthy",
      "last_success": "2024-01-15T14:00:00Z",
      "avg_latency_ms": 189
    }
  },
  "database": {
    "status": "healthy",
    "connection_pool_used": 5,
    "connection_pool_max": 20
  },
  "cache": {
    "status": "healthy",
    "hit_rate": 0.85,
    "memory_used_mb": 128
  }
}
```

---

## 11. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `SOURCE_ERROR` | 502 | External source error |
| `SOURCE_TIMEOUT` | 504 | External source timeout |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `STALE_DATA` | 200 | Data returned but stale (check meta) |

---

## 12. Rate Limiting

API applies per-IP rate limiting:

| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| Default | 60 | 10 |

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705329600
```
