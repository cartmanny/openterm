/**
 * API client for OpenTerm backend.
 */

const API_BASE = '/api/v1';

export interface ApiError {
  code: string;
  message: string;
  source?: string;
  retryable: boolean;
}

export interface InstrumentSearchResult {
  id: string;
  ticker: string;
  name: string;
  exchange: string | null;
  security_type: string;
  sector: string | null;
  match_score: number;
}

export interface Bar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  adj_close: number | null;
  volume: number | null;
}

export interface PriceData {
  instrument_id: string;
  ticker: string;
  currency: string;
  bars: Bar[];
}

export interface FundamentalsSnapshot {
  instrument_id: string;
  ticker: string;
  period_type: string;
  period_end: string;
  valuation: {
    market_cap: number | null;
    pe_trailing: number | null;
    pe_forward: number | null;
    price_to_book: number | null;
    ev_to_ebitda: number | null;
  };
  income: {
    revenue: number | null;
    gross_profit: number | null;
    net_income: number | null;
    eps: number | null;
  };
  margins: {
    gross_margin: number | null;
    operating_margin: number | null;
    profit_margin: number | null;
  };
  returns: {
    roe: number | null;
    roa: number | null;
    roic: number | null;
  };
  leverage: {
    debt_to_equity: number | null;
    current_ratio: number | null;
  };
  dividend: {
    dividend_yield: number | null;
  };
}

export interface Filing {
  id: string;
  ticker: string | null;
  cik: string;
  form_type: string;
  filing_date: string;
  accession_number: string;
  title: string | null;
  primary_doc_url: string | null;
}

export interface WatchlistItem {
  instrument_id: string;
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  added_at: string;
}

export interface WatchlistData {
  id: string;
  name: string;
  items: WatchlistItem[];
  item_count: number;
}

export interface ResponseMeta {
  source: string | null;
  asof: string | null;
  freshness: string | null;
  cached: boolean;
}

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

// News types
export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image_url: string | null;
  published_at: string;
  category: string;
  related_symbols: string[];
}

export interface MarketNewsResponse {
  articles: NewsArticle[];
  category: string;
  meta: ResponseMeta;
}

export interface CompanyNewsResponse {
  symbol: string;
  articles: NewsArticle[];
  meta: ResponseMeta;
}

// Macro types
export interface MacroObservation {
  date: string;
  value: number | null;
  series_id: string;
}

export interface MacroSeriesData {
  series_id: string;
  title: string;
  units: string;
  frequency: string;
  observations: MacroObservation[];
}

export interface MacroSeriesResponse {
  data: MacroSeriesData;
  meta: ResponseMeta;
}

export interface YieldPoint {
  yield: number | null;
  date: string | null;
}

export interface YieldCurveData {
  curve: Record<string, YieldPoint>;
  is_inverted: boolean;
  spread_2y_10y: number | null;
}

export interface YieldCurveResponse {
  data: YieldCurveData;
  meta: ResponseMeta;
}

// Screener types
export interface ScreenerFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface ScreenerResult {
  instrument_id: string;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  pe_trailing: number | null;
  roe: number | null;
  profit_margin: number | null;
  dividend_yield: number | null;
  price: number | null;
  return_1m: number | null;
  return_1y: number | null;
}

export interface ScreenerResponse {
  data: {
    results: ScreenerResult[];
    total_count: number;
    filters_applied: number;
  };
  meta: ResponseMeta;
}

// Portfolio types
export interface Holding {
  instrument_id: string;
  ticker: string;
  name: string | null;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  market_value: number | null;
  cost_basis: number;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
  weight: number | null;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_unrealized_pnl: number;
  total_unrealized_pnl_pct: number;
  total_realized_pnl: number;
  num_holdings: number;
  num_transactions: number;
}

export interface PortfolioData {
  id: string;
  name: string;
  description: string | null;
  currency: string;
}

export interface PortfolioDetailResponse {
  portfolio: PortfolioData;
  summary: PortfolioSummary;
  holdings: Holding[];
  meta: ResponseMeta;
}

export interface PortfolioAnalytics {
  return_1d: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_ytd: number | null;
  return_1y: number | null;
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  beta: number | null;
  alpha: number | null;
  volatility: number | null;
  max_drawdown: number | null;
  var_95: number | null;
  top_holdings: { ticker: string; weight: number }[];
  sector_allocation: Record<string, number>;
}

export interface PortfolioAnalyticsResponse {
  portfolio_id: string;
  portfolio_name: string;
  analytics: PortfolioAnalytics;
  meta: ResponseMeta;
}

// Correlation types
export interface CorrelationPair {
  ticker1: string;
  ticker2: string;
  correlation: number;
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][];
  pairs: CorrelationPair[];
}

