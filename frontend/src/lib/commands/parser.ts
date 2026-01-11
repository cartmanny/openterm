/**
 * Terminal command parser.
 *
 * Supports patterns:
 * - TICKER         -> overview
 * - TICKER GP      -> chart (graph price)
 * - TICKER FA      -> fundamentals
 * - TICKER FILINGS -> SEC filings
 * - TICKER NEWS    -> news
 * - WL             -> watchlist
 * - WL ADD TICKER  -> add to watchlist
 * - MACRO CPI      -> macro data
 * - YCRV           -> yield curve
 * - NEWS           -> market news
 * - SCREEN VALUE   -> stock screener
 * - PORT           -> portfolio
 * - CORR AAPL,MSFT -> correlation
 * - HELP           -> help
 */

export type Command =
  | { type: 'overview'; ticker: string }
  | { type: 'chart'; ticker: string; period: string }
  | { type: 'fundamentals'; ticker: string }
  | { type: 'filings'; ticker: string; formType?: string }
  | { type: 'news'; ticker: string }
  | { type: 'market_news'; category: string }
  | { type: 'macro'; seriesId: string }
  | { type: 'yield_curve' }
  | { type: 'screener'; template?: string }
  | { type: 'portfolio'; portfolioId?: string }
  | { type: 'correlation'; tickers: string[]; period: string }
  | { type: 'compare'; tickers: string[]; benchmark?: string; period: string }
  | { type: 'economic_calendar'; filter?: 'today' | 'week' | 'month' | 'us' | 'eu' }
  | { type: 'earnings_calendar'; filter?: 'today' | 'week' | 'watchlist' }
  | { type: 'alerts' }
  | { type: 'launchpad' }
  | { type: 'heatmap' }
  | { type: 'orderbook'; symbol?: string }
  | { type: 'options'; ticker: string }
  | { type: 'sentiment'; ticker: string }
  | { type: 'insider'; ticker?: string }
  | { type: 'watchlist' }
  | { type: 'watchlist_add'; ticker: string }
  | { type: 'watchlist_remove'; ticker: string }
  | { type: 'help'; topic?: string }
  | { type: 'status' }
  | { type: 'error'; message: string };

// Function aliases
const FUNCTION_ALIASES: Record<string, string> = {
  GP: 'chart',
  GRAPH: 'chart',
  PRICE: 'chart',
  CHART: 'chart',
  FA: 'fundamentals',
  FUNDIES: 'fundamentals',
  FUNDAMENTALS: 'fundamentals',
  FILINGS: 'filings',
  SEC: 'filings',
  EDGAR: 'filings',
  '10K': 'filings_10k',
  '10Q': 'filings_10q',
  '8K': 'filings_8k',
  NEWS: 'news',
  N: 'news',
};

// System commands (no ticker required)
const SYSTEM_COMMANDS = [
  'WL', 'WATCHLIST',
  'HELP', '?',
  'PORT', 'PORTFOLIO',
  'SCREEN', 'SCREENER',
  'MACRO',
  'YCRV', 'YIELD',
  'NEWS',
  'CORR', 'CORRELATION',
  'COMP', 'COMPARE',
  'ECO', 'CALENDAR', 'EVENTS',
  'EARN', 'EARNINGS',
  'ALERT', 'ALERTS', 'ALT',
  'LAUNCHPAD', 'LP', 'WORKSPACE', 'WORKSPACES',
  'STATUS', 'HEALTH',
  'HEATMAP', 'HEAT', 'MKTS', 'SECTORS',
  'ORDERBOOK', 'OB', 'DEPTH',
  'OPTIONS', 'OPT', 'CHAIN',
  'SENTIMENT', 'SENT', 'SOCIAL',
  'INSIDER', 'INSIDERS', 'FORM4',
];

// Valid ECO filters
const ECO_FILTERS = ['TODAY', 'WEEK', 'MONTH', 'US', 'EU'];

// Valid earnings filters
const EARN_FILTERS = ['TODAY', 'WEEK', 'WATCHLIST'];

// Valid periods for charts
const VALID_PERIODS = ['1M', '3M', '6M', '1Y', '2Y', '5Y', 'MAX'];

// Valid periods for correlation
const CORR_PERIODS = ['1M', '3M', '6M', '1Y', '2Y', '5Y'];

// Common macro series aliases
const MACRO_SERIES = ['CPI', 'GDP', 'UNRATE', 'FEDFUNDS', 'DGS10', 'DGS2', 'T10Y2Y'];

