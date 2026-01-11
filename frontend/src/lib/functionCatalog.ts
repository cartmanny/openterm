// Function Catalog - Bloomberg-style function discovery

export type FunctionCategory =
  | 'Navigation'
  | 'Charts & Technicals'
  | 'Fundamentals & Equity'
  | 'News & Content'
  | 'Analytics & Portfolio'
  | 'Screener & Discovery'
  | 'Macro & Economics'
  | 'Workflow & Alerts'
  | 'Settings & System';

export interface FunctionDefinition {
  mnemonic: string;
  name: string;
  description: string;
  category: FunctionCategory;
  aliases: string[];
  parameters?: FunctionParameter[];
  examples: string[];
  relatedFunctions: string[];
  requiresTicker: boolean;
  panelType?: string;
}

export interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
}

export const FUNCTION_CATALOG: FunctionDefinition[] = [
  // Navigation
  {
    mnemonic: 'GO',
    name: 'Load Security',
    description: 'Load a security into the current panel',
    category: 'Navigation',
    aliases: [],
    parameters: [
      { name: 'ticker', type: 'string', required: true, description: 'Stock ticker symbol' }
    ],
    examples: ['AAPL', 'MSFT GO', 'TSLA'],
    relatedFunctions: ['OVERVIEW', 'GP'],
    requiresTicker: true,
    panelType: 'overview'
  },
  {
    mnemonic: 'HELP',
    name: 'Help & Commands',
    description: 'Display available commands and keyboard shortcuts',
    category: 'Navigation',
    aliases: ['H', '?'],
    examples: ['HELP', 'H'],
    relatedFunctions: ['HL'],
    requiresTicker: false,
    panelType: 'help'
  },
  {
    mnemonic: 'HL',
    name: 'Help Search',
    description: 'Search for functions by keyword',
    category: 'Navigation',
    aliases: ['SEARCH'],
    parameters: [
      { name: 'query', type: 'string', required: false, description: 'Search term' }
    ],
    examples: ['HL chart', 'HL portfolio', 'HL news'],
    relatedFunctions: ['HELP'],
    requiresTicker: false
  },
  {
    mnemonic: 'STATUS',
    name: 'System Status',
    description: 'Display API health and system status',
    category: 'Navigation',
    aliases: ['STAT'],
    examples: ['STATUS'],
    relatedFunctions: ['HELP'],
    requiresTicker: false,
    panelType: 'status'
  },

  // Charts & Technicals
  {
    mnemonic: 'GP',
    name: 'Graph Price',
    description: 'Display interactive price chart with candlesticks and indicators',
    category: 'Charts & Technicals',
    aliases: ['CHART', 'GRAPH', 'G'],
    parameters: [
      { name: 'ticker', type: 'string', required: false, description: 'Stock ticker (uses current context if omitted)' },
      { name: 'period', type: '1M|3M|6M|1Y|2Y|5Y', required: false, default: '1Y', description: 'Chart time period' }
    ],
    examples: ['AAPL GP', 'MSFT GP 6M', 'GP 1Y'],
    relatedFunctions: ['COMP', 'CORR', 'BETA'],
    requiresTicker: true,
    panelType: 'chart'
  },
  {
    mnemonic: 'COMP',
    name: 'Compare Securities',
    description: 'Compare multiple securities on a normalized chart',
    category: 'Charts & Technicals',
    aliases: ['COMPARE'],
    parameters: [
      { name: 'tickers', type: 'string[]', required: true, description: 'Comma-separated list of tickers' },
      { name: 'period', type: 'string', required: false, default: '1Y' }
    ],
    examples: ['COMP AAPL,MSFT,GOOGL', 'AAPL COMP MSFT', 'COMP AAPL,SPY 2Y'],
    relatedFunctions: ['GP', 'CORR', 'BETA'],
    requiresTicker: true,
    panelType: 'compare'
  },
  {
    mnemonic: 'CORR',
    name: 'Correlation Matrix',
    description: 'Display correlation analysis between securities',
    category: 'Charts & Technicals',
    aliases: ['CORRELATION'],
    parameters: [
      { name: 'tickers', type: 'string[]', required: false, description: 'Comma-separated tickers or portfolio' }
    ],
    examples: ['CORR', 'CORR AAPL,MSFT,GOOGL,AMZN'],
    relatedFunctions: ['COMP', 'BETA', 'PORT'],
    requiresTicker: false,
    panelType: 'correlation'
  },

  // Fundamentals & Equity
  {
    mnemonic: 'OVERVIEW',
    name: 'Company Overview',
    description: 'Display company summary with key statistics and profile',
    category: 'Fundamentals & Equity',
    aliases: ['OV', 'DES'],
    examples: ['AAPL OVERVIEW', 'MSFT OV'],
    relatedFunctions: ['FA', 'GP', 'NEWS'],
    requiresTicker: true,
    panelType: 'overview'
  },
  {
    mnemonic: 'FA',
    name: 'Fundamental Analysis',
    description: 'Display detailed fundamentals including income statement, balance sheet, ratios',
    category: 'Fundamentals & Equity',
    aliases: ['FUNDAMENTALS', 'FIN'],
    examples: ['AAPL FA', 'MSFT FUNDAMENTALS'],
    relatedFunctions: ['OVERVIEW', 'FILINGS', 'GP'],
    requiresTicker: true,
    panelType: 'fundamentals'
  },
  {
    mnemonic: 'FILINGS',
    name: 'SEC Filings',
    description: 'Browse SEC filings including 10-K, 10-Q, 8-K, and insider transactions',
    category: 'Fundamentals & Equity',
    aliases: ['SEC', 'EDGAR'],
    parameters: [
      { name: 'type', type: '10-K|10-Q|8-K|4|ALL', required: false, default: 'ALL' }
    ],
    examples: ['AAPL FILINGS', 'MSFT SEC 10-K'],
    relatedFunctions: ['FA', 'OVERVIEW'],
    requiresTicker: true,
    panelType: 'filings'
  },

  // News & Content
  {
    mnemonic: 'NEWS',
    name: 'Company News',
    description: 'Display recent news for a specific security',
    category: 'News & Content',
    aliases: ['N'],
    examples: ['AAPL NEWS', 'TSLA N'],
    relatedFunctions: ['MNEWS', 'OVERVIEW'],
    requiresTicker: true,
    panelType: 'news'
  },
  {
    mnemonic: 'MNEWS',
    name: 'Market News',
    description: 'Display general market and financial news',
    category: 'News & Content',
    aliases: ['MARKET'],
    parameters: [
      { name: 'category', type: 'general|forex|crypto|merger', required: false, default: 'general' }
    ],
    examples: ['MNEWS', 'MNEWS forex', 'MARKET crypto'],
    relatedFunctions: ['NEWS', 'ECO'],
    requiresTicker: false,
    panelType: 'market_news'
  },

  // Analytics & Portfolio
  {
    mnemonic: 'PORT',
    name: 'Portfolio Analytics',
    description: 'Portfolio management, performance tracking, and risk analysis',
    category: 'Analytics & Portfolio',
    aliases: ['PORTFOLIO'],
    parameters: [
      { name: 'view', type: 'holdings|performance|risk', required: false, default: 'holdings' }
    ],
    examples: ['PORT', 'PORTFOLIO PERF', 'PORT RISK'],
    relatedFunctions: ['CORR', 'WL', 'BETA'],
    requiresTicker: false,
    panelType: 'portfolio'
  },
  {
    mnemonic: 'WL',
    name: 'Watchlist',
    description: 'Manage and view watchlists',
    category: 'Analytics & Portfolio',
    aliases: ['WATCHLIST', 'WATCH'],
    parameters: [
      { name: 'action', type: 'VIEW|ADD|REMOVE', required: false, default: 'VIEW' },
      { name: 'ticker', type: 'string', required: false }
    ],
    examples: ['WL', 'WL ADD AAPL', 'WATCHLIST REMOVE TSLA'],
    relatedFunctions: ['PORT', 'SCREEN'],
    requiresTicker: false,
    panelType: 'watchlist'
  },

  // Screener & Discovery
  {
    mnemonic: 'SCREEN',
    name: 'Stock Screener',
    description: 'Screen stocks based on fundamental and technical criteria',
    category: 'Screener & Discovery',
    aliases: ['SCREENER', 'EQS'],
    parameters: [
      { name: 'template', type: 'VALUE|GROWTH|DIVIDEND|MOMENTUM|CUSTOM', required: false }
    ],
    examples: ['SCREEN', 'SCREEN VALUE', 'SCREENER GROWTH', 'EQS DIVIDEND'],
    relatedFunctions: ['WL', 'PORT'],
    requiresTicker: false,
    panelType: 'screener'
  },

  // Macro & Economics
  {
    mnemonic: 'MACRO',
    name: 'Macro Dashboard',
    description: 'Display macroeconomic indicators and market overview',
    category: 'Macro & Economics',
    aliases: ['ECON', 'ECONOMY'],
    examples: ['MACRO', 'ECON'],
    relatedFunctions: ['YCRV', 'ECO', 'MNEWS'],
    requiresTicker: false,
    panelType: 'macro'
  },
  {
    mnemonic: 'YCRV',
    name: 'Yield Curve',
    description: 'Display Treasury yield curve with historical comparison',
    category: 'Macro & Economics',
    aliases: ['YIELD', 'RATES'],
    examples: ['YCRV', 'YIELD'],
    relatedFunctions: ['MACRO', 'ECO'],
    requiresTicker: false,
    panelType: 'yield_curve'
  },
  {
    mnemonic: 'ECO',
    name: 'Economic Calendar',
    description: 'Upcoming economic releases and indicators',
    category: 'Macro & Economics',
    aliases: ['CALENDAR', 'EVENTS'],
    parameters: [
      { name: 'filter', type: 'TODAY|WEEK|MONTH|US|EU', required: false }
    ],
    examples: ['ECO', 'ECO TODAY', 'ECO US'],
    relatedFunctions: ['MACRO', 'YCRV', 'EARN'],
    requiresTicker: false,
    panelType: 'economic_calendar'
  },
  {
    mnemonic: 'EARN',
    name: 'Earnings Calendar',
    description: 'Upcoming earnings announcements',
    category: 'Macro & Economics',
    aliases: ['EARNINGS'],
    parameters: [
      { name: 'filter', type: 'TODAY|WEEK|WATCHLIST', required: false }
    ],
    examples: ['EARN', 'EARN WEEK', 'EARNINGS WATCHLIST'],
    relatedFunctions: ['ECO', 'FA', 'NEWS'],
    requiresTicker: false,
    panelType: 'earnings_calendar'
  },

  // Workflow & Alerts
  {
    mnemonic: 'ALERT',
    name: 'Alert Manager',
    description: 'Create and manage price, volume, and news alerts',
    category: 'Workflow & Alerts',
    aliases: ['ALT', 'ALERTS'],
    parameters: [
      { name: 'action', type: 'LIST|NEW|DELETE', required: false },
      { name: 'ticker', type: 'string', required: false }
    ],
    examples: ['ALERT', 'ALERT NEW', 'AAPL ALERT'],
    relatedFunctions: ['WL', 'PORT'],
    requiresTicker: false,
    panelType: 'alerts'
  },
  {
    mnemonic: 'LAUNCHPAD',
    name: 'Workspace Launchpad',
    description: 'Save and load workspace configurations',
    category: 'Workflow & Alerts',
    aliases: ['LP', 'WORKSPACE', 'WORKSPACES'],
    examples: ['LAUNCHPAD', 'LP'],
    relatedFunctions: ['HELP'],
    requiresTicker: false,
    panelType: 'launchpad'
  },

  // Settings & System
  {
    mnemonic: 'SETTINGS',
    name: 'Terminal Settings',
    description: 'Configure terminal preferences and defaults',
    category: 'Settings & System',
    aliases: ['SET', 'CONFIG'],
    examples: ['SETTINGS', 'SET'],
    relatedFunctions: ['HELP', 'STATUS'],
    requiresTicker: false
  }
];

