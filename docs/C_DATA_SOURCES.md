# OpenTerm Data Source Matrix

## Free Data Sources Only - Verified & Documented

---

## Overview

| Domain | Primary Source | Fallback Source | Coverage |
|--------|---------------|-----------------|----------|
| **Prices & Quotes** | Stooq | Yahoo Finance | US Equities, ETFs |
| **Fundamentals** | Yahoo Finance | Alpha Vantage (free tier) | US Equities |
| **SEC Filings** | SEC EDGAR | - | All SEC filers |
| **Macro Data** | FRED (St. Louis Fed) | - | US Economic Data |
| **News** | GDELT + RSS | Finnhub (free tier) | Global, varies |
| **FX Rates** | FRED | ECB | Major pairs |
| **Yield Curves** | FRED | US Treasury | US Treasuries |

---

## 1. Prices & Quotes

### 1.1 Stooq (PRIMARY)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://stooq.com/q/d/l/` |
| **Auth Method** | None (public) |
| **Rate Limits** | Unknown/undocumented - estimated 100 req/min safe |
| **Data Freshness** | End-of-day (EOD), updated after market close |
| **Coverage** | US stocks, ETFs, major indices, some intl |
| **Response Format** | CSV |
| **License/Terms** | Personal use; unclear commercial terms - mark as "unknown" |
| **Swap-Out Difficulty** | Easy (simple CSV format) |

**Example Request:**
```
GET https://stooq.com/q/d/l/?s=aapl.us&d1=20230101&d2=20240101&i=d
```

**Response Format:**
```csv
Date,Open,High,Low,Close,Volume
2023-01-03,130.28,130.90,124.17,125.07,112117500
```

**Limitations:**
- EOD only (no intraday)
- No fundamentals
- Volume may be missing for some securities
- International coverage inconsistent

**Error Handling:**
- Empty response = ticker not found
- 404 = invalid request format

---

### 1.2 Yahoo Finance (FALLBACK for Prices, PRIMARY for Fundamentals)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://query1.finance.yahoo.com/v8/finance/` |
| **Auth Method** | None (public, but uses cookies/crumb) |
| **Rate Limits** | Aggressive rate limiting - estimated 200 req/hour safe |
| **Data Freshness** | 15-minute delayed quotes, EOD historical |
| **Coverage** | Global stocks, ETFs, mutual funds, indices, crypto |
| **Response Format** | JSON |
| **License/Terms** | Terms prohibit scraping; use for personal/educational only |
| **Swap-Out Difficulty** | Medium (crumb mechanism changes) |

**Example Requests:**

*Historical Data:*
```
GET https://query1.finance.yahoo.com/v8/finance/chart/AAPL
    ?period1=1672531200
    &period2=1704067200
    &interval=1d
```

*Quote:*
```
GET https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL
```

*Fundamentals:*
```
GET https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL
    ?modules=summaryDetail,financialData,defaultKeyStatistics
```

**Limitations:**
- Rate limits can be aggressive
- Crumb/cookie mechanism required
- API structure changes without notice
- Some fields may be null

---

### 1.3 Alpha Vantage (BACKUP - Free Tier)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://www.alphavantage.co/query` |
| **Auth Method** | API Key (free registration) |
| **Rate Limits** | 25 requests/day (free tier) |
| **Data Freshness** | EOD, 15-min delayed intraday |
| **Coverage** | US stocks, forex, crypto |
| **Response Format** | JSON or CSV |
| **License/Terms** | Free tier for personal use, attribution required |
| **Swap-Out Difficulty** | Easy (well-documented API) |

**Example Request:**
```
GET https://www.alphavantage.co/query
    ?function=TIME_SERIES_DAILY
    &symbol=AAPL
    &apikey=YOUR_KEY
```

**Limitations:**
- 25 req/day is extremely limiting
- Use only as emergency fallback
- Premium required for serious usage

---

## 2. Fundamentals