// Screener templates
const SCREEN_TEMPLATES = ['VALUE', 'GROWTH', 'DIVIDEND', 'QUALITY', 'LARGE_CAP', 'SMALL_CAP'];

// News categories
const NEWS_CATEGORIES = ['GENERAL', 'FOREX', 'CRYPTO', 'MERGER'];

/**
 * Parse a terminal command string.
 */
export function parseCommand(input: string, contextTicker: string | null): Command {
  const trimmed = input.trim().toUpperCase();

  if (!trimmed) {
    return { type: 'error', message: 'Empty command' };
  }

  const tokens = trimmed.split(/\s+/);
  const first = tokens[0];

  // Handle system commands
  if (first === 'HELP' || first === '?') {
    return { type: 'help', topic: tokens[1] };
  }

  if (first === 'STATUS' || first === 'HEALTH') {
    return { type: 'status' };
  }

  if (first === 'WL' || first === 'WATCHLIST') {
    if (tokens.length === 1) {
      return { type: 'watchlist' };
    }
    if (tokens[1] === 'ADD' && tokens[2]) {
      return { type: 'watchlist_add', ticker: tokens[2] };
    }
    if (tokens[1] === 'REMOVE' && tokens[2]) {
      return { type: 'watchlist_remove', ticker: tokens[2] };
    }
    return { type: 'watchlist' };
  }

  // MACRO command - get economic data series
  if (first === 'MACRO') {
    const seriesId = tokens[1] || 'GDP';
    return { type: 'macro', seriesId };
  }

  // YCRV / YIELD - yield curve
  if (first === 'YCRV' || first === 'YIELD') {
    return { type: 'yield_curve' };
  }

  // NEWS (without ticker) - market news
  if (first === 'NEWS' && tokens.length === 1) {
    return { type: 'market_news', category: 'general' };
  }
  if (first === 'NEWS' && NEWS_CATEGORIES.includes(tokens[1])) {
    return { type: 'market_news', category: tokens[1].toLowerCase() };
  }

  // SCREEN / SCREENER - stock screener
  if (first === 'SCREEN' || first === 'SCREENER') {
    const template = tokens[1]?.toLowerCase();
    return { type: 'screener', template };
  }

  // PORT / PORTFOLIO - portfolio view
  if (first === 'PORT' || first === 'PORTFOLIO') {
    const portfolioId = tokens[1];
    return { type: 'portfolio', portfolioId };
  }

  // CORR / CORRELATION - correlation matrix
  if (first === 'CORR' || first === 'CORRELATION') {
    if (!tokens[1]) {
      return { type: 'error', message: 'Usage: CORR AAPL,MSFT,GOOGL [1Y]' };
    }
    const tickers = tokens[1].split(',').map(t => t.trim()).filter(Boolean);
    const period = tokens[2] && CORR_PERIODS.includes(tokens[2]) ? tokens[2] : '1Y';
    if (tickers.length < 2) {
      return { type: 'error', message: 'Correlation requires at least 2 tickers' };
    }
    return { type: 'correlation', tickers, period };
  }

  // COMP / COMPARE - compare securities on normalized chart
  if (first === 'COMP' || first === 'COMPARE') {
    if (!tokens[1]) {
      return { type: 'error', message: 'Usage: COMP AAPL,MSFT,GOOGL [SPY] [1Y]' };
    }
    const tickerList = tokens[1].split(',').map(t => t.trim()).filter(Boolean);
    // Check if next token is a period or benchmark
    let benchmark: string | undefined;
    let period = '1Y';

    if (tokens[2]) {
      if (VALID_PERIODS.includes(tokens[2])) {
        period = tokens[2];
      } else {
        // It's a benchmark
        benchmark = tokens[2];
        if (tokens[3] && VALID_PERIODS.includes(tokens[3])) {
          period = tokens[3];
        }
      }
    }

    return { type: 'compare', tickers: tickerList, benchmark, period };
  }

  // ECO / CALENDAR / EVENTS - economic calendar
  if (first === 'ECO' || first === 'CALENDAR' || first === 'EVENTS') {
    const filterArg = tokens[1]?.toUpperCase();
    const filter = ECO_FILTERS.includes(filterArg) ? filterArg.toLowerCase() as 'today' | 'week' | 'month' | 'us' | 'eu' : undefined;
    return { type: 'economic_calendar', filter };
  }

  // EARN / EARNINGS - earnings calendar
  if (first === 'EARN' || first === 'EARNINGS') {
    const filterArg = tokens[1]?.toUpperCase();
    const filter = EARN_FILTERS.includes(filterArg) ? filterArg.toLowerCase() as 'today' | 'week' | 'watchlist' : undefined;
    return { type: 'earnings_calendar', filter };
  }

  // ALERT / ALERTS / ALT - alerts manager
  if (first === 'ALERT' || first === 'ALERTS' || first === 'ALT') {
    return { type: 'alerts' };
  }

  // LAUNCHPAD / LP / WORKSPACE / WORKSPACES - workspace launchpad
  if (first === 'LAUNCHPAD' || first === 'LP' || first === 'WORKSPACE' || first === 'WORKSPACES') {
    return { type: 'launchpad' };
  }

  // HEATMAP / HEAT / MKTS / SECTORS - market heatmap
  if (first === 'HEATMAP' || first === 'HEAT' || first === 'MKTS' || first === 'SECTORS') {
    return { type: 'heatmap' };
  }

  // ORDERBOOK / OB / DEPTH - crypto order book
  if (first === 'ORDERBOOK' || first === 'OB' || first === 'DEPTH') {
    const symbol = tokens[1] || 'BTCUSDT';
    return { type: 'orderbook', symbol };
  }

  // OPTIONS / OPT / CHAIN - options chain
  if (first === 'OPTIONS' || first === 'OPT' || first === 'CHAIN') {
    const ticker = tokens[1] || contextTicker;
    if (!ticker) {
      return { type: 'error', message: 'Usage: OPTIONS AAPL' };
    }
    return { type: 'options', ticker };
  }

  // SENTIMENT / SENT / SOCIAL - social sentiment
  if (first === 'SENTIMENT' || first === 'SENT' || first === 'SOCIAL') {
    const ticker = tokens[1] || contextTicker;
    if (!ticker) {
      return { type: 'error', message: 'Usage: SENTIMENT AAPL' };
    }
    return { type: 'sentiment', ticker };
  }

  // INSIDER / INSIDERS / FORM4 - insider trading
  if (first === 'INSIDER' || first === 'INSIDERS' || first === 'FORM4') {
    const ticker = tokens[1] || contextTicker || undefined;
    return { type: 'insider', ticker };
  }

  // Check if first token is a function (using context ticker)
  const firstAsFunction = FUNCTION_ALIASES[first];
  if (firstAsFunction && contextTicker) {
    return parseFunction(firstAsFunction, contextTicker, tokens.slice(1));
  }

  // First token is likely a ticker
  const ticker = first;

  // Just ticker -> overview
  if (tokens.length === 1) {
    return { type: 'overview', ticker };
  }

  // Ticker + function
  const functionName = FUNCTION_ALIASES[tokens[1]] || tokens[1].toLowerCase();

  return parseFunction(functionName, ticker, tokens.slice(2));
}

