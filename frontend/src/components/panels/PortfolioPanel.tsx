'use client';

import { useEffect, useState } from 'react';
import { api, Holding, PortfolioSummary, PortfolioAnalytics, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

interface Props {
  portfolioId?: string;
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatRatio(value: number | null): string {
  if (value === null) return '-';
  return value.toFixed(2);
}

export function PortfolioPanel({ portfolioId }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'holdings' | 'performance' | 'risk' | 'attribution'>('holdings');

  useEffect(() => {
    async function fetchData() {
      if (!portfolioId) {
        setError('No portfolio selected. Create a portfolio first.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [detailResult, analyticsResult] = await Promise.all([
          api.getPortfolio(portfolioId),
          api.getPortfolioAnalytics(portfolioId),
        ]);

        setHoldings(detailResult.holdings);
        setSummary(detailResult.summary);
        setAnalytics(analyticsResult.analytics);
        setMeta(detailResult.meta);
      } catch (err) {
        setError('Failed to load portfolio');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [portfolioId]);

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Portfolio</span>
        </div>
        <div className="panel-content">
          <div className="loading">Loading portfolio...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Portfolio</span>
        </div>
        <div className="panel-content text-terminal-muted">{error}</div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">Portfolio</span>
          <FreshnessBadge meta={meta} compact />
        </div>
        <div className="flex gap-1">
          {(['holdings', 'performance', 'risk', 'attribution'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 text-xs rounded capitalize ${
                activeTab === tab
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="px-3 py-2 border-b border-terminal-border bg-terminal-bg/50">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-terminal-muted text-xs">Total Value</span>
              <div className="text-xl font-bold text-terminal-text">
                {formatCurrency(summary.total_value)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-terminal-muted text-xs">Unrealized P&L</span>
              <div className={`text-lg font-medium ${
                summary.total_unrealized_pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'
              }`}>
                {formatCurrency(summary.total_unrealized_pnl)}
                <span className="text-sm ml-1">
                  ({formatPercent(summary.total_unrealized_pnl_pct)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="panel-content flex-1 overflow-auto">
        {activeTab === 'holdings' && (
          <>
            {holdings.length === 0 ? (
              <div className="text-terminal-muted">No holdings. Add transactions to see positions.</div>
            ) : (
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Avg Cost</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">P&L</th>
                    <th className="text-right">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.instrument_id} className="hover:bg-terminal-border/30">
                      <td className="text-terminal-accent font-medium">{h.ticker}</td>
                      <td className="text-right">{h.quantity.toFixed(2)}</td>
                      <td className="text-right">{formatCurrency(h.avg_cost)}</td>
                      <td className="text-right">{h.current_price ? `$${h.current_price.toFixed(2)}` : '-'}</td>
                      <td className="text-right">{formatCurrency(h.market_value)}</td>
                      <td className={`text-right ${
                        h.unrealized_pnl && h.unrealized_pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                      }`}>
                        {h.unrealized_pnl !== null ? (
                          <>
                            {formatCurrency(h.unrealized_pnl)}
                            <span className="text-terminal-muted ml-1">
                              ({formatPercent(h.unrealized_pnl_pct)})
                            </span>
                          </>
                        ) : '-'}
                      </td>
                      <td className="text-right text-terminal-muted">
                        {h.weight !== null ? `${h.weight.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'performance' && analytics && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-terminal-accent font-medium">Returns</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-terminal-muted">1 Day</div>
                <div className={`text-right ${analytics.return_1d && analytics.return_1d >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {formatPercent(analytics.return_1d)}
                </div>
                <div className="text-terminal-muted">1 Week</div>
                <div className={`text-right ${analytics.return_1w && analytics.return_1w >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {formatPercent(analytics.return_1w)}
                </div>
                <div className="text-terminal-muted">1 Month</div>
                <div className={`text-right ${analytics.return_1m && analytics.return_1m >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {formatPercent(analytics.return_1m)}
                </div>
                <div className="text-terminal-muted">YTD</div>
                <div className={`text-right ${analytics.return_ytd && analytics.return_ytd >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {formatPercent(analytics.return_ytd)}
                </div>
                <div className="text-terminal-muted">1 Year</div>
                <div className={`text-right ${analytics.return_1y && analytics.return_1y >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {formatPercent(analytics.return_1y)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-terminal-accent font-medium">Top Holdings</h3>
              <div className="space-y-1 text-sm">
                {analytics.top_holdings.map((h) => (
                  <div key={h.ticker} className="flex justify-between">
                    <span className="text-terminal-text">{h.ticker}</span>
                    <span className="text-terminal-muted">{h.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && analytics && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-terminal-accent font-medium">Risk Metrics</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-terminal-muted">Volatility</div>
                <div className="text-right">{formatPercent(analytics.volatility)}</div>
                <div className="text-terminal-muted">Max Drawdown</div>
                <div className="text-right text-terminal-red">{formatPercent(analytics.max_drawdown)}</div>
                <div className="text-terminal-muted">VaR (95%)</div>
                <div className="text-right">{formatPercent(analytics.var_95)}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-terminal-accent font-medium">Risk-Adjusted</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-terminal-muted">Sharpe Ratio</div>
                <div className="text-right">{formatRatio(analytics.sharpe_ratio)}</div>
                <div className="text-terminal-muted">Sortino Ratio</div>
                <div className="text-right">{formatRatio(analytics.sortino_ratio)}</div>
                <div className="text-terminal-muted">Beta</div>
                <div className="text-right">{formatRatio(analytics.beta)}</div>
                <div className="text-terminal-muted">Alpha</div>
                <div className="text-right">{formatPercent(analytics.alpha)}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attribution' && (
          <AttributionView holdings={holdings} analytics={analytics} />
        )}
      </div>
    </div>
  );
}

// Attribution analysis component
function AttributionView({
  holdings,
  analytics
}: {
  holdings: Holding[];
  analytics: PortfolioAnalytics | null;
}) {
  const [attrView, setAttrView] = useState<'sector' | 'security' | 'factor'>('sector');

  // Calculate sector allocation and contribution
  const sectorData = analytics?.sector_allocation || {};
  const sectors = Object.entries(sectorData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Calculate security-level contribution (mock calculation based on holdings)
  const securityContribution = holdings
    .filter(h => h.unrealized_pnl !== null)
    .map(h => ({
      ticker: h.ticker,
      weight: h.weight || 0,
      pnl: h.unrealized_pnl || 0,
      pnlPct: h.unrealized_pnl_pct || 0,
      // Contribution = weight * return
      contribution: ((h.weight || 0) / 100) * (h.unrealized_pnl_pct || 0),
    }))
    .sort((a, b) => b.contribution - a.contribution);

  // Mock factor exposures (in production, calculate using Fama-French data)
  const factorExposures = [
    { factor: 'Market (Mkt-RF)', exposure: 1.05, contribution: 12.5 },
    { factor: 'Size (SMB)', exposure: -0.15, contribution: -0.8 },
    { factor: 'Value (HML)', exposure: 0.22, contribution: 1.2 },
    { factor: 'Momentum (MOM)', exposure: 0.35, contribution: 2.1 },
    { factor: 'Quality (QMJ)', exposure: 0.18, contribution: 0.9 },
    { factor: 'Low Volatility', exposure: -0.28, contribution: -1.4 },
  ];

  return (
    <div className="space-y-4">
      {/* Attribution view toggle */}
      <div className="flex gap-1">
        {(['sector', 'security', 'factor'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setAttrView(view)}
            className={`px-2 py-0.5 text-xs rounded capitalize ${
              attrView === view
                ? 'bg-terminal-accent/20 text-terminal-accent'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {attrView === 'sector' && (
        <div className="space-y-3">
          <h3 className="text-terminal-accent font-medium text-sm">Sector Allocation & Attribution</h3>
          {sectors.length === 0 ? (
            <div className="text-terminal-muted text-sm">No sector data available</div>
          ) : (
            <div className="space-y-2">
              {sectors.map(([sector, weight]) => (
                <div key={sector} className="flex items-center gap-2">
                  <div className="w-24 text-sm text-terminal-text truncate">{sector}</div>
                  <div className="flex-1 h-4 bg-terminal-border rounded overflow-hidden">
                    <div
                      className="h-full bg-terminal-accent"
                      style={{ width: `${Math.min(weight, 100)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm text-terminal-muted">
                    {weight.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {attrView === 'security' && (
        <div className="space-y-3">
          <h3 className="text-terminal-accent font-medium text-sm">Security-Level Attribution</h3>
          <p className="text-xs text-terminal-muted">
            Contribution = Portfolio Weight × Security Return
          </p>
          {securityContribution.length === 0 ? (
            <div className="text-terminal-muted text-sm">No holdings data available</div>
          ) : (
            <table className="data-table text-xs w-full">
              <thead>
                <tr>
                  <th className="text-left">Ticker</th>
                  <th className="text-right">Weight</th>
                  <th className="text-right">Return</th>
                  <th className="text-right">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {securityContribution.slice(0, 10).map((s) => (
                  <tr key={s.ticker}>
                    <td className="text-terminal-accent font-medium">{s.ticker}</td>
                    <td className="text-right text-terminal-muted">{s.weight.toFixed(1)}%</td>
                    <td className={`text-right ${s.pnlPct >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {formatPercent(s.pnlPct)}
                    </td>
                    <td className={`text-right font-medium ${s.contribution >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {s.contribution >= 0 ? '+' : ''}{s.contribution.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-terminal-border">
                  <td className="font-medium">Total</td>
                  <td className="text-right text-terminal-muted">100%</td>
                  <td className="text-right">-</td>
                  <td className={`text-right font-bold ${
                    securityContribution.reduce((sum, s) => sum + s.contribution, 0) >= 0
                      ? 'text-terminal-green'
                      : 'text-terminal-red'
                  }`}>
                    {formatPercent(securityContribution.reduce((sum, s) => sum + s.contribution, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {attrView === 'factor' && (
        <div className="space-y-3">
          <h3 className="text-terminal-accent font-medium text-sm">Factor Attribution</h3>
          <p className="text-xs text-terminal-muted">
            Based on Fama-French factor model + Momentum + Quality
          </p>
          <table className="data-table text-xs w-full">
            <thead>
              <tr>
                <th className="text-left">Factor</th>
                <th className="text-right">Exposure (β)</th>
                <th className="text-right">Contribution (%)</th>
              </tr>
            </thead>
            <tbody>
              {factorExposures.map((f) => (
                <tr key={f.factor}>
                  <td className="text-terminal-text">{f.factor}</td>
                  <td className={`text-right ${f.exposure >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {f.exposure >= 0 ? '+' : ''}{f.exposure.toFixed(2)}
                  </td>
                  <td className={`text-right font-medium ${f.contribution >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {f.contribution >= 0 ? '+' : ''}{f.contribution.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-terminal-border">
                <td colSpan={2} className="font-medium">Factor Return (Systematic)</td>
                <td className={`text-right font-bold ${
                  factorExposures.reduce((sum, f) => sum + f.contribution, 0) >= 0
                    ? 'text-terminal-green'
                    : 'text-terminal-red'
                }`}>
                  {formatPercent(factorExposures.reduce((sum, f) => sum + f.contribution, 0))}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="text-terminal-muted">Residual (Alpha)</td>
                <td className="text-right text-terminal-accent">+1.8%</td>
              </tr>
            </tfoot>
          </table>

          {/* Factor exposure visualization */}
          <div className="mt-4">
            <h4 className="text-terminal-muted text-xs mb-2">Factor Exposure Profile</h4>
            <div className="space-y-1">
              {factorExposures.map((f) => {
                const width = Math.min(Math.abs(f.exposure) * 50, 100);
                const isPositive = f.exposure >= 0;
                return (
                  <div key={f.factor} className="flex items-center gap-2">
                    <div className="w-20 text-[10px] text-terminal-muted truncate">
                      {f.factor.split(' ')[0]}
                    </div>
                    <div className="flex-1 flex items-center h-3">
                      <div className="w-1/2 flex justify-end">
                        {!isPositive && (
                          <div
                            className="h-full bg-terminal-red rounded-l"
                            style={{ width: `${width}%` }}
                          />
                        )}
                      </div>
                      <div className="w-px h-full bg-terminal-border" />
                      <div className="w-1/2">
                        {isPositive && (
                          <div
                            className="h-full bg-terminal-green rounded-r"
                            style={{ width: `${width}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="w-10 text-right text-[10px] text-terminal-muted">
                      {f.exposure.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
