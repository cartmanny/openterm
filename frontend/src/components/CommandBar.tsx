'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useTerminal } from '@/context/TerminalContext';
import { api, InstrumentSearchResult } from '@/lib/api';

export function CommandBar() {
  const {
    currentTicker,
    executeCommand,
    addToHistory,
    setCurrentTicker,
    setActivePanel,
    setMacroSeriesId,
    setNewsCategory,
    setScreenerTemplate,
    setPortfolioId,
    setCorrelationTickers,
  } = useTerminal();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<InstrumentSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Focus input on / key
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
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

    // Handle command
    switch (command.type) {
      case 'overview':
      case 'chart':
      case 'fundamentals':
      case 'filings':
      case 'news':
        try {
          const instrument = await api.getInstrumentByTicker(command.ticker);
          setCurrentTicker(instrument.ticker, instrument.id);
          setActivePanel(command.type);
        } catch (error) {
          console.error('Instrument not found:', command.ticker);
        }
        break;

      case 'market_news':
        setNewsCategory(command.category);
        setActivePanel('market_news');
        break;

      case 'macro':
        setMacroSeriesId(command.seriesId);
        setActivePanel('macro');
        break;

      case 'yield_curve':
        setActivePanel('yield_curve');
        break;

      case 'screener':
        setScreenerTemplate(command.template || null);
        setActivePanel('screener');
        break;

      case 'portfolio':
        setPortfolioId(command.portfolioId || null);
        setActivePanel('portfolio');
        break;

      case 'correlation':
        setCorrelationTickers(command.tickers, command.period);
        setActivePanel('correlation');
        break;

      case 'watchlist':
        setActivePanel('watchlist');
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
        setActivePanel('help');
        break;

      case 'status':
        setActivePanel('status');
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
  };

  const handleSuggestionClick = (suggestion: InstrumentSearchResult) => {
    setInput(suggestion.ticker + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="command-bar relative">
      <div className="flex items-center">
        {currentTicker && (
          <span className="text-terminal-accent mr-2">[{currentTicker}]</span>
        )}
        <span className="text-terminal-muted mr-2">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="command-input"
          placeholder="Enter command (e.g., AAPL GP 1Y)"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="text-terminal-muted text-sm ml-4">Press / to focus</span>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div>
                <span className="autocomplete-ticker">{suggestion.ticker}</span>
                <span className="autocomplete-name">{suggestion.name}</span>
              </div>
              <span className="text-terminal-muted text-xs">{suggestion.exchange}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