### 2.1 Yahoo Finance (PRIMARY)

*See section 1.2 for base details*

**Fundamentals Endpoints:**

| Module | Data Provided |
|--------|--------------|
| `summaryDetail` | Market cap, P/E, dividend yield, 52w high/low |
| `financialData` | Revenue, profit margins, ROE, ROA |
| `defaultKeyStatistics` | Shares outstanding, float, short ratio |
| `incomeStatementHistory` | Quarterly/annual income statements |
| `balanceSheetHistory` | Quarterly/annual balance sheets |
| `cashflowStatementHistory` | Quarterly/annual cash flows |

**Example Request:**
```
GET https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL
    ?modules=summaryDetail,financialData,defaultKeyStatistics,
             incomeStatementHistory,balanceSheetHistory
```

**Field Mapping:**

| Our Field | Yahoo Field | Notes |
|-----------|-------------|-------|
| market_cap | summaryDetail.marketCap | |
| pe_ratio | summaryDetail.trailingPE | Trailing 12m |
| pe_forward | summaryDetail.forwardPE | |
| eps | defaultKeyStatistics.trailingEps | |
| revenue | financialData.totalRevenue | TTM |
| gross_margin | financialData.grossMargins | |
| operating_margin | financialData.operatingMargins | |
| profit_margin | financialData.profitMargins | |
| roe | financialData.returnOnEquity | |
| roa | financialData.returnOnAssets | |
| debt_to_equity | financialData.debtToEquity | |
| current_ratio | financialData.currentRatio | |

**Limitations:**
- Not all fields available for all securities
- Historical financials limited to 4 years
- Data may lag actual filings by days

---

### 2.2 Financial Modeling Prep (BACKUP - Free Tier)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://financialmodelingprep.com/api/v3/` |
| **Auth Method** | API Key (free registration) |
| **Rate Limits** | 250 requests/day (free tier) |
| **Data Freshness** | Updated from SEC filings |
| **Coverage** | US stocks |
| **Response Format** | JSON |
| **License/Terms** | Free tier for personal use |
| **Swap-Out Difficulty** | Easy |

**Example Request:**
```
GET https://financialmodelingprep.com/api/v3/income-statement/AAPL
    ?limit=4&apikey=YOUR_KEY
```

**Limitations:**
- 250 req/day limits usability
- Use for occasional fallback

---

## 3. SEC Filings

### 3.1 SEC EDGAR (PRIMARY - Official Source)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://www.sec.gov/cgi-bin/browse-edgar` |
| **Data API** | `https://data.sec.gov/` |
| **Auth Method** | None, but requires User-Agent header |
| **Rate Limits** | 10 requests/second (documented) |
| **Data Freshness** | Real-time (filings appear within minutes) |
| **Coverage** | All SEC-registered companies |
| **Response Format** | JSON, XML, HTML |
| **License/Terms** | Public domain |
| **Swap-Out Difficulty** | N/A (only official source) |

**Required Headers:**
```
User-Agent: OpenTerm/0.1 (your-email@example.com)
```

**Key Endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `data.sec.gov/submissions/CIK{cik}.json` | All filings for company |
| `data.sec.gov/cgi-bin/viewer?action=view&cik={cik}&accession_number={acc}` | Filing viewer |
| `www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type={form}&output=atom` | Filings feed |

**Example - Get Submissions:**
```
GET https://data.sec.gov/submissions/CIK0000320193.json
```

**Response Structure:**
```json
{
  "cik": "320193",
  "name": "Apple Inc.",
  "filings": {
    "recent": {
      "accessionNumber": ["0000320193-24-000123", ...],
      "form": ["10-K", "10-Q", ...],
      "filingDate": ["2024-01-15", ...],
      "primaryDocument": ["aapl-20231230.htm", ...]
    }
  }
}
```

**Form Types of Interest:**
- 10-K: Annual report
- 10-Q: Quarterly report
- 8-K: Current report (material events)
- DEF 14A: Proxy statement
- 4: Insider transactions

