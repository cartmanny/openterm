# OpenTerm Canonical Data Model

## PostgreSQL Schema Design

---

## Design Principles

1. **Data Lineage**: Every record tracks source, ingestion time, and quality flags
2. **Normalization**: Canonical units and formats across all sources
3. **Extensibility**: JSON columns for source-specific extra fields
4. **Performance**: Strategic indexes for common query patterns
5. **Partitioning**: Time-series tables partitioned by date for efficient queries

---

## Schema Overview

```
┌─────────────────┐     ┌─────────────────┐
│   instruments   │────<│    listings     │
│   (security     │     │   (exchange     │
│    master)      │     │    tickers)     │
└────────┬────────┘     └─────────────────┘
         │
         ├──────────────────┬──────────────────┬──────────────────┐
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  daily_prices   │ │  fundamentals   │ │    filings      │ │   news_items    │
│  (OHLCV bars)   │ │  (snapshots)    │ │  (SEC docs)     │ │  (articles)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  macro_series   │     │   watchlists    │
│  (FRED data)    │     │  (user lists)   │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ watchlist_items │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   portfolios    │────<│  transactions   │
└─────────────────┘     └─────────────────┘
```

---

## 1. Instruments (Security Master)

The central entity representing a tradeable security.

```sql
CREATE TABLE instruments (
    -- Primary Key
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifiers
    figi            VARCHAR(12) UNIQUE,          -- Bloomberg FIGI if known
    isin            VARCHAR(12),                 -- International standard
    cusip           VARCHAR(9),                  -- US/Canada identifier
    cik             VARCHAR(10),                 -- SEC Central Index Key

    -- Basic Info
    name            VARCHAR(255) NOT NULL,       -- Full legal name
    short_name      VARCHAR(100),                -- Display name
    security_type   VARCHAR(50) NOT NULL,        -- equity, etf, adr, etc.

    -- Classification
    sector          VARCHAR(100),
    industry        VARCHAR(100),
    sic_code        VARCHAR(4),

    -- Status
    is_active       BOOLEAN NOT NULL DEFAULT true,

    -- Data Lineage
    source          VARCHAR(50) NOT NULL,        -- sec_edgar, nasdaq, etc.
    source_id       VARCHAR(100),                -- ID in source system
    asof            TIMESTAMP WITH TIME ZONE,    -- Data as-of date
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    quality_flags   TEXT[] DEFAULT '{}',         -- List of quality issues
    extra           JSONB DEFAULT '{}'           -- Source-specific fields
);

-- Indexes
CREATE INDEX idx_instruments_name_search ON instruments
    USING gin(to_tsvector('english', name || ' ' || COALESCE(short_name, '')));
CREATE INDEX idx_instruments_cik ON instruments(cik) WHERE cik IS NOT NULL;
CREATE INDEX idx_instruments_type ON instruments(security_type);
CREATE INDEX idx_instruments_sector ON instruments(sector) WHERE sector IS NOT NULL;
CREATE INDEX idx_instruments_active ON instruments(is_active) WHERE is_active = true;
```

**Quality Flags:**
- `missing_cik`: No SEC CIK found
- `missing_sector`: Sector/industry not classified
- `stale_data`: Not updated recently
- `conflicting_sources`: Sources disagree on key fields

---

## 2. Listings (Exchange Tickers)

Maps instruments to exchange-specific tickers.

```sql
CREATE TABLE listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id   UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,

    -- Exchange Info
    exchange        VARCHAR(20) NOT NULL,        -- NYSE, NASDAQ, etc.
    ticker          VARCHAR(20) NOT NULL,        -- Trading symbol

    -- Status
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    listed_date     DATE,
    delisted_date   DATE,

    -- Data Lineage
    source          VARCHAR(50) NOT NULL,
    source_id       VARCHAR(100),
    asof            TIMESTAMP WITH TIME ZONE,
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(exchange, ticker, is_active)
);

-- Indexes
CREATE INDEX idx_listings_instrument ON listings(instrument_id);
CREATE INDEX idx_listings_ticker ON listings(ticker);
CREATE INDEX idx_listings_ticker_upper ON listings(UPPER(ticker));
CREATE INDEX idx_listings_primary ON listings(instrument_id) WHERE is_primary = true;
```

