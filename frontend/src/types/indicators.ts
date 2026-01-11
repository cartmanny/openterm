// Technical Indicator Types

export type IndicatorType =
  // Moving Averages
  | 'SMA'
  | 'EMA'
  | 'WMA'
  // Momentum
  | 'RSI'
  | 'MACD'
  | 'Stochastic'
  // Volatility
  | 'BB'
  | 'ATR'
  // Volume
  | 'Volume'
  | 'VWAP'
  // Trend
  | 'ADX';

export type IndicatorPlacement = 'overlay' | 'subplot';

export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  shortName: string;
  description: string;
  category: 'Moving Averages' | 'Momentum' | 'Volatility' | 'Volume' | 'Trend';
  placement: IndicatorPlacement;
  defaultParams: IndicatorParams;
  paramDefinitions: ParamDefinition[];
  defaultColor?: string;
}

export interface ParamDefinition {
  key: string;
  name: string;
  type: 'number';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface IndicatorParams {
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  kPeriod?: number;
  dPeriod?: number;
}

export interface IndicatorInstance {
  id: string;
  type: IndicatorType;
  params: IndicatorParams;
  color: string;
  visible: boolean;
}

export interface IndicatorData {
  time: string;
  value: number;
  // Additional fields for multi-value indicators
  upper?: number;
  middle?: number;
  lower?: number;
  signal?: number;
  histogram?: number;
  k?: number;
  d?: number;
}

// Indicator catalog with all available indicators
export const INDICATOR_CATALOG: IndicatorDefinition[] = [
  // Moving Averages
  {
    type: 'SMA',
    name: 'Simple Moving Average',
    shortName: 'SMA',
    description: 'Average price over a specified period',
    category: 'Moving Averages',
    placement: 'overlay',
    defaultColor: '#2196F3',
    defaultParams: { period: 20 },
    paramDefinitions: [
      { key: 'period', name: 'Period', type: 'number', min: 1, max: 500, step: 1, defaultValue: 20 }
    ]
  },
  {
    type: 'EMA',
    name: 'Exponential Moving Average',
    shortName: 'EMA',
    description: 'Weighted average giving more weight to recent prices',
    category: 'Moving Averages',
    placement: 'overlay',
    defaultColor: '#FF9800',
    defaultParams: { period: 20 },
    paramDefinitions: [
      { key: 'period', name: 'Period', type: 'number', min: 1, max: 500, step: 1, defaultValue: 20 }
    ]
  },
  {
    type: 'WMA',
    name: 'Weighted Moving Average',
    shortName: 'WMA',
    description: 'Linear weighted average price',
    category: 'Moving Averages',
    placement: 'overlay',
    defaultColor: '#9C27B0',
    defaultParams: { period: 20 },
    paramDefinitions: [
      { key: 'period', name: 'Period', type: 'number', min: 1, max: 500, step: 1, defaultValue: 20 }
    ]
  },

  // Momentum
  {
    type: 'RSI',
    name: 'Relative Strength Index',
    shortName: 'RSI',
    description: 'Momentum oscillator measuring speed and change of price movements',
    category: 'Momentum',
    placement: 'subplot',
    defaultColor: '#E91E63',
    defaultParams: { period: 14 },
    paramDefinitions: [
      { key: 'period', name: 'Period', type: 'number', min: 2, max: 100, step: 1, defaultValue: 14 }
    ]
  },
  {
    type: 'MACD',
    name: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    description: 'Trend-following momentum indicator',
    category: 'Momentum',
    placement: 'subplot',
    defaultColor: '#2196F3',
    defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    paramDefinitions: [
      { key: 'fastPeriod', name: 'Fast Period', type: 'number', min: 1, max: 100, step: 1, defaultValue: 12 },
      { key: 'slowPeriod', name: 'Slow Period', type: 'number', min: 1, max: 200, step: 1, defaultValue: 26 },
      { key: 'signalPeriod', name: 'Signal Period', type: 'number', min: 1, max: 100, step: 1, defaultValue: 9 }
    ]
  },
  {
    type: 'Stochastic',
    name: 'Stochastic Oscillator',
    shortName: 'Stoch',
    description: 'Momentum indicator comparing closing price to price range',
    category: 'Momentum',
    placement: 'subplot',
    defaultColor: '#4CAF50',
    defaultParams: { kPeriod: 14, dPeriod: 3 },
    paramDefinitions: [
      { key: 'kPeriod', name: '%K Period', type: 'number', min: 1, max: 100, step: 1, defaultValue: 14 },
      { key: 'dPeriod', name: '%D Period', type: 'number', min: 1, max: 100, step: 1, defaultValue: 3 }
    ]
  },

  // Volatility
  {
    type: 'BB',
    name: 'Bollinger Bands',
    shortName: 'BB',
    description: 'Volatility bands above and below a moving average',
    category: 'Volatility',
    placement: 'overlay',
    defaultColor: '#607D8B',
    defaultParams: { period: 20, stdDev: 2 },
    paramDefinitions: [
      { key: 'period', name: 'Period', type: 'number', min: 2, max: 100, step: 1, defaultValue: 20 },
      { key: 'stdDev', name: 'Std Dev', type: 'number', min: 0.5, max: 4, step: 0.5, defaultValue: 2 }
    ]
  },
  {
    type: 'ATR',
    name: 'Average True Range',
    shortName: 'ATR',
    description: 'Volatility indicator showing the range of price movement',
    category: 'Volatility',
    placement: 'subplot',
    defaultColor: '#FF5722',
    defaultParams: { period: 14 },
    paramDefinitions: [
      { key: 'period', name: 'Period', type: 'number', min: 1, max: 100, step: 1, defaultValue: 14 }
    ]
  },

  // Volume
  {
    type: 'Volume',
    name: 'Volume',
    shortName: 'Vol',
    description: 'Trading volume histogram',
    category: 'Volume',
    placement: 'subplot',
    defaultColor: '#78909C',
    defaultParams: {},
    paramDefinitions: []
  },
  {
    type: 'VWAP',
    name: 'Volume Weighted Average Price',
    shortName: 'VWAP',
    description: 'Average price weighted by volume',
    category: 'Volume',
    placement: 'overlay',
    defaultColor: '#00BCD4',
    defaultParams: {},
    paramDefinitions: []
  },

  // Trend
  {
    type: 'ADX',
    name: 'Average Directional Index',
    shortName: 'ADX',
    description: 'Trend strength indicator',
    category: 'Trend',
    placement: 'subplot',
    defaultColor: '#673AB7',
    defaultParams: { period: 14 },
    paramDefinitions: [
      { key: 'period', name: 'Period', type: 'number', min: 2, max: 100, step: 1, defaultValue: 14 }
    ]
  }
];

// Helper to get indicator definition by type
export function getIndicatorDefinition(type: IndicatorType): IndicatorDefinition | undefined {
  return INDICATOR_CATALOG.find(ind => ind.type === type);
}

// Get indicators by category
export function getIndicatorsByCategory(): Record<string, IndicatorDefinition[]> {
  const byCategory: Record<string, IndicatorDefinition[]> = {};
  for (const ind of INDICATOR_CATALOG) {
    if (!byCategory[ind.category]) {
      byCategory[ind.category] = [];
    }
    byCategory[ind.category].push(ind);
  }
  return byCategory;
}

// Default indicator colors (for when adding multiple of same type)
export const INDICATOR_COLORS = [
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#4CAF50', // Green
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#673AB7', // Deep Purple
];