export interface CorrelationResponse {
  data: CorrelationMatrix;
  period: string;
  method: string;
  start_date: string;
  end_date: string;
  meta: ResponseMeta;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; meta: ResponseMeta }> {
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const json = await response.json();

    if (!response.ok) {
      throw json.error as ApiError;
    }

    return json;
  }

  // Instruments
  async searchInstruments(
    query: string,
    limit: number = 10
  ): Promise<InstrumentSearchResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const result = await this.request<InstrumentSearchResult[]>(
      `/instruments/search?${params}`
    );
    return result.data;
  }

  async getInstrumentByTicker(
    ticker: string
  ): Promise<InstrumentSearchResult> {
    const result = await this.request<InstrumentSearchResult>(
      `/instruments/ticker/${ticker}`
    );
    return result.data;
  }

  // Prices
  async getDailyBars(
    instrumentId: string,
    period: string = '1Y'
  ): Promise<{ data: PriceData; meta: ResponseMeta }> {
    const params = new URLSearchParams({ period });
    return this.request<PriceData>(
      `/prices/${instrumentId}/daily?${params}`
    );
  }

  // Fundamentals
  async getFundamentals(
    instrumentId: string
  ): Promise<{ data: FundamentalsSnapshot; meta: ResponseMeta }> {
    return this.request<FundamentalsSnapshot>(
      `/fundamentals/${instrumentId}`
    );
  }

  // Filings
  async getFilings(
    ticker: string,
    formType?: string,
    limit: number = 20
  ): Promise<Filing[]> {
    const params = new URLSearchParams({
      ticker,
      limit: String(limit),
    });
    if (formType) {
      params.set('form_type', formType);
    }
    const result = await this.request<Filing[]>(`/filings?${params}`);
    return result.data;
  }

  // Watchlist
  async getDefaultWatchlist(): Promise<WatchlistData> {
    const result = await this.request<WatchlistData>('/watchlists/default');
    return result.data;
  }

  async addToWatchlist(
    watchlistId: string,
    ticker: string
  ): Promise<WatchlistItem> {
    const result = await this.request<WatchlistItem>(
      `/watchlists/${watchlistId}/items`,
      {
        method: 'POST',
        body: JSON.stringify({ ticker }),
      }
    );
    return result.data;
  }

  async removeFromWatchlist(
    watchlistId: string,
    instrumentId: string
  ): Promise<void> {
    await this.request(`/watchlists/${watchlistId}/items/${instrumentId}`, {
      method: 'DELETE',
    });
  }

  // Health
  async getHealthSources(): Promise<HealthSources> {
    const url = `${API_BASE}/health/sources`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch health status');
    }
    return response.json();
  }

  // News
  async getMarketNews(
    category: string = 'general',
    limit: number = 20
  ): Promise<MarketNewsResponse> {
    const params = new URLSearchParams({ category, limit: String(limit) });
    const url = `${API_BASE}/news/market?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch market news');
    }
    return response.json();
  }

  async getCompanyNews(
    symbol: string,
    limit: number = 20
  ): Promise<CompanyNewsResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    const url = `${API_BASE}/news/company/${symbol}?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch company news');
    }
    return response.json();
  }

  // Macro
  async getMacroSeries(
    seriesId: string,
    limit?: number
  ): Promise<MacroSeriesResponse> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    const url = `${API_BASE}/macro/series/${seriesId}?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch macro series');
    }
    return response.json();
  }

  async getYieldCurve(): Promise<YieldCurveResponse> {
    const url = `${API_BASE}/macro/yield-curve`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch yield curve');
    }
    return response.json();
  }

  // Screener
  async screenStocks(
    filters: ScreenerFilter[],
    sortBy: string = 'market_cap',
    sortDesc: boolean = true,
    limit: number = 50
  ): Promise<ScreenerResponse> {
    const url = `${API_BASE}/screener/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters,
        sort: { field: sortBy, order: sortDesc ? 'desc' : 'asc' },
        limit,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to run screener');
    }
    return response.json();
  }

  async runScreenerTemplate(template: string): Promise<ScreenerResponse> {
    const url = `${API_BASE}/screener/template/${template}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to run screener template');
    }
    return response.json();
  }

  async getScreenerTemplates(): Promise<Record<string, { name: string; description: string }>> {
    const url = `${API_BASE}/screener/templates`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch screener templates');
    }
    return response.json();
  }

  // Portfolio
  async getPortfolio(portfolioId: string): Promise<PortfolioDetailResponse> {
    const url = `${API_BASE}/portfolio/${portfolioId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio');
    }
    return response.json();
  }

  async getPortfolioAnalytics(portfolioId: string): Promise<PortfolioAnalyticsResponse> {
    const url = `${API_BASE}/portfolio/${portfolioId}/analytics`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio analytics');
    }
    return response.json();
  }

  // Correlation
  async getCorrelation(
    tickers: string[],
    period: string = '1y',
    method: string = 'pearson'
  ): Promise<CorrelationResponse> {
    const params = new URLSearchParams({
      tickers: tickers.join(','),
      period,
      method,
    });
    const url = `${API_BASE}/analytics/correlation?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch correlation');
    }
    return response.json();
  }
}

export const api = new ApiClient();