function parseFunction(func: string, ticker: string, args: string[]): Command {
  switch (func) {
    case 'chart':
      const period = args[0] && VALID_PERIODS.includes(args[0]) ? args[0] : '1Y';
      return { type: 'chart', ticker, period };

    case 'fundamentals':
      return { type: 'fundamentals', ticker };

    case 'filings':
      return { type: 'filings', ticker };

    case 'filings_10k':
      return { type: 'filings', ticker, formType: '10-K' };

    case 'filings_10q':
      return { type: 'filings', ticker, formType: '10-Q' };

    case 'filings_8k':
      return { type: 'filings', ticker, formType: '8-K' };

    case 'news':
      return { type: 'news', ticker };

    default:
      return { type: 'error', message: `Unknown function: ${func}` };
  }
}

/**
 * Get autocomplete suggestions for partial input.
 */
export function getAutocompleteSuggestions(
  input: string,
  contextTicker: string | null
): string[] {
  const trimmed = input.trim().toUpperCase();

  if (!trimmed) {
    return [];
  }

  const tokens = trimmed.split(/\s+/);

  // If single token, suggest functions if there's a context ticker
  if (tokens.length === 1) {
    const functions = Object.keys(FUNCTION_ALIASES);
    const matching = functions.filter(f => f.startsWith(trimmed));

    if (matching.length > 0 && contextTicker) {
      return matching.map(f => `${f}`);
    }
  }

  // If two tokens and second is partial, suggest functions
  if (tokens.length === 2) {
    const functions = Object.keys(FUNCTION_ALIASES);
    const matching = functions.filter(f => f.startsWith(tokens[1]));
    return matching.map(f => `${tokens[0]} ${f}`);
  }

  return [];
}