**CIK Lookup:**
```
GET https://www.sec.gov/cgi-bin/browse-edgar
    ?action=getcompany&company=apple&type=&output=atom
```

---

## 4. Macro / Economic Data

### 4.1 FRED - Federal Reserve Economic Data (PRIMARY)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://api.stlouisfed.org/fred/` |
| **Auth Method** | API Key (free registration) |
| **Rate Limits** | 120 requests/minute |
| **Data Freshness** | Varies by series (real-time for some) |
| **Coverage** | 800,000+ economic time series |
| **Response Format** | JSON, XML |
| **License/Terms** | Free for any use with attribution |
| **Swap-Out Difficulty** | Easy |

**Key Series IDs:**

| Series ID | Description | Frequency |
|-----------|-------------|-----------|
| `CPIAUCSL` | CPI (All Urban Consumers) | Monthly |
| `UNRATE` | Unemployment Rate | Monthly |
| `GDP` | Gross Domestic Product | Quarterly |
| `FEDFUNDS` | Federal Funds Rate | Daily |
| `DGS10` | 10-Year Treasury Rate | Daily |
| `DGS2` | 2-Year Treasury Rate | Daily |
| `T10Y2Y` | 10Y-2Y Spread | Daily |
| `SP500` | S&P 500 (daily close) | Daily |
| `DEXUSEU` | USD/EUR Exchange Rate | Daily |

**Example Request:**
```
GET https://api.stlouisfed.org/fred/series/observations
    ?series_id=CPIAUCSL
    &api_key=YOUR_KEY
    &file_type=json
    &observation_start=2023-01-01
```

**Yield Curve Construction:**
```
Series: DGS1MO, DGS3MO, DGS6MO, DGS1, DGS2, DGS3, DGS5, DGS7, DGS10, DGS20, DGS30
```

---

## 5. News

### 5.1 GDELT Project (PRIMARY)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://api.gdeltproject.org/api/v2/doc/doc` |
| **Auth Method** | None |
| **Rate Limits** | Unknown - estimated 60 req/min safe |
| **Data Freshness** | Real-time (15-min lag) |
| **Coverage** | Global news, 100+ languages |
| **Response Format** | JSON |
| **License/Terms** | Free for research/personal use |
| **Swap-Out Difficulty** | Medium |

**Example Request:**
```
GET https://api.gdeltproject.org/api/v2/doc/doc
    ?query=apple%20inc
    &mode=artlist
    &maxrecords=50
    &format=json
```

**Limitations:**
- Noisy results (not finance-specific)
- May include duplicate articles
- Limited filtering options

---

### 5.2 Finnhub (BACKUP - Free Tier)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://finnhub.io/api/v1/` |
| **Auth Method** | API Key (free registration) |
| **Rate Limits** | 60 requests/minute (free tier) |
| **Data Freshness** | Real-time |
| **Coverage** | US stocks, major markets |
| **Response Format** | JSON |
| **License/Terms** | Free tier for personal use |
| **Swap-Out Difficulty** | Easy |

**Example Request:**
```
GET https://finnhub.io/api/v1/company-news
    ?symbol=AAPL
    &from=2024-01-01
    &to=2024-01-15
    &token=YOUR_KEY
```

**Limitations:**
- 60 req/min limits bulk usage
- Free tier has limited historical depth

---

### 5.3 Company RSS Feeds (SUPPLEMENTAL)

Many companies provide official press release RSS feeds:

| Company | RSS URL Pattern |
|---------|----------------|
| Apple | `https://www.apple.com/newsroom/rss-feed.rss` |
| Microsoft | `https://news.microsoft.com/feed/` |
| Google | `https://blog.google/rss/` |

**Implementation:**
- Maintain a mapping of tickers to known RSS feeds
- Poll periodically (every 15 min)
- Parse with standard RSS/Atom libraries

---

## 6. FX Rates