---

## 3. Daily Prices (OHLCV Bars)

Historical daily price data. Partitioned by year for performance.

```sql
CREATE TABLE daily_prices (
    -- Composite Primary Key
    instrument_id   UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    trade_date      DATE NOT NULL,

    -- OHLCV
    open            DECIMAL(20, 6),
    high            DECIMAL(20, 6),
    low             DECIMAL(20, 6),
    close           DECIMAL(20, 6) NOT NULL,
    adj_close       DECIMAL(20, 6),              -- Split/dividend adjusted
    volume          BIGINT,

    -- Currency (for normalization)
    currency        VARCHAR(3) DEFAULT 'USD',

    -- Data Lineage
    source          VARCHAR(50) NOT NULL,
    source_id       VARCHAR(100),
    asof            TIMESTAMP WITH TIME ZONE,
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    quality_flags   TEXT[] DEFAULT '{}',

    PRIMARY KEY (instrument_id, trade_date)
) PARTITION BY RANGE (trade_date);

-- Create partitions for recent years
CREATE TABLE daily_prices_2020 PARTITION OF daily_prices
    FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');
CREATE TABLE daily_prices_2021 PARTITION OF daily_prices
    FOR VALUES FROM ('2021-01-01') TO ('2022-01-01');
CREATE TABLE daily_prices_2022 PARTITION OF daily_prices
    FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
CREATE TABLE daily_prices_2023 PARTITION OF daily_prices
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE daily_prices_2024 PARTITION OF daily_prices
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE daily_prices_2025 PARTITION OF daily_prices
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE daily_prices_2026 PARTITION OF daily_prices
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Indexes (on each partition automatically)
CREATE INDEX idx_daily_prices_date ON daily_prices(trade_date);
CREATE INDEX idx_daily_prices_source ON daily_prices(source);
```

**Quality Flags:**
- `missing_volume`: Volume data not available
- `missing_ohlc`: Only close price available
- `stale`: Price older than 2 trading days
- `adjusted_estimated`: Adj close calculated, not from source

---

## 4. Fundamentals (Financial Snapshots)

Point-in-time fundamental data snapshots.

