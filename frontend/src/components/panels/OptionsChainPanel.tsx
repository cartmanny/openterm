'use client';

import { useState, useMemo } from 'react';

interface OptionContract {
  strike: number;
  type: 'call' | 'put';
  expiration: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

interface Props {
  ticker?: string;
}

// Standard normal CDF approximation
function normCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal PDF
function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Black-Scholes option pricing
function blackScholes(
  S: number, // Stock price
  K: number, // Strike price
  T: number, // Time to expiration (years)
  r: number, // Risk-free rate
  sigma: number, // Volatility
  type: 'call' | 'put'
): { price: number; delta: number; gamma: number; theta: number; vega: number; rho: number } {
  if (T <= 0) {
    // At expiration
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  let price: number;
  let delta: number;
  let rho: number;

  if (type === 'call') {
    price = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    delta = normCDF(d1);
    rho = K * T * Math.exp(-r * T) * normCDF(d2) / 100;
  } else {
    price = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
    delta = -normCDF(-d1);
    rho = -K * T * Math.exp(-r * T) * normCDF(-d2) / 100;
  }

  const gamma = normPDF(d1) / (S * sigma * Math.sqrt(T));
  const theta = (-(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T))
    - r * K * Math.exp(-r * T) * (type === 'call' ? normCDF(d2) : -normCDF(-d2))) / 365;
  const vega = S * normPDF(d1) * Math.sqrt(T) / 100;

  return { price, delta, gamma, theta, vega, rho };
}

// Generate mock options chain
function generateOptionsChain(ticker: string, spotPrice: number): OptionContract[] {
  const options: OptionContract[] = [];
  const expirations = ['2025-01-17', '2025-01-24', '2025-01-31', '2025-02-21'];
  const riskFreeRate = 0.045; // 4.5%
  const now = new Date();

  // Generate strikes around spot price
  const strikeInterval = spotPrice > 100 ? 5 : spotPrice > 50 ? 2.5 : 1;
  const strikes: number[] = [];
  for (let i = -10; i <= 10; i++) {
    strikes.push(Math.round((spotPrice + i * strikeInterval) / strikeInterval) * strikeInterval);
  }

  for (const expiration of expirations) {
    const expDate = new Date(expiration);
    const T = Math.max((expDate.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000), 0.001);

    for (const strike of strikes) {
      for (const type of ['call', 'put'] as const) {
        // Base IV varies by moneyness
        const moneyness = strike / spotPrice;
        const baseIV = 0.25 + Math.abs(1 - moneyness) * 0.1; // Volatility smile
        const iv = baseIV + (Math.random() - 0.5) * 0.05;

        const greeks = blackScholes(spotPrice, strike, T, riskFreeRate, iv, type);
        const midPrice = greeks.price;
        const spread = midPrice * 0.02; // 2% spread

        options.push({
          strike,
          type,
          expiration,
          bid: Math.max(0, midPrice - spread / 2),
          ask: midPrice + spread / 2,
          last: midPrice + (Math.random() - 0.5) * 0.1,
          volume: Math.floor(Math.random() * 5000),
          openInterest: Math.floor(Math.random() * 50000),
          iv: iv * 100, // As percentage
          delta: greeks.delta,
          gamma: greeks.gamma,
          theta: greeks.theta,
          vega: greeks.vega,
          rho: greeks.rho,
        });
      }
    }
  }

  return options;
}

export function OptionsChainPanel({ ticker = 'AAPL' }: Props) {
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [showGreeks, setShowGreeks] = useState(true);
  const [viewMode, setViewMode] = useState<'straddle' | 'calls' | 'puts'>('straddle');

  // Mock spot price
  const spotPrice = ticker === 'AAPL' ? 182.50 : ticker === 'MSFT' ? 412.30 : 100;

  const options = useMemo(() => generateOptionsChain(ticker, spotPrice), [ticker, spotPrice]);

  const expirations = useMemo(() => {
    return Array.from(new Set(options.map(o => o.expiration))).sort();
  }, [options]);

  const activeExpiration = selectedExpiration || expirations[0];

  const filteredOptions = useMemo(() => {
    return options.filter(o => o.expiration === activeExpiration);
  }, [options, activeExpiration]);

  const strikes = useMemo(() => {
    return Array.from(new Set(filteredOptions.map(o => o.strike))).sort((a, b) => a - b);
  }, [filteredOptions]);

  const callsByStrike = useMemo(() => {
    const map: Record<number, OptionContract> = {};
    filteredOptions.filter(o => o.type === 'call').forEach(o => {
      map[o.strike] = o;
    });
    return map;
  }, [filteredOptions]);

  const putsByStrike = useMemo(() => {
    const map: Record<number, OptionContract> = {};
    filteredOptions.filter(o => o.type === 'put').forEach(o => {
      map[o.strike] = o;
    });
    return map;
  }, [filteredOptions]);

  const formatGreek = (value: number, decimals: number = 4) => {
    return value.toFixed(decimals);
  };

  return (
    <div className="flex flex-col h-full bg-terminal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-4">
          <span className="text-terminal-accent font-bold">OPTIONS</span>
          <span className="text-terminal-text">{ticker}</span>
          <span className="text-terminal-muted">Spot: ${spotPrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGreeks(!showGreeks)}
            className={`px-2 py-1 text-xs rounded ${
              showGreeks ? 'bg-terminal-accent text-terminal-bg' : 'bg-terminal-border text-terminal-muted'
            }`}
          >
            Greeks
          </button>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="bg-terminal-panel border border-terminal-border rounded px-2 py-1 text-xs text-terminal-text"
          >
            <option value="straddle">Straddle View</option>
            <option value="calls">Calls Only</option>
            <option value="puts">Puts Only</option>
          </select>
        </div>
      </div>

      {/* Expiration Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-terminal-border overflow-x-auto">
        {expirations.map((exp) => {
          const expDate = new Date(exp);
          const daysToExp = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return (
            <button
              key={exp}
              onClick={() => setSelectedExpiration(exp)}
              className={`px-3 py-1 text-xs rounded whitespace-nowrap ${
                exp === activeExpiration
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {exp} ({daysToExp}d)
            </button>
          );
        })}
      </div>

      {/* Options Chain Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-terminal-bg z-10">
            <tr className="border-b border-terminal-border">
              {(viewMode === 'straddle' || viewMode === 'calls') && (
                <>
                  <th className="text-left py-2 px-2 text-green-500">Bid</th>
                  <th className="text-left py-2 px-2 text-green-500">Ask</th>
                  <th className="text-right py-2 px-2 text-green-500">Vol</th>
                  <th className="text-right py-2 px-2 text-green-500">OI</th>
                  <th className="text-right py-2 px-2 text-green-500">IV%</th>
                  {showGreeks && (
                    <>
                      <th className="text-right py-2 px-2 text-green-500">Δ</th>
                      <th className="text-right py-2 px-2 text-green-500">Γ</th>
                      <th className="text-right py-2 px-2 text-green-500">Θ</th>
                    </>
                  )}
                </>
              )}
              <th className={`py-2 px-4 text-center bg-terminal-panel ${
                viewMode === 'straddle' ? 'border-x border-terminal-border' : ''
              }`}>
                Strike
              </th>
              {(viewMode === 'straddle' || viewMode === 'puts') && (
                <>
                  {showGreeks && (
                    <>
                      <th className="text-left py-2 px-2 text-red-500">Θ</th>
                      <th className="text-left py-2 px-2 text-red-500">Γ</th>
                      <th className="text-left py-2 px-2 text-red-500">Δ</th>
                    </>
                  )}
                  <th className="text-left py-2 px-2 text-red-500">IV%</th>
                  <th className="text-left py-2 px-2 text-red-500">OI</th>
                  <th className="text-left py-2 px-2 text-red-500">Vol</th>
                  <th className="text-right py-2 px-2 text-red-500">Ask</th>
                  <th className="text-right py-2 px-2 text-red-500">Bid</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {strikes.map((strike) => {
              const call = callsByStrike[strike];
              const put = putsByStrike[strike];
              const isATM = Math.abs(strike - spotPrice) < spotPrice * 0.02;
              const isITMCall = strike < spotPrice;
              const isITMPut = strike > spotPrice;

              return (
                <tr
                  key={strike}
                  className={`border-b border-terminal-border/50 hover:bg-terminal-panel/50 ${
                    isATM ? 'bg-terminal-accent/10' : ''
                  }`}
                >
                  {(viewMode === 'straddle' || viewMode === 'calls') && call && (
                    <>
                      <td className={`py-1 px-2 font-mono ${isITMCall ? 'bg-green-500/10' : ''}`}>
                        {call.bid.toFixed(2)}
                      </td>
                      <td className={`py-1 px-2 font-mono ${isITMCall ? 'bg-green-500/10' : ''}`}>
                        {call.ask.toFixed(2)}
                      </td>
                      <td className={`py-1 px-2 font-mono text-right text-terminal-muted ${isITMCall ? 'bg-green-500/10' : ''}`}>
                        {call.volume.toLocaleString()}
                      </td>
                      <td className={`py-1 px-2 font-mono text-right text-terminal-muted ${isITMCall ? 'bg-green-500/10' : ''}`}>
                        {call.openInterest.toLocaleString()}
                      </td>
                      <td className={`py-1 px-2 font-mono text-right ${isITMCall ? 'bg-green-500/10' : ''}`}>
                        {call.iv.toFixed(1)}
                      </td>
                      {showGreeks && (
                        <>
                          <td className={`py-1 px-2 font-mono text-right text-terminal-muted ${isITMCall ? 'bg-green-500/10' : ''}`}>
                            {formatGreek(call.delta, 2)}
                          </td>
                          <td className={`py-1 px-2 font-mono text-right text-terminal-muted ${isITMCall ? 'bg-green-500/10' : ''}`}>
                            {formatGreek(call.gamma, 4)}
                          </td>
                          <td className={`py-1 px-2 font-mono text-right text-terminal-muted ${isITMCall ? 'bg-green-500/10' : ''}`}>
                            {formatGreek(call.theta, 2)}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {/* Strike */}
                  <td className={`py-1 px-4 font-mono font-bold text-center bg-terminal-panel ${
                    viewMode === 'straddle' ? 'border-x border-terminal-border' : ''
                  } ${isATM ? 'text-terminal-accent' : 'text-terminal-text'}`}>
                    {strike.toFixed(2)}
                  </td>

                  {(viewMode === 'straddle' || viewMode === 'puts') && put && (
                    <>
                      {showGreeks && (
                        <>
                          <td className={`py-1 px-2 font-mono text-terminal-muted ${isITMPut ? 'bg-red-500/10' : ''}`}>
                            {formatGreek(put.theta, 2)}
                          </td>
                          <td className={`py-1 px-2 font-mono text-terminal-muted ${isITMPut ? 'bg-red-500/10' : ''}`}>
                            {formatGreek(put.gamma, 4)}
                          </td>
                          <td className={`py-1 px-2 font-mono text-terminal-muted ${isITMPut ? 'bg-red-500/10' : ''}`}>
                            {formatGreek(put.delta, 2)}
                          </td>
                        </>
                      )}
                      <td className={`py-1 px-2 font-mono ${isITMPut ? 'bg-red-500/10' : ''}`}>
                        {put.iv.toFixed(1)}
                      </td>
                      <td className={`py-1 px-2 font-mono text-terminal-muted ${isITMPut ? 'bg-red-500/10' : ''}`}>
                        {put.openInterest.toLocaleString()}
                      </td>
                      <td className={`py-1 px-2 font-mono text-terminal-muted ${isITMPut ? 'bg-red-500/10' : ''}`}>
                        {put.volume.toLocaleString()}
                      </td>
                      <td className={`py-1 px-2 font-mono text-right ${isITMPut ? 'bg-red-500/10' : ''}`}>
                        {put.ask.toFixed(2)}
                      </td>
                      <td className={`py-1 px-2 font-mono text-right ${isITMPut ? 'bg-red-500/10' : ''}`}>
                        {put.bid.toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-terminal-border text-xs text-terminal-muted flex justify-between">
        <span>Greeks: Δ=Delta, Γ=Gamma, Θ=Theta | ITM highlighted</span>
        <span>Black-Scholes pricing model</span>
      </div>
    </div>
  );
}
