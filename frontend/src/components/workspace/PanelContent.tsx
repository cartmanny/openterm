'use client';

import { usePanel } from '@/context/PanelContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { PanelType } from '@/types/workspace';

// Import all panel components
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
import { ComparePanel } from '@/components/panels/ComparePanel';
import { EconomicCalendarPanel } from '@/components/panels/EconomicCalendarPanel';
import { EarningsCalendarPanel } from '@/components/panels/EarningsCalendarPanel';
import { AlertsPanel } from '@/components/panels/AlertsPanel';
import { LaunchpadPanel } from '@/components/panels/LaunchpadPanel';
import { HeatmapPanel } from '@/components/panels/HeatmapPanel';
import { OrderBookPanel } from '@/components/panels/OrderBookPanel';
import { OptionsChainPanel } from '@/components/panels/OptionsChainPanel';
import { SentimentPanel } from '@/components/panels/SentimentPanel';
import { InsiderPanel } from '@/components/panels/InsiderPanel';
import { EmptyPanel } from './EmptyPanel';

export function PanelContent() {
  const { state, setTicker, setType } = usePanel();
  const { panelType, currentTicker, currentInstrumentId, params } = state;

  // Build props and render the appropriate panel
  const renderPanel = () => {
    switch (panelType) {
      case 'overview':
        if (!currentInstrumentId || !currentTicker) {
          return <EmptyPanel message="Enter a ticker to view overview" />;
        }
        return <OverviewPanel instrumentId={currentInstrumentId} ticker={currentTicker} />;

      case 'chart':
        if (!currentInstrumentId || !currentTicker) {
          return <EmptyPanel message="Enter a ticker to view chart" />;
        }
        return (
          <ChartPanel
            instrumentId={currentInstrumentId}
            ticker={currentTicker}
            period={params.chartPeriod}
          />
        );

      case 'fundamentals':
        if (!currentInstrumentId || !currentTicker) {
          return <EmptyPanel message="Enter a ticker to view fundamentals" />;
        }
        return (
          <FundamentalsPanel
            instrumentId={currentInstrumentId}
            ticker={currentTicker}
          />
        );

      case 'filings':
        if (!currentTicker) {
          return <EmptyPanel message="Enter a ticker to view filings" />;
        }
        return (
          <FilingsPanel
            ticker={currentTicker}
            formType={params.filingsFormType}
          />
        );

      case 'news':
        if (!currentTicker) {
          return <EmptyPanel message="Enter a ticker to view company news" />;
        }
        return <NewsPanel ticker={currentTicker} />;

      case 'market_news':
        return <NewsPanel category={params.newsCategory || 'general'} />;

      case 'macro':
        if (!params.macroSeriesId) {
          return <EmptyPanel message="Use MACRO CPI, MACRO GDP, etc." />;
        }
        return <MacroPanel seriesId={params.macroSeriesId} />;

      case 'yield_curve':
        return <YieldCurvePanel />;

      case 'screener':
        return <ScreenerPanel template={params.screenerTemplate} />;

      case 'portfolio':
        return <PortfolioPanel portfolioId={params.portfolioId} />;

      case 'correlation':
        if (!params.correlationTickers || params.correlationTickers.length < 2) {
          return <EmptyPanel message="Use CORR AAPL,MSFT,GOOGL" />;
        }
        return (
          <CorrelationPanel
            tickers={params.correlationTickers}
            period={params.correlationPeriod}
          />
        );

      case 'compare':
        if (!params.compareTickers || params.compareTickers.length < 1) {
          return <EmptyPanel message="Use COMP AAPL,MSFT,GOOGL" />;
        }
        return (
          <ComparePanel
            tickers={params.compareTickers}
            benchmark={params.compareBenchmark}
            period={params.comparePeriod}
          />
        );

      case 'economic_calendar':
        return <EconomicCalendarPanel filter={params.ecoFilter} />;

      case 'earnings_calendar':
        return <EarningsCalendarPanel filter={params.earnFilter} />;

      case 'alerts':
        return <AlertsPanel />;

      case 'launchpad':
        return <LaunchpadPanel />;

      case 'heatmap':
        return <HeatmapPanel />;

      case 'orderbook':
        return <OrderBookPanel symbol={params.cryptoSymbol} />;

      case 'options':
        if (!currentTicker) {
          return <EmptyPanel message="Enter a ticker to view options chain" />;
        }
        return <OptionsChainPanel ticker={currentTicker} />;

      case 'sentiment':
        if (!currentTicker) {
          return <EmptyPanel message="Enter a ticker to view sentiment" />;
        }
        return <SentimentPanel ticker={currentTicker} />;

      case 'insider':
        return <InsiderPanel ticker={currentTicker || undefined} />;

      case 'watchlist':
        return (
          <WatchlistPanel
            onSelectTicker={(ticker, instrumentId) => {
              setTicker(ticker, instrumentId);
              setType('chart');
            }}
          />
        );

      case 'help':
        return <HelpPanel />;

      case 'status':
        return <DataStatusPanel />;

      case 'empty':
      default:
        return <EmptyPanel />;
    }
  };

  return (
    <div className="flex-1 overflow-hidden">
      {renderPanel()}
    </div>
  );
}