### 6.1 FRED (PRIMARY)

Uses FRED series for major currency pairs:

| Series ID | Currency Pair |
|-----------|--------------|
| `DEXUSEU` | USD/EUR |
| `DEXJPUS` | JPY/USD |
| `DEXUSUK` | USD/GBP |
| `DEXCHUS` | CNY/USD |
| `DEXCAUS` | CAD/USD |

### 6.2 ECB (BACKUP)

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://data.ecb.europa.eu/data-detail-api/EXR.D.USD.EUR.SP00.A` |
| **Auth Method** | None |
| **Rate Limits** | Generous |
| **Data Freshness** | Daily |

---

## 7. Security Master / Ticker Lists

### 7.1 SEC EDGAR Company Tickers

```
GET https://www.sec.gov/files/company_tickers.json
```

Returns all SEC-registered companies with CIK and ticker.

### 7.2 NASDAQ Trader Symbol Directory

| Attribute | Value |
|-----------|-------|
| **Endpoint Base URL** | `https://api.nasdaq.com/api/screener/stocks` |
| **FTP Alternative** | `ftp://ftp.nasdaqtrader.com/symboldirectory/` |
| **Auth Method** | None |
| **Data Freshness** | Daily updates |
| **Coverage** | All NASDAQ + NYSE listed |

**Files Available:**
- `nasdaqlisted.txt` - NASDAQ-listed securities
- `otherlisted.txt` - NYSE, AMEX, etc.

---

## 8. Source Reliability Matrix

| Source | Reliability | Notes |
|--------|------------|-------|
| SEC EDGAR | ⭐⭐⭐⭐⭐ | Official, stable, documented |
| FRED | ⭐⭐⭐⭐⭐ | Official, stable, documented |
| Stooq | ⭐⭐⭐ | Works but undocumented |
| Yahoo Finance | ⭐⭐ | Frequently changes, may break |
| Alpha Vantage | ⭐⭐⭐⭐ | Documented but heavily limited |
| GDELT | ⭐⭐⭐ | Works but noisy |
| Finnhub | ⭐⭐⭐⭐ | Good docs, reasonable limits |

---

## 9. Recommended Adapter Priority

For each data type, adapters are tried in order:

### Prices
1. Stooq (fast, no auth)
2. Yahoo Finance (backup, has rate limits)
3. Alpha Vantage (emergency only - 25/day)

### Fundamentals
1. Yahoo Finance (most comprehensive free source)
2. Financial Modeling Prep (backup, 250/day)

### Filings
1. SEC EDGAR (only option, official)

### Macro
1. FRED (comprehensive, well-documented)

### News
1. Finnhub (finance-specific, 60/min)
2. GDELT (broad coverage, noisy)
3. RSS feeds (official company news)

---

## 10. Environment Variables for Sources

```env
# API Keys (Free Tier)
ALPHA_VANTAGE_API_KEY=your_key_here
FRED_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
FMP_API_KEY=your_key_here

# Rate Limit Configuration
STOOQ_REQUESTS_PER_MINUTE=60
YAHOO_REQUESTS_PER_HOUR=100
EDGAR_REQUESTS_PER_SECOND=8
FRED_REQUESTS_PER_MINUTE=100
FINNHUB_REQUESTS_PER_MINUTE=50
GDELT_REQUESTS_PER_MINUTE=30

# User Agent for SEC
SEC_USER_AGENT=OpenTerm/0.1 (your-email@example.com)
```

---

## 11. Known Limitations Summary

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No real-time quotes | Price delay 15min-EOD | Show freshness badge |
| Yahoo unreliable | May break unexpectedly | Multiple fallbacks |
| Limited fundamentals | Some metrics missing | Show "N/A" clearly |
| Rate limits | Bulk operations slow | Aggressive caching |
| News noise | Irrelevant results | Keyword filtering |
| No options data | Options chain unavailable | Mark as "experimental" |
| International limited | Coverage gaps | Focus on US first |
