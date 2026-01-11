# OpenTerm

**Bloomberg Terminal-style financial platform using free data sources.**

A professional-grade terminal providing real financial data through a keyboard-driven, multi-panel interface with Bloomberg-style commands, real-time streaming, and advanced analytics.

## Features

### Multi-Panel Workspace
- **4 independent panels** in configurable layouts (1x1, 2x1, 1x2, 2x2)
- **Per-panel context** - each panel maintains its own ticker and state
- **Keyboard navigation** - F1-F4 to focus panels, Alt+1-4 for layouts
- **Panel maximization** - Alt+Enter to fullscreen, Escape to restore

### Real-Time Streaming
- **WebSocket infrastructure** for live data updates
- **Multi-source aggregation** - Alpha Vantage, Yahoo Finance, Polygon.io
- **Crypto streaming** - Real-time prices via Binance WebSocket (free, no API key)
- **Order book visualization** - Live bid/ask depth for crypto pairs
- **Ticker tape** - Scrolling quotes for major indices and stocks

### Charting & Technical Analysis
- **Candlestick charts** with OHLCV data
- **Technical indicators**: RSI, MACD, Bollinger Bands, SMA, EMA
- **Drawing tools**: Horizontal lines, trendlines, text annotations
- **Compare mode**: Overlay up to 5 securities with normalized returns
- **Multiple timeframes**: 1D, 1W, 1M, 3M, 6M, 1Y, 5Y

### Options & Derivatives
- **Options chain** with real-time Greeks (Delta, Gamma, Theta, Vega, Rho)
- **Black-Scholes pricing** model
- **Implied volatility** display
- **Straddle view** - calls and puts side by side
- **ITM/OTM highlighting**

### Market Data & Research
- **Security search**: Fast autocomplete across US equities
- **Fundamentals**: Income statement, balance sheet, cash flow, ratios
- **SEC filings**: 10-K, 10-Q, 8-K from EDGAR
- **Company news**: Ticker-specific news via Finnhub
- **Market news**: General market headlines
- **Insider trading**: Form 4 filings with cluster detection

### Social & Sentiment Analysis
- **Reddit sentiment** - r/wallstreetbets and r/stocks analysis
- **Twitter/X sentiment** - Real-time tweet analysis
- **StockTwits** bull/bear ratio
- **WSB trending rank**
- **News sentiment scoring**

### Market Overview
- **Sector heatmap** - S&P 500 sector performance visualization
- **Color-coded by performance** - intensity shows magnitude

### Calendars & Events
- **Economic calendar**: Upcoming releases (CPI, GDP, NFP) with forecasts
- **Earnings calendar**: BMO/AMC timing, EPS estimates vs actuals

### Workflow Tools
- **Alerts system**: Price, volume, news, and earnings alerts
- **Saved workspaces**: 5 built-in templates + custom workspace saving
- **Watchlist**: Track favorite securities with quick access

### Portfolio & Analytics
- **Portfolio manager**: Holdings, cost basis, P&L tracking
- **Performance analysis**: Time-weighted returns, benchmark comparison
- **Attribution**: Sector allocation, security contribution, factor analysis
- **Factor exposure**: Fama-French 5-factor model visualization
- **Correlation matrix**: Security correlation heat map
- **Stock screener**: Filter by P/E, market cap, sector

### Macro & Fixed Income
- **Macro dashboard**: GDP, inflation, unemployment from FRED
- **Yield curve**: Treasury curve visualization (1M to 30Y)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- (Optional) FRED API key for macro data
- (Optional) Finnhub API key for news
- (Optional) Alpha Vantage API key for real-time quotes

### Run

```bash
# Clone the repository
git clone <repo-url>
cd openterm

# Copy environment template
cp .env.example .env

# Start all services
docker compose up

# In another terminal, seed the database (first time only)
docker compose exec backend python -m scripts.seed_data
```

Open http://localhost:3000

## Cloud Deployment

Deploy to production with Vercel (frontend) and Railway (backend).

### Quick Deploy (10 minutes)