```sql
CREATE TABLE fundamentals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id   UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,

    -- Reporting Period
    period_type     VARCHAR(10) NOT NULL,        -- annual, quarterly, ttm
    period_end      DATE NOT NULL,               -- End of fiscal period
    fiscal_year     INTEGER,
    fiscal_quarter  INTEGER,

    -- Valuation
    market_cap      BIGINT,                      -- In USD
    enterprise_value BIGINT,
    shares_outstanding BIGINT,
    float_shares    BIGINT,

    -- Valuation Ratios
    pe_trailing     DECIMAL(10, 4),
    pe_forward      DECIMAL(10, 4),
    peg_ratio       DECIMAL(10, 4),
    price_to_book   DECIMAL(10, 4),
    price_to_sales  DECIMAL(10, 4),
    ev_to_ebitda    DECIMAL(10, 4),

    -- Income Statement
    revenue         BIGINT,
    gross_profit    BIGINT,
    operating_income BIGINT,
    net_income      BIGINT,
    ebitda          BIGINT,
    eps             DECIMAL(10, 4),
    eps_diluted     DECIMAL(10, 4),

    -- Margins
    gross_margin    DECIMAL(10, 6),
    operating_margin DECIMAL(10, 6),
    profit_margin   DECIMAL(10, 6),

    -- Balance Sheet
    total_assets    BIGINT,
    total_liabilities BIGINT,
    total_equity    BIGINT,
    total_debt      BIGINT,
    cash            BIGINT,

    -- Returns
    roe             DECIMAL(10, 6),              -- Return on Equity
    roa             DECIMAL(10, 6),              -- Return on Assets
    roic            DECIMAL(10, 6),              -- Return on Invested Capital

    -- Leverage
    debt_to_equity  DECIMAL(10, 4),
    debt_to_ebitda  DECIMAL(10, 4),
    current_ratio   DECIMAL(10, 4),
    quick_ratio     DECIMAL(10, 4),

    -- Dividend
    dividend_yield  DECIMAL(10, 6),
    payout_ratio    DECIMAL(10, 6),

    -- Data Lineage
    source          VARCHAR(50) NOT NULL,
    source_id       VARCHAR(100),
    asof            TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    quality_flags   TEXT[] DEFAULT '{}',
    extra           JSONB DEFAULT '{}',

    -- Constraints
    UNIQUE(instrument_id, period_type, period_end)
);

-- Indexes
CREATE INDEX idx_fundamentals_instrument ON fundamentals(instrument_id);
CREATE INDEX idx_fundamentals_period ON fundamentals(period_end DESC);
CREATE INDEX idx_fundamentals_latest ON fundamentals(instrument_id, period_type, period_end DESC);

-- Screener indexes
CREATE INDEX idx_fundamentals_market_cap ON fundamentals(market_cap) WHERE market_cap IS NOT NULL;
CREATE INDEX idx_fundamentals_pe ON fundamentals(pe_trailing) WHERE pe_trailing IS NOT NULL;
CREATE INDEX idx_fundamentals_roe ON fundamentals(roe) WHERE roe IS NOT NULL;
```

**Quality Flags:**
- `partial_data`: Some fields missing
- `stale_quarterly`: Older than 4 months
- `estimated`: Values estimated/calculated
- `currency_converted`: Converted from foreign currency

---

## 5. SEC Filings

SEC EDGAR filings with metadata.

```sql
CREATE TABLE filings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id   UUID REFERENCES instruments(id) ON DELETE SET NULL,

    -- SEC Identifiers
    cik             VARCHAR(10) NOT NULL,
    accession_number VARCHAR(25) NOT NULL UNIQUE,

    -- Filing Info
    form_type       VARCHAR(20) NOT NULL,        -- 10-K, 10-Q, 8-K, etc.
    filing_date     DATE NOT NULL,
    accepted_date   TIMESTAMP WITH TIME ZONE,

    -- Document Info
    primary_document VARCHAR(255),               -- Main document filename
    primary_doc_url VARCHAR(500),

    -- Content
    title           TEXT,
    description     TEXT,
    summary         TEXT,                        -- AI-generated or extracted

    -- Flags
    is_amended      BOOLEAN DEFAULT false,
    amendment_of    UUID REFERENCES filings(id),

    -- Data Lineage
    source          VARCHAR(50) NOT NULL DEFAULT 'sec_edgar',
    asof            TIMESTAMP WITH TIME ZONE,
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    quality_flags   TEXT[] DEFAULT '{}',
    extra           JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_filings_instrument ON filings(instrument_id);
CREATE INDEX idx_filings_cik ON filings(cik);
CREATE INDEX idx_filings_form ON filings(form_type);
CREATE INDEX idx_filings_date ON filings(filing_date DESC);
CREATE INDEX idx_filings_instrument_form ON filings(instrument_id, form_type, filing_date DESC);
```

---

## 6. Macro Series (FRED Data)

Economic time series from FRED.