// Search functions by query
export function searchFunctions(query: string): FunctionDefinition[] {
  if (!query.trim()) return FUNCTION_CATALOG;

  const q = query.toLowerCase();

  return FUNCTION_CATALOG.filter(fn => {
    const searchFields = [
      fn.mnemonic,
      fn.name,
      fn.description,
      fn.category,
      ...fn.aliases,
      ...(fn.examples || [])
    ].map(s => s.toLowerCase());

    return searchFields.some(field => field.includes(q));
  }).sort((a, b) => {
    // Prioritize exact mnemonic/alias matches
    const aExact = a.mnemonic.toLowerCase() === q || a.aliases.some(al => al.toLowerCase() === q);
    const bExact = b.mnemonic.toLowerCase() === q || b.aliases.some(al => al.toLowerCase() === q);
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    // Then prioritize mnemonic prefix matches
    const aPrefix = a.mnemonic.toLowerCase().startsWith(q);
    const bPrefix = b.mnemonic.toLowerCase().startsWith(q);
    if (aPrefix && !bPrefix) return -1;
    if (bPrefix && !aPrefix) return 1;

    return 0;
  });
}

// Get functions by category
export function getFunctionsByCategory(): Record<FunctionCategory, FunctionDefinition[]> {
  const byCategory: Record<string, FunctionDefinition[]> = {};

  for (const fn of FUNCTION_CATALOG) {
    if (!byCategory[fn.category]) {
      byCategory[fn.category] = [];
    }
    byCategory[fn.category].push(fn);
  }

  return byCategory as Record<FunctionCategory, FunctionDefinition[]>;
}

// Get function by mnemonic or alias
export function getFunction(command: string): FunctionDefinition | undefined {
  const cmd = command.toUpperCase();
  return FUNCTION_CATALOG.find(
    fn => fn.mnemonic === cmd || fn.aliases.includes(cmd)
  );
}

// Get related functions
export function getRelatedFunctions(mnemonic: string): FunctionDefinition[] {
  const fn = getFunction(mnemonic);
  if (!fn) return [];

  return fn.relatedFunctions
    .map(rel => getFunction(rel))
    .filter((f): f is FunctionDefinition => f !== undefined);
}

// Category display order
export const CATEGORY_ORDER: FunctionCategory[] = [
  'Charts & Technicals',
  'Fundamentals & Equity',
  'News & Content',
  'Analytics & Portfolio',
  'Screener & Discovery',
  'Macro & Economics',
  'Workflow & Alerts',
  'Navigation',
  'Settings & System'
];
