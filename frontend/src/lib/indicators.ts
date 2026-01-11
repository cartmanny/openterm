import {
  SMA,
  EMA,
  WMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  Stochastic,
  ADX,
  VWAP
} from 'technicalindicators';
import type { IndicatorType, IndicatorParams, IndicatorData } from '@/types/indicators';
import type { Bar } from '@/lib/api';

// Calculate indicator values from price data
export function calculateIndicator(
  type: IndicatorType,
  bars: Bar[],
  params: IndicatorParams
): IndicatorData[] {
  const closes = bars.map(b => b.close);
  const highs = bars.map(b => b.high ?? b.close);
  const lows = bars.map(b => b.low ?? b.close);
  const volumes = bars.map(b => b.volume ?? 0);
  const dates = bars.map(b => b.date);

  switch (type) {
    case 'SMA':
      return calculateSMA(dates, closes, params.period || 20);
    case 'EMA':
      return calculateEMA(dates, closes, params.period || 20);
    case 'WMA':
      return calculateWMA(dates, closes, params.period || 20);
    case 'RSI':
      return calculateRSI(dates, closes, params.period || 14);
    case 'MACD':
      return calculateMACD(
        dates,
        closes,
        params.fastPeriod || 12,
        params.slowPeriod || 26,
        params.signalPeriod || 9
      );
    case 'BB':
      return calculateBollingerBands(dates, closes, params.period || 20, params.stdDev || 2);
    case 'ATR':
      return calculateATR(dates, highs, lows, closes, params.period || 14);
    case 'Stochastic':
      return calculateStochastic(dates, highs, lows, closes, params.kPeriod || 14, params.dPeriod || 3);
    case 'ADX':
      return calculateADX(dates, highs, lows, closes, params.period || 14);
    case 'Volume':
      return calculateVolume(dates, volumes);
    case 'VWAP':
      return calculateVWAP(dates, highs, lows, closes, volumes);
    default:
      return [];
  }
}

function calculateSMA(dates: string[], closes: number[], period: number): IndicatorData[] {
  const values = SMA.calculate({ period, values: closes });
  // SMA returns values starting at index (period - 1)
  const offset = period - 1;
  return values.map((value, i) => ({
    time: dates[i + offset],
    value
  }));
}

function calculateEMA(dates: string[], closes: number[], period: number): IndicatorData[] {
  const values = EMA.calculate({ period, values: closes });
  const offset = period - 1;
  return values.map((value, i) => ({
    time: dates[i + offset],
    value
  }));
}

function calculateWMA(dates: string[], closes: number[], period: number): IndicatorData[] {
  const values = WMA.calculate({ period, values: closes });
  const offset = period - 1;
  return values.map((value, i) => ({
    time: dates[i + offset],
    value
  }));
}

function calculateRSI(dates: string[], closes: number[], period: number): IndicatorData[] {
  const values = RSI.calculate({ period, values: closes });
  // RSI starts outputting after 'period' values
  const offset = period;
  return values.map((value, i) => ({
    time: dates[i + offset],
    value
  }));
}

function calculateMACD(
  dates: string[],
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): IndicatorData[] {
  const result = MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });

  // MACD starts after slowPeriod + signalPeriod - 1
  const offset = slowPeriod - 1;
  return result.map((item, i) => ({
    time: dates[i + offset],
    value: item.MACD ?? 0,
    signal: item.signal ?? 0,
    histogram: item.histogram ?? 0
  }));
}

function calculateBollingerBands(
  dates: string[],
  closes: number[],
  period: number,
  stdDev: number
): IndicatorData[] {
  const result = BollingerBands.calculate({
    period,
    stdDev,
    values: closes
  });

  const offset = period - 1;
  return result.map((item, i) => ({
    time: dates[i + offset],
    value: item.middle,
    upper: item.upper,
    middle: item.middle,
    lower: item.lower
  }));
}

function calculateATR(
  dates: string[],
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): IndicatorData[] {
  const values = ATR.calculate({
    period,
    high: highs,
    low: lows,
    close: closes
  });

  const offset = period;
  return values.map((value, i) => ({
    time: dates[i + offset],
    value
  }));
}

function calculateStochastic(
  dates: string[],
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number,
  dPeriod: number
): IndicatorData[] {
  const result = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: kPeriod,
    signalPeriod: dPeriod
  });

  const offset = kPeriod - 1;
  return result.map((item, i) => ({
    time: dates[i + offset],
    value: item.k,
    k: item.k,
    d: item.d
  }));
}

function calculateADX(
  dates: string[],
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): IndicatorData[] {
  const result = ADX.calculate({
    period,
    high: highs,
    low: lows,
    close: closes
  });

  // ADX needs 2*period to start
  const offset = 2 * period - 1;
  return result.map((item, i) => ({
    time: dates[i + offset],
    value: item.adx
  }));
}

function calculateVolume(dates: string[], volumes: number[]): IndicatorData[] {
  return volumes.map((volume, i) => ({
    time: dates[i],
    value: volume
  }));
}

function calculateVWAP(
  dates: string[],
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): IndicatorData[] {
  // VWAP needs high, low, close, and volume arrays
  const result = VWAP.calculate({
    high: highs,
    low: lows,
    close: closes,
    volume: volumes
  });

  return result.map((value, i) => ({
    time: dates[i],
    value
  }));
}

// Generate a unique ID for indicator instance
export function generateIndicatorId(): string {
  return `ind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format indicator label for display
export function formatIndicatorLabel(type: IndicatorType, params: IndicatorParams): string {
  switch (type) {
    case 'SMA':
    case 'EMA':
    case 'WMA':
      return `${type}(${params.period})`;
    case 'RSI':
      return `RSI(${params.period})`;
    case 'MACD':
      return `MACD(${params.fastPeriod},${params.slowPeriod},${params.signalPeriod})`;
    case 'BB':
      return `BB(${params.period},${params.stdDev})`;
    case 'ATR':
      return `ATR(${params.period})`;
    case 'Stochastic':
      return `Stoch(${params.kPeriod},${params.dPeriod})`;
    case 'ADX':
      return `ADX(${params.period})`;
    case 'Volume':
      return 'Volume';
    case 'VWAP':
      return 'VWAP';
    default:
      return type;
  }
}
