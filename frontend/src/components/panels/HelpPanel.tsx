'use client';

export function HelpPanel() {
  return (
    <div className="panel h-full overflow-auto">
      <div className="panel-header">
        <span className="panel-title">Help</span>
      </div>
      <div className="panel-content">
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="text-terminal-accent font-bold mb-2">Navigation</h3>
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="text-terminal-text w-1/3">AAPL</td>
                  <td className="text-terminal-muted">Security overview</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">AAPL GP</td>
                  <td className="text-terminal-muted">Price chart (Graph Price)</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">AAPL GP 1Y</td>
                  <td className="text-terminal-muted">Price chart with period</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">AAPL FA</td>
                  <td className="text-terminal-muted">Fundamentals</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">AAPL FILINGS</td>
                  <td className="text-terminal-muted">SEC filings</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">AAPL 10K</td>
                  <td className="text-terminal-muted">10-K filings only</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-terminal-accent font-bold mb-2">News & Macro</h3>
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="text-terminal-text w-1/3">NEWS</td>
                  <td className="text-terminal-muted">Market news</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">NEWS CRYPTO</td>
                  <td className="text-terminal-muted">Crypto news</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">AAPL NEWS</td>
                  <td className="text-terminal-muted">Company news</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">MACRO CPI</td>
                  <td className="text-terminal-muted">Economic data (CPI, GDP, etc)</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">YCRV</td>
                  <td className="text-terminal-muted">Treasury yield curve</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-terminal-accent font-bold mb-2">Screener & Analytics</h3>
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="text-terminal-text w-1/3">SCREEN VALUE</td>
                  <td className="text-terminal-muted">Value stock screen</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">SCREEN GROWTH</td>
                  <td className="text-terminal-muted">Growth stock screen</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">SCREEN DIVIDEND</td>
                  <td className="text-terminal-muted">Dividend stock screen</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">CORR AAPL,MSFT,GOOGL</td>
                  <td className="text-terminal-muted">Correlation matrix</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">PORT</td>
                  <td className="text-terminal-muted">Portfolio view</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-terminal-accent font-bold mb-2">Watchlist</h3>
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="text-terminal-text w-1/3">WL</td>
                  <td className="text-terminal-muted">Show watchlist</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">WL ADD AAPL</td>
                  <td className="text-terminal-muted">Add to watchlist</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">WL REMOVE AAPL</td>
                  <td className="text-terminal-muted">Remove from watchlist</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-terminal-accent font-bold mb-2">Periods</h3>
            <p className="text-terminal-muted">
              1M, 3M, 6M, 1Y, 2Y, 5Y, MAX
            </p>
          </section>

          <section>
            <h3 className="text-terminal-accent font-bold mb-2">Keyboard Shortcuts</h3>
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="text-terminal-text w-1/3">/</td>
                  <td className="text-terminal-muted">Focus command bar</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">Tab</td>
                  <td className="text-terminal-muted">Accept autocomplete</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">Up/Down</td>
                  <td className="text-terminal-muted">Navigate suggestions</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">Escape</td>
                  <td className="text-terminal-muted">Clear input</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-terminal-accent font-bold mb-2">System</h3>
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="text-terminal-text w-1/3">STATUS</td>
                  <td className="text-terminal-muted">Data source health</td>
                </tr>
                <tr>
                  <td className="text-terminal-text">HELP</td>
                  <td className="text-terminal-muted">Show this help</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-terminal-accent font-bold mb-2">Data Sources</h3>
            <p className="text-terminal-muted text-xs">
              Prices: Stooq (EOD) | Fundamentals: Yahoo | Filings: SEC EDGAR
            </p>
            <p className="text-terminal-muted text-xs mt-1">
              Macro: FRED | News: Finnhub | Screener: Database
            </p>
            <p className="text-terminal-muted text-xs mt-1">
              Note: Price data is delayed (end of day).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
