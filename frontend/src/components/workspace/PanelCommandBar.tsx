'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { usePanel } from '@/context/PanelContext';
import { api, InstrumentSearchResult } from '@/lib/api';
import { PanelType } from '@/types/workspace';

export function PanelCommandBar() {
  const {
    state,
    executeCommand,
    addToHistory,
    getPreviousCommand,
    getNextCommand,
    setTicker,
    setType,
    setParams,
    commandBarRef,
    focus,
  } = usePanel();

  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<InstrumentSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Focus command bar when panel is focused and user presses /
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== commandBarRef.current) {
        e.preventDefault();
        commandBarRef.current?.focus();
        focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandBarRef, focus]);

  // Debounced search
  const searchInstruments = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await api.searchInstruments(query, 8);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const firstWord = value.trim().split(/\s+/)[0];
    if (firstWord && !value.includes(' ')) {
      debounceRef.current = setTimeout(() => {
        searchInstruments(firstWord);
      }, 150);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleExecute = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addToHistory(trimmed);
    setShowSuggestions(false);

    const command = executeCommand(trimmed);

    // Handle command - update panel state
    switch (command.type) {
      case 'overview':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setTicker(instrument.ticker, instrument.id);
          setType('overview');
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'chart':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setTicker(instrument.ticker, instrument.id);
          setType('chart', { chartPeriod: command.period });
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'fundamentals':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setTicker(instrument.ticker, instrument.id);
          setType('fundamentals');
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'filings':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setTicker(instrument.ticker, instrument.id);
          setType('filings', { filingsFormType: command.formType });
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'news':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setTicker(instrument.ticker, instrument.id);
          setType('news');
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'market_news':
        setType('market_news', { newsCategory: command.category });
        break;

      case 'macro':
        setType('macro', { macroSeriesId: command.seriesId });
        break;

      case 'yield_curve':
        setType('yield_curve');
        break;

      case 'screener':
        setType('screener', { screenerTemplate: command.template });
        break;

      case 'portfolio':
        setType('portfolio', { portfolioId: command.portfolioId });
        break;

      case 'correlation':
        setType('correlation', {
          correlationTickers: command.tickers,
          correlationPeriod: command.period,
        });
        break;

      case 'compare':
        setType('compare', {
          compareTickers: command.tickers,
          compareBenchmark: command.benchmark,
          comparePeriod: command.period,
        });
        break;

      case 'economic_calendar':
        setType('economic_calendar', { ecoFilter: command.filter });
        break;

      case 'earnings_calendar':
        setType('earnings_calendar', { earnFilter: command.filter });
        break;

      case 'alerts':
        setType('alerts');
        break;

      case 'launchpad':
        setType('launchpad');
        break;

      case 'heatmap':
        setType('heatmap');
        break;

      case 'orderbook':
        setType('orderbook', { cryptoSymbol: command.symbol });
        break;

      case 'options':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setTicker(instrument.ticker, instrument.id);
          setType('options');
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'sentiment':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setTicker(instrument.ticker, instrument.id);
          setType('sentiment');
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'insider':
        if (command.ticker) {
          try {
            const instrument = await api.getInstrumentByTicker(command.ticker);
            setTicker(instrument.ticker, instrument.id);
          } catch (error) {
            // Allow viewing all insiders without specific ticker
          }
        }
        setType('insider');
        break;

      case 'watchlist':
        setType('watchlist');
        break;

      case 'watchlist_add':
        try {
          const watchlist = await api.getDefaultWatchlist();
          await api.addToWatchlist(watchlist.id, command.ticker);
        } catch (error) {
          console.error('Failed to add to watchlist:', error);
        }
        break;

      case 'help':
        setType('help');
        break;

      case 'status':
        setType('status');
        break;

      case 'error':
        console.error('Command error:', command.message);
        break;
    }

    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        return;
      }
      if (e.key === 'Tab' && selectedIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        setInput(selected.ticker + ' ');
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      if (showSuggestions && selectedIndex >= 0) {
        const selected = suggestions[selectedIndex];
        setInput(selected.ticker + ' ');
        setShowSuggestions(false);
      } else {
        handleExecute();
      }
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInput('');
    }

    // Command history navigation
    if (e.key === 'ArrowUp' && !showSuggestions) {
      e.preventDefault();
      const prev = getPreviousCommand();
      if (prev) setInput(prev);
    }

    if (e.key === 'ArrowDown' && !showSuggestions) {
      e.preventDefault();
      const next = getNextCommand();
      if (next) setInput(next);
    }
  };

  const handleSuggestionClick = (suggestion: InstrumentSearchResult) => {
    setInput(suggestion.ticker + ' ');
    setShowSuggestions(false);
    commandBarRef.current?.focus();
  };

  return (
    <div className="relative border-b border-terminal-border">
      <div className="flex items-center px-2 py-1">
        <span className="text-terminal-muted mr-1 text-sm">&gt;</span>
        <input
          ref={commandBarRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={focus}
          className="flex-1 bg-transparent text-terminal-text text-sm font-mono outline-none placeholder:text-terminal-muted/50"
          placeholder="Enter command..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 bg-terminal-panel border border-terminal-border rounded-b shadow-lg max-h-48 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`
                px-2 py-1 cursor-pointer flex items-center justify-between
                ${index === selectedIndex ? 'bg-terminal-accent/20' : 'hover:bg-terminal-border/50'}
              `}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-terminal-accent font-bold text-sm">{suggestion.ticker}</span>
                <span className="text-terminal-muted text-xs truncate">{suggestion.name}</span>
              </div>
              <span className="text-terminal-muted text-xs">{suggestion.exchange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
