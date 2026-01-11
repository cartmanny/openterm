'use client';

import { useTerminal } from '@/context/TerminalContext';
import { OverviewPanel } from '@/components/panels/OverviewPanel';
import { ChartPanel } from '@/components/panels/ChartPanel';
import { FundamentalsPanel } from '@/components/panels/FundamentalsPanel';
import { FilingsPanel } from '@/components/panels/FilingsPanel';
import { WatchlistPanel } from '@/components/panels/WatchlistPanel';
import { HelpPanel } from '@/components/panels/HelpPanel';
import { DataStatusPanel } from '@/components/panels/DataStatusPanel';
import { NewsPanel } from '@/components/panels/NewsPanel';
import { MacroPanel } from '@/components/panels/MacroPanel';
import { YieldCurvePanel } from '@/components/panels/YieldCurvePanel';
import { ScreenerPanel } from '@/components/panels/ScreenerPanel';
import { PortfolioPanel } from '@/components/panels/PortfolioPanel';
import { CorrelationPanel } from '@/components/panels/CorrelationPanel';

export function PanelContainer() {
  const {
    activePanel,
    currentTicker,
    currentInstrumentId,
    macroSeriesId,
    newsCategory,
    screenerTemplate,
    portfolioId,
    correlationTickers,
    correlationPeriod,
  } = useTerminal();

  // Full-width panels (no sidebar columns)
  const isFullWidth = ['screener', 'portfolio', 'correlation', 'yield_curve', 'market_news', 'macro'].includes(activePanel);

  if (isFullWidth) {
    return (
      <div className="h-full p-2">
        {activePanel === 'market_news' && (
          <NewsPanel category={newsCategory} />
        )}
        {activePanel === 'macro' && macroSeriesId && (
          <MacroPanel seriesId={macroSeriesId} />
        )}
        {activePanel === 'yield_curve' && (
          <YieldCurvePanel />
        )}
        {activePanel === 'screener' && (
          <ScreenerPanel template={screenerTemplate || undefined} />
        )}
        {activePanel === 'portfolio' && (
          <PortfolioPanel portfolioId={portfolioId || undefined} />
        )}
        {activePanel === 'correlation' && correlationTickers.length >= 2 && (
          <CorrelationPanel tickers={correlationTickers} period={correlationPeriod} />
        )}
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-3 gap-2 p-2">
      {/* Left column: Overview or Watchlist */}
      <div className="col-span-1 flex flex-col gap-2">
        {currentInstrumentId ? (
          <OverviewPanel instrumentId={currentInstrumentId} ticker={currentTicker!} />
        ) : (
          <WelcomePanel />
        )}
        <WatchlistPanel />
      </div>

      {/* Middle column: Main content */}
      <div className="col-span-1">
        {activePanel === 'chart' && currentInstrumentId && (
          <ChartPanel instrumentId={currentInstrumentId} ticker={currentTicker!} />
        )}
        {activePanel === 'fundamentals' && currentInstrumentId && (
          <FundamentalsPanel instrumentId={currentInstrumentId} ticker={currentTicker!} />
        )}
        {activePanel === 'filings' && currentTicker && (
          <FilingsPanel ticker={currentTicker} />
        )}
        {activePanel === 'news' && currentTicker && (
          <NewsPanel ticker={currentTicker} />
        )}
        {activePanel === 'help' && <HelpPanel />}
        {activePanel === 'status' && <DataStatusPanel />}
        {(activePanel === 'overview' || !activePanel) && currentInstrumentId && (
          <ChartPanel instrumentId={currentInstrumentId} ticker={currentTicker!} />
        )}
      </div>

      {/* Right column: Additional info */}
      <div className="col-span-1 flex flex-col gap-2">
        {currentInstrumentId && (
          <>
            <FundamentalsPanel instrumentId={currentInstrumentId} ticker={currentTicker!} compact />
            <FilingsPanel ticker={currentTicker!} compact />
          </>
        )}
      </div>
    </div>
  );
}

function WelcomePanel() {
  return (
    <div className="panel h-full flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold text-terminal-accent mb-4">OpenTerm</h1>
      <p className="text-terminal-muted mb-6">
        Bloomberg-style financial terminal<br />
        with free data sources
      </p>
      <div className="text-sm text-terminal-muted">
        <p className="mb-2">Type a ticker to get started:</p>
        <p className="text-terminal-accent font-bold">AAPL</p>
        <p className="mt-4 mb-2">Or try commands like:</p>
        <p className="text-terminal-text">AAPL GP 1Y</p>
        <p className="text-terminal-text">MSFT FA</p>
        <p className="text-terminal-text">NEWS</p>
        <p className="text-terminal-text">MACRO CPI</p>
        <p className="text-terminal-text">YCRV</p>
        <p className="text-terminal-text">SCREEN VALUE</p>
        <p className="text-terminal-text">CORR AAPL,MSFT,GOOGL</p>
        <p className="mt-4 text-xs text-terminal-muted">Type HELP for all commands</p>
      </div>
    </div>
  );
}
