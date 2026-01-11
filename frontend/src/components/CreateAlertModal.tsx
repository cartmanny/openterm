'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useAlerts } from '@/context/AlertsContext';
import { api, InstrumentSearchResult } from '@/lib/api';
import { AlertCondition, AlertType, CONDITION_LABELS, CONDITION_UNITS } from '@/types/alerts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTicker?: string;
}

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'price', label: 'Price Alert' },
  { value: 'volume', label: 'Volume Alert' },
];

const PRICE_CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: 'above', label: 'Price Above' },
  { value: 'below', label: 'Price Below' },
  { value: 'crosses_above', label: 'Crosses Above' },
  { value: 'crosses_below', label: 'Crosses Below' },
  { value: 'percent_change', label: 'Percent Change' },
];

const VOLUME_CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: 'volume_spike', label: 'Volume Spike' },
];

export function CreateAlertModal({ isOpen, onClose, initialTicker }: Props) {
  const { addAlert } = useAlerts();
  const [ticker, setTicker] = useState(initialTicker || '');
  const [instrumentId, setInstrumentId] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<AlertType>('price');
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [repeating, setRepeating] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<InstrumentSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTicker(initialTicker || '');
      setInstrumentId(null);
      setAlertType('price');
      setCondition('above');
      setValue('');
      setNote('');
      setRepeating(false);
      setError('');
      setCurrentPrice(null);
    }
  }, [isOpen, initialTicker]);

  // Fetch current price when ticker changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (!ticker) {
        setCurrentPrice(null);
        return;
      }

      try {
        const instrument = await api.getInstrumentByTicker(ticker.toUpperCase());
        setInstrumentId(instrument.id);
        const response = await api.getDailyBars(instrument.id, '1M');
        if (response.data.bars.length > 0) {
          setCurrentPrice(response.data.bars[response.data.bars.length - 1].close);
        }
      } catch (error) {
        setCurrentPrice(null);
      }
    };

    const timer = setTimeout(fetchPrice, 500);
    return () => clearTimeout(timer);
  }, [ticker]);

  // Search for tickers
  const searchTickers = async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await api.searchInstruments(query, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      setSuggestions([]);
    }
  };

  const handleTickerChange = (value: string) => {
    setTicker(value.toUpperCase());
    setError('');
    searchTickers(value);
  };

  const handleSelectSuggestion = (suggestion: InstrumentSearchResult) => {
    setTicker(suggestion.ticker);
    setInstrumentId(suggestion.id);
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    // Validation
    if (!ticker.trim()) {
      setError('Please enter a ticker');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setError('Please enter a valid value');
      return;
    }

    addAlert({
      ticker: ticker.toUpperCase(),
      instrumentId: instrumentId || undefined,
      type: alertType,
      condition,
      value: numValue,
      note: note.trim() || undefined,
      repeating,
    });

    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !showSuggestions) {
      handleSubmit();
    }
  };

  const getConditions = () => {
    return alertType === 'volume' ? VOLUME_CONDITIONS : PRICE_CONDITIONS;
  };

  const getUnit = () => {
    return CONDITION_UNITS[condition];
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-terminal-bg border border-terminal-border rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <h2 className="text-lg font-semibold text-terminal-text">Create Alert</h2>
          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-terminal-text"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Ticker input */}
          <div className="relative">
            <label className="block text-sm text-terminal-muted mb-1">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => handleTickerChange(e.target.value)}
              placeholder="AAPL"
              className="w-full px-3 py-2 bg-terminal-panel border border-terminal-border rounded text-terminal-text placeholder:text-terminal-muted/50 focus:outline-none focus:ring-1 focus:ring-terminal-accent"
              autoFocus
            />
            {currentPrice !== null && (
              <div className="absolute right-3 top-8 text-sm text-terminal-muted">
                ${currentPrice.toFixed(2)}
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 bg-terminal-panel border border-terminal-border rounded shadow-lg max-h-48 overflow-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-terminal-border/50 flex items-center justify-between"
                  >
                    <span className="font-bold text-terminal-accent">{suggestion.ticker}</span>
                    <span className="text-sm text-terminal-muted truncate ml-2">{suggestion.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alert type */}
          <div>
            <label className="block text-sm text-terminal-muted mb-1">Alert Type</label>
            <div className="flex gap-2">
              {ALERT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setAlertType(type.value);
                    setCondition(type.value === 'volume' ? 'volume_spike' : 'above');
                  }}
                  className={`flex-1 px-3 py-2 text-sm rounded ${
                    alertType === type.value
                      ? 'bg-terminal-accent text-terminal-bg'
                      : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm text-terminal-muted mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AlertCondition)}
              className="w-full px-3 py-2 bg-terminal-panel border border-terminal-border rounded text-terminal-text focus:outline-none focus:ring-1 focus:ring-terminal-accent"
            >
              {getConditions().map((cond) => (
                <option key={cond.value} value={cond.value}>
                  {cond.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm text-terminal-muted mb-1">
              {CONDITION_LABELS[condition]} Value
            </label>
            <div className="relative">
              {getUnit() === '$' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-muted">
                  $
                </span>
              )}
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  condition === 'percent_change' ? '5' :
                  condition === 'volume_spike' ? '2' :
                  currentPrice?.toFixed(2) || '0.00'
                }
                className={`w-full px-3 py-2 bg-terminal-panel border border-terminal-border rounded text-terminal-text placeholder:text-terminal-muted/50 focus:outline-none focus:ring-1 focus:ring-terminal-accent ${
                  getUnit() === '$' ? 'pl-7' : ''
                }`}
                step={condition === 'percent_change' ? '0.5' : '0.01'}
              />
              {getUnit() && getUnit() !== '$' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-muted">
                  {getUnit()}
                </span>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm text-terminal-muted mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-3 py-2 bg-terminal-panel border border-terminal-border rounded text-terminal-text placeholder:text-terminal-muted/50 focus:outline-none focus:ring-1 focus:ring-terminal-accent"
            />
          </div>

          {/* Repeating */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="repeating"
              checked={repeating}
              onChange={(e) => setRepeating(e.target.checked)}
              className="w-4 h-4 rounded border-terminal-border bg-terminal-panel text-terminal-accent focus:ring-terminal-accent"
            />
            <label htmlFor="repeating" className="text-sm text-terminal-text">
              Repeat alert (keep active after triggering)
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-terminal-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-terminal-border text-terminal-muted hover:bg-terminal-border/80"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm rounded bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/80"
          >
            Create Alert
          </button>
        </div>
      </div>
    </div>
  );
}