1. **Backend (Railway)**
   - Go to [railway.app](https://railway.app)
   - Deploy from GitHub, set root to `backend`
   - Add PostgreSQL and Redis plugins
   - Copy your Railway URL

2. **Frontend (Vercel)**
   - Go to [vercel.com](https://vercel.com)
   - Import repo, set root to `frontend`
   - Set `NEXT_PUBLIC_API_URL` to your Railway URL
   - Deploy

3. **Connect**
   - In Railway, set `FRONTEND_URL` to your Vercel URL

See [docs/QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md) for step-by-step guide.

### Automated Deployment

```bash
# Install CLIs
npm i -g vercel @railway/cli

# Setup (first time)
./scripts/setup-deployment.sh

# Deploy
./scripts/deploy-all.sh --prod
```

### CI/CD

GitHub Actions workflows included:
- **ci.yml**: Run tests on every PR
- **deploy.yml**: Deploy to production on merge to main
- **preview.yml**: Create preview deployments for PRs

Set these secrets in GitHub:
- `VERCEL_TOKEN`
- `RAILWAY_TOKEN`

Full deployment docs: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Commands

### Security Functions

| Command | Description |
|---------|-------------|
| `AAPL` | Open security overview |
| `AAPL GP` or `AAPL CHART` | Price chart with indicators |
| `AAPL FA` | Fundamentals (financials) |
| `AAPL FILINGS` | SEC filings |
| `AAPL NEWS` | Company-specific news |
| `AAPL COMP MSFT GOOGL` | Compare multiple securities |

### Market Functions

| Command | Description |
|---------|-------------|
| `N` or `MARKET_NEWS` | Market-wide news |
| `ECO` | Economic calendar |
| `EARN` or `EARNINGS` | Earnings calendar |
| `YCRV` or `YIELD` | Yield curve |
| `MACRO` | Macroeconomic data |
| `SCREEN` or `SCREENER` | Stock screener |
| `CORR` or `CORRELATION` | Correlation matrix |
| `HEATMAP` or `MKTS` | Sector heatmap |

### Derivatives & Crypto

| Command | Description |
|---------|-------------|
| `OPTIONS AAPL` or `OPT AAPL` | Options chain with Greeks |
| `ORDERBOOK` or `OB BTCUSDT` | Crypto order book |

### Alternative Data

| Command | Description |
|---------|-------------|
| `SENTIMENT AAPL` or `SENT AAPL` | Social sentiment analysis |
| `INSIDER` or `FORM4` | Insider trading tracker |

### Workflow Functions

| Command | Description |
|---------|-------------|
| `WL` or `WATCHLIST` | Watchlist manager |
| `WL ADD AAPL` | Add to watchlist |
| `PORT` or `PORTFOLIO` | Portfolio manager |
| `ALERT` or `ALT` | Alerts manager |
| `LP` or `LAUNCHPAD` | Saved workspaces |
| `HL` or `HELP` | Help & function catalog |
| `STATUS` | System status |

## Keyboard Shortcuts

### Panel Navigation

| Key | Action |
|-----|--------|
| `F1-F4` | Focus panel 1-4 |
| `Alt+1` | Single panel layout |
| `Alt+2` | 2-column layout |
| `Alt+3` | 2-row layout |
| `Alt+4` | 2x2 grid layout |
| `Alt+Enter` | Maximize focused panel |
| `Escape` | Restore / Cancel |

### Command Bar

| Key | Action |
|-----|--------|
| `/` | Focus command bar |
| `Tab` | Accept autocomplete |
| `Up/Down` | Navigate suggestions/history |
| `Enter` | Execute command |
| `Escape` | Clear input |

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │◄──►│   Backend   │───►│  Postgres   │
│  (Next.js)  │ WS │  (FastAPI)  │    │   + Redis   │
└─────────────┘    └──────┬──────┘    └─────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   REST API  │  │  WebSocket  │  │  External   │
│  Endpoints  │  │  Streaming  │  │  Sources    │
└─────────────┘  └─────────────┘  └─────────────┘
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │ Stooq │ FRED │ EDGAR │ Yahoo │ Finnhub │ Binance   │
              │ Alpha Vantage │ Polygon.io │ Reddit │ Twitter     │
              └─────────────────────────────────────────────────────┘
```

## Data Sources

| Domain | Source | Cost | Real-Time |
|--------|--------|------|-----------|
| Equities | Alpha Vantage | Free | Yes (5/min) |
| Equities | Yahoo Finance | Free | Yes |
| Equities | Polygon.io | Free | Yes (WebSocket) |
| Crypto | Binance | Free | Yes (no API key) |
| Fundamentals | Yahoo Finance | Free | No |
| Filings | SEC EDGAR | Free | Yes |
| Macro Data | FRED | Free | Daily |
| News | Finnhub | Free tier | Yes |
| Sentiment | Reddit API | Free | Yes |
| Sentiment | Twitter API | Free tier | Yes |

All sources are free. See `docs/C_DATA_SOURCES.md` for details.

## Project Structure

```
openterm/
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── api/      # REST endpoints
│   │   ├── adapters/ # External source adapters
│   │   ├── core/     # Config, DB, Redis
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   └── websocket/# WebSocket streaming
│   ├── alembic/      # Database migrations
│   └── tests/        # Unit & contract tests
├── frontend/         # Next.js frontend
│   └── src/
│       ├── app/      # Pages
│       ├── components/
│       │   ├── panels/    # All panel components
│       │   ├── chart/     # Chart-related components
│       │   └── workspace/ # Multi-panel workspace
│       ├── context/  # React context (Workspace, Alerts)
│       ├── hooks/    # Custom hooks (useRealtimeStream)
│       ├── types/    # TypeScript definitions
│       └── lib/      # API client, command parser
├── docs/             # Architecture & specs
└── docker-compose.yml
```

## Documentation

| Document | Description |
|----------|-------------|
| [A_PRODUCT_SPEC.md](docs/A_PRODUCT_SPEC.md) | Product requirements |
| [B_ARCHITECTURE.md](docs/B_ARCHITECTURE.md) | System architecture |
| [C_DATA_SOURCES.md](docs/C_DATA_SOURCES.md) | Data source details |
| [D_DATA_MODEL.md](docs/D_DATA_MODEL.md) | Database schema |
| [E_API_SPEC.md](docs/E_API_SPEC.md) | REST API specification |
| [F_COMMAND_SPEC.md](docs/F_COMMAND_SPEC.md) | Terminal command grammar |

## Development

```bash
# Run tests
make test

# Lint code
make lint

# View logs
make logs

# Database shell
make psql

# Rebuild containers
make build
```

## Saved Workspaces

OpenTerm includes 5 built-in workspace templates:

| Template | Panels |
|----------|--------|
| Trading View | Chart, News, Watchlist, Overview |
| Research View | Fundamentals, Filings, Chart, News |
| Macro View | Macro, Yield Curve, Econ Calendar, Market News |
| Portfolio View | Portfolio, Watchlist, Chart, News |
| Screener View | Screener, Chart, Fundamentals, News |

Access via `LP` or `LAUNCHPAD` command. Save custom workspaces for your workflow.

## New Features

### Options Analytics
Full options chain with:
- Black-Scholes pricing model
- Greeks calculation (Delta, Gamma, Theta, Vega, Rho)
- Implied volatility display
- Straddle/Calls/Puts view toggle
- ITM highlighting

Access via `OPTIONS AAPL` or `OPT AAPL`.

### Social Sentiment
Real-time sentiment analysis from:
- Reddit (r/wallstreetbets, r/stocks, r/investing)
- Twitter/X mentions
- StockTwits bull/bear ratio
- News sentiment

Access via `SENTIMENT AAPL` or `SENT AAPL`.

### Insider Trading
Track Form 4 filings:
- Recent insider transactions
- Buy/sell clustering detection
- Bullish/bearish signals
- Filter by ticker or view all

Access via `INSIDER` or `FORM4`.

### Market Heatmap
Sector performance visualization:
- All 11 S&P 500 sectors
- Color-coded by performance
- Intensity shows magnitude
- Real-time updates via WebSocket

Access via `HEATMAP` or `MKTS`.

### Crypto Order Book
Real-time order book for crypto:
- Binance WebSocket (free, no API key)
- Top 10 bids and asks
- Depth visualization
- Spread calculation

Access via `ORDERBOOK BTCUSDT` or `OB ETHUSDT`.

## Alerts

Set alerts for:
- **Price**: Above, below, or crosses threshold
- **Volume**: Spike detection
- **News**: Any news for a ticker
- **Earnings**: Upcoming earnings reports

Access via `ALERT` or `ALT` command.

## Known Limitations

1. **Real-time rate limits**: Free tier APIs have rate limits
2. **US equities focus**: International coverage limited
3. **Single user**: No authentication
4. **Mock data fallback**: Some features use mock data when APIs unavailable

## Tech Stack

- **Frontend**: Next.js, TypeScript, TailwindCSS, lightweight-charts
- **Backend**: FastAPI, SQLAlchemy, Redis, aiohttp
- **Database**: PostgreSQL
- **Real-Time**: WebSocket (FastAPI + React hooks)
- **Deployment**: Vercel (frontend), Railway (backend), Docker Compose (local)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `make test`
4. Submit a pull request

## License

MIT License - See LICENSE file.

## Acknowledgments

- [Stooq](https://stooq.com) - Historical price data
- [FRED](https://fred.stlouisfed.org) - Economic data
- [SEC EDGAR](https://www.sec.gov/edgar) - Official filings
- [Finnhub](https://finnhub.io) - News data
- [Binance](https://binance.com) - Crypto WebSocket (free)
- [Alpha Vantage](https://alphavantage.co) - Real-time quotes
- [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts)