```sql
CREATE TABLE macro_series (
    id              VARCHAR(50) PRIMARY KEY,     -- FRED series ID (e.g., CPIAUCSL)

    -- Metadata
    title           VARCHAR(255) NOT NULL,
    units           VARCHAR(100),
    frequency       VARCHAR(20),                 -- daily, weekly, monthly, etc.
    seasonal_adjustment VARCHAR(50),

    -- Data Lineage
    source          VARCHAR(50) NOT NULL DEFAULT 'fred',
    last_updated    TIMESTAMP WITH TIME ZONE,
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE macro_observations (
    series_id       VARCHAR(50) NOT NULL REFERENCES macro_series(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    value           DECIMAL(20, 6),

    -- Data Lineage
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (series_id, observation_date)
);

-- Indexes
CREATE INDEX idx_macro_obs_date ON macro_observations(observation_date DESC);
```

---

## 7. News Items

Aggregated news from multiple sources.

```sql
CREATE TABLE news_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title           TEXT NOT NULL,
    summary         TEXT,
    url             VARCHAR(1000) NOT NULL,
    image_url       VARCHAR(1000),

    -- Metadata
    published_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    source_name     VARCHAR(100),                -- Publisher name
    author          VARCHAR(255),

    -- Classification
    sentiment       DECIMAL(5, 4),               -- -1 to 1 if available

    -- Related Instruments
    instrument_ids  UUID[] DEFAULT '{}',
    tickers         TEXT[] DEFAULT '{}',

    -- Data Lineage
    source          VARCHAR(50) NOT NULL,        -- gdelt, finnhub, rss
    source_id       VARCHAR(255),
    ingested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    quality_flags   TEXT[] DEFAULT '{}',
    extra           JSONB DEFAULT '{}',

    -- Deduplication
    content_hash    VARCHAR(64),
    UNIQUE(url)
);

-- Indexes
CREATE INDEX idx_news_published ON news_items(published_at DESC);
CREATE INDEX idx_news_instruments ON news_items USING gin(instrument_ids);
CREATE INDEX idx_news_tickers ON news_items USING gin(tickers);
CREATE INDEX idx_news_content_hash ON news_items(content_hash);
```

---

## 8. Watchlists

User watchlists for tracking securities.

```sql
CREATE TABLE watchlists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- For MVP, no user auth - single default watchlist
    user_id         UUID,                        -- Null for MVP

    -- Metadata
    name            VARCHAR(100) NOT NULL DEFAULT 'Default',
    description     TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE watchlist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id    UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    instrument_id   UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,

    -- Display
    sort_order      INTEGER DEFAULT 0,
    notes           TEXT,

    -- Timestamps
    added_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(watchlist_id, instrument_id)
);

-- Indexes
CREATE INDEX idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_instrument ON watchlist_items(instrument_id);
```

---

## 9. Portfolios & Transactions

Portfolio tracking with transaction history.

```sql
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,                        -- Null for MVP

    -- Metadata
    name            VARCHAR(100) NOT NULL DEFAULT 'Main Portfolio',
    description     TEXT,
    currency        VARCHAR(3) DEFAULT 'USD',
    is_default      BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id    UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    instrument_id   UUID NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,

    -- Transaction Details
    transaction_type VARCHAR(20) NOT NULL,       -- buy, sell, dividend, split
    transaction_date DATE NOT NULL,
    quantity        DECIMAL(20, 8) NOT NULL,
    price           DECIMAL(20, 6) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',
    fees            DECIMAL(20, 6) DEFAULT 0,

    -- Computed
    total_amount    DECIMAL(20, 6) GENERATED ALWAYS AS
                    (quantity * price + COALESCE(fees, 0)) STORED,

    -- Notes
    notes           TEXT,

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CHECK (quantity != 0),
    CHECK (price >= 0)
);

-- Indexes
CREATE INDEX idx_transactions_portfolio ON transactions(portfolio_id);
CREATE INDEX idx_transactions_instrument ON transactions(instrument_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
```

---

## 10. Alerts (v1.0+)

Price and fundamental alerts.

