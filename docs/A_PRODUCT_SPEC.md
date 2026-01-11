# OpenTerm Product Specification
## Bloomberg-Style Financial Terminal (Free Data Sources Only)

---

## 1. Target Users

| User Type | Description | Primary Needs |
|-----------|-------------|---------------|
| **Retail Investors** | Individual traders managing personal portfolios | Price tracking, basic fundamentals, news |
| **Finance Students** | Learning financial analysis and terminal UX | Educational access to real data patterns |
| **Independent Analysts** | Small-firm or solo equity researchers | Screening, SEC filings, fundamental analysis |
| **Quantitative Hobbyists** | Building models/backtests with free data | Historical prices, macro data, export capability |
| **Developers** | Building fintech apps needing data layer | API access, modular architecture |

---

## 2. Top 10 Workflows

| # | Workflow | Description | Commands |
|---|----------|-------------|----------|
| 1 | **Quick Quote** | Get current price + change for a ticker | `AAPL`, `AAPL <GO>` |
| 2 | **Price Chart** | View historical price chart (1D-5Y) | `AAPL GP`, `MSFT GP 1Y` |
| 3 | **Fundamentals Deep-Dive** | View income statement, balance sheet, ratios | `AAPL FA`, `AAPL BS`, `AAPL IS` |
| 4 | **SEC Filings Review** | Browse 10-K, 10-Q, 8-K filings | `AAPL FILINGS`, `AAPL 10K` |
| 5 | **News Scan** | Latest news for ticker or market | `AAPL NEWS`, `NEWS TECH` |
| 6 | **Screener** | Filter universe by fundamentals/momentum | `SCREEN PE<20 AND ROE>15` |
| 7 | **Watchlist Management** | Track favorite securities | `WL ADD AAPL`, `WL`, `WL REMOVE MSFT` |
| 8 | **Portfolio Tracking** | P&L, allocation, performance vs benchmark | `PORT`, `PORT PERF` |
| 9 | **Macro Data** | Economic indicators, yield curves | `MACRO CPI`, `YCRV US` |
| 10 | **Correlation Analysis** | Compare securities/watchlist correlation | `CORR AAPL MSFT GOOGL` |

---

## 3. Terminal Command Philosophy

### Core Principles

1. **Ticker-First**: Most commands start with a ticker symbol
2. **Function Suffix**: Action follows ticker (e.g., `AAPL GP` = Apple Graph Price)
3. **Context Memory**: Last-used ticker persists (`GP` alone uses previous ticker)
4. **Fuzzy Resolution**: Partial matches auto-resolve with confirmation
5. **Keyboard-First**: All primary flows accessible without mouse
6. **Panel-Based Output**: Commands populate specific panels, not pages

### Command Structure

```
[TICKER] [FUNCTION] [MODIFIERS]
```

Examples:
- `AAPL` → Overview panel
- `AAPL GP 1Y` → Graph Price, 1 Year
- `SCREEN MKT_CAP>10B AND PE<25` → Screener with filters
- `HELP GP` → Help for Graph Price function

---

## 4. Feature Scope by Version

### MVP (v0.1) - Core Terminal Experience

| Feature | Status | Notes |
|---------|--------|-------|
| Security search + autocomplete | Required | Fuzzy matching |
| Security overview panel | Required | Price, change, basic info |
| Historical price chart | Required | Daily bars, 1M-5Y |
| Basic fundamentals panel | Required | Market cap, P/E, revenue, margins |
| SEC filings viewer | Required | 10-K, 10-Q, 8-K list + detail |
| Terminal command bar | Required | Parse commands, route to panels |
| Watchlist CRUD | Required | Persist in Postgres |
| Source/freshness badges | Required | Show data age + source per panel |
| Single-user mode | Required | No auth for MVP |

### v1.0 - Full Terminal

| Feature | Status | Notes |
|---------|--------|-------|
| All MVP features | Required | |
| Screener with filters | Required | Market cap, sector, multiples, momentum |
| Portfolio management | Required | Holdings, transactions, P&L |
| Portfolio analytics | Required | Returns, vol, drawdown, beta |
| Correlation matrix | Required | For watchlist |
| Macro data (FRED) | Required | CPI, GDP, unemployment, rates |
| Yield curve visualization | Required | US Treasury curve |
| News aggregation | Required | RSS + GDELT |
| Keyboard navigation | Required | Full keyboard-first UX |
| Command history + autocomplete | Required | |
| Export to CSV | Required | Screener results, price data |
| Multi-panel layouts | Required | Configure panel arrangement |

### v2.0 - Platform Extension

| Feature | Status | Notes |
|---------|--------|-------|
| All v1.0 features | Required | |
| User authentication | Required | Multi-user support |
| Alerts system | Required | Price/fundamental thresholds |
| Custom watchlists (multiple) | Required | |
| API key management | Required | For external integrations |
| Backtest framework | Optional | Simple strategy backtesting |
| Options chain viewer | Experimental | Limited free data |
| International markets | Experimental | Coverage varies by source |
| Custom formula fields | Optional | User-defined calculations |
| Webhook integrations | Optional | Push alerts to external services |

---

## 5. Non-Functional Requirements

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Command parse + route | < 50ms | Client-side |
| Search results | < 500ms | With caching |
| Price chart load | < 1s | With cached data |
| Fundamentals load | < 1s | With cached data |
| Screener (1000 results) | < 3s | Server-side filtering |

### Data Freshness Expectations

| Data Type | Expected Freshness | Display |
|-----------|-------------------|---------|
| Prices | 15min-EOD delayed | Badge: "15min delayed" or "EOD" |
| Fundamentals | Quarterly | Badge: "As of Q3 2024" |
| SEC Filings | Same-day | Badge: "Filed: 2024-01-15" |
| News | Minutes-hours | Badge: "2h ago" |
| Macro | Monthly/Quarterly | Badge: "Dec 2024" |

### Reliability

- **Source Failover**: Primary + fallback source per data domain
- **Graceful Degradation**: Show partial data with warning badges
- **Rate Limit Handling**: Queue requests, never fail user-facing calls
- **Offline Indicators**: Clear UI when source is unavailable

---

## 6. UI/UX Requirements

### Layout

```
+----------------------------------------------------------+
| [Command Bar]                                    [?] [=]  |
+----------------------------------------------------------+
|                    |                    |                 |
|   OVERVIEW PANEL   |   CHART PANEL      |   NEWS PANEL    |
|                    |                    |                 |
|                    |                    |                 |
+--------------------+--------------------+-----------------+
|                    |                                      |
|   WATCHLIST        |   FUNDAMENTALS / FILINGS PANEL       |
|                    |                                      |
+--------------------+--------------------------------------+
```

### Panel Types

1. **Overview Panel**: Ticker, price, change, company info, source badge
2. **Chart Panel**: Price chart with period selector, volume bars
3. **Fundamentals Panel**: Key metrics table, financial statements tabs
4. **Filings Panel**: List of SEC filings, preview pane
5. **News Panel**: Chronological news items with source
6. **Watchlist Panel**: User's tracked securities with quick stats
7. **Screener Panel**: Filter inputs, results table, export button
8. **Portfolio Panel**: Holdings, P&L, allocation charts
9. **Macro Panel**: Economic series chart, data table

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus command bar |
| `Escape` | Clear command bar / close modal |
| `Tab` | Autocomplete / next field |
| `Up/Down` | Navigate autocomplete / history |
| `Enter` | Execute command |
| `1-9` | Focus panel by number |
| `?` | Show help |

---

## 7. Out of Scope (Explicit Exclusions)

- **Real-time streaming quotes**: Not available for free
- **Level 2 / Order book data**: Not available for free
- **Options Greeks / chains**: Experimental only (limited free data)
- **Futures / Commodities**: Limited coverage
- **Forex real-time**: Delayed only
- **Crypto real-time**: Possible but deprioritized
- **Algorithmic trading execution**: Not in scope
- **Broker integration**: Not in scope
- **Mobile app**: Web-only for now

---

## 8. Success Criteria

### MVP Launch Criteria

- [ ] Can search and find any US equity/ETF in security master
- [ ] Can view 5-year daily price chart for any security
- [ ] Can view basic fundamentals for any security
- [ ] Can browse SEC filings for any security
- [ ] Command bar parses and routes all MVP commands
- [ ] Watchlist persists across sessions
- [ ] All panels show freshness/source badges
- [ ] Runs locally via Docker Compose
- [ ] All contract tests pass

### Quality Bar

- [ ] No crashes on invalid input
- [ ] Graceful handling of missing data
- [ ] Sub-second response for cached data
- [ ] Clear error messages for all failure modes