```sql
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,                        -- Null for MVP
    instrument_id   UUID REFERENCES instruments(id) ON DELETE CASCADE,

    -- Alert Definition
    alert_type      VARCHAR(50) NOT NULL,        -- price_above, price_below, etc.
    condition       JSONB NOT NULL,              -- {field: "price", operator: ">", value: 150}

    -- Status
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_triggered  TIMESTAMP WITH TIME ZONE,
    trigger_count   INTEGER DEFAULT 0,

    -- Notification
    notification_method VARCHAR(20),             -- email, webhook, ui

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alerts_instrument ON alerts(instrument_id) WHERE is_active = true;
CREATE INDEX idx_alerts_active ON alerts(is_active) WHERE is_active = true;
```

---

## 11. Ingestion Log

Track data ingestion runs for debugging.

```sql
CREATE TABLE ingestion_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Run Info
    run_type        VARCHAR(50) NOT NULL,        -- prices, fundamentals, filings
    source          VARCHAR(50) NOT NULL,
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP WITH TIME ZONE,

    -- Results
    status          VARCHAR(20) NOT NULL DEFAULT 'running', -- running, success, failed
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors          INTEGER DEFAULT 0,

    -- Details
    error_details   JSONB DEFAULT '[]',

    -- Constraints
    CHECK (status IN ('running', 'success', 'failed', 'partial'))
);

-- Indexes
CREATE INDEX idx_ingestion_log_type ON ingestion_log(run_type, started_at DESC);
```

---

## 12. Views for Common Queries

### Latest Fundamentals Per Instrument

```sql
CREATE VIEW v_latest_fundamentals AS
SELECT DISTINCT ON (instrument_id)
    f.*,
    i.name AS instrument_name,
    l.ticker
FROM fundamentals f
JOIN instruments i ON f.instrument_id = i.id
LEFT JOIN listings l ON i.id = l.instrument_id AND l.is_primary = true
WHERE f.period_type = 'ttm'
ORDER BY instrument_id, period_end DESC;
```

### Instrument with Primary Ticker

```sql
CREATE VIEW v_instruments_with_ticker AS
SELECT
    i.*,
    l.ticker AS primary_ticker,
    l.exchange AS primary_exchange
FROM instruments i
LEFT JOIN listings l ON i.id = l.instrument_id AND l.is_primary = true
WHERE i.is_active = true;
```

### Watchlist with Latest Prices

```sql
CREATE VIEW v_watchlist_with_prices AS
SELECT
    wi.watchlist_id,
    i.id AS instrument_id,
    i.name,
    l.ticker,
    p.close AS last_price,
    p.trade_date AS price_date,
    p.source AS price_source
FROM watchlist_items wi
JOIN instruments i ON wi.instrument_id = i.id
LEFT JOIN listings l ON i.id = l.instrument_id AND l.is_primary = true
LEFT JOIN LATERAL (
    SELECT close, trade_date, source
    FROM daily_prices
    WHERE instrument_id = i.id
    ORDER BY trade_date DESC
    LIMIT 1
) p ON true
ORDER BY wi.sort_order, wi.added_at;
```

---

## 13. Migrations Strategy

Using Alembic for migrations:

```
alembic/
├── alembic.ini
├── env.py
└── versions/
    ├── 001_initial_schema.py
    ├── 002_add_daily_prices_partitions.py
    ├── 003_add_indexes.py
    └── ...
```

Each migration:
- Has upgrade() and downgrade() functions
- Is tested in CI
- Includes data migration if needed

---

## 14. Data Quality Rules

Enforced at ingestion time:

| Table | Rule | Action |
|-------|------|--------|
| instruments | Name required | Reject |
| instruments | CIK format valid | Flag |
| daily_prices | Close required | Reject |
| daily_prices | Date not future | Reject |
| fundamentals | Period end not future | Reject |
| filings | Accession number format | Validate |
| news_items | URL required | Reject |
| news_items | Published date reasonable | Flag |

Quality flags are stored, never silently dropped.
