'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { parseCommand, Command } from '@/lib/commands/parser';

interface TerminalState {
  currentTicker: string | null;
  currentInstrumentId: string | null;
  activePanel: string;
  commandHistory: string[];
  historyIndex: number;
  // Additional panel state
  macroSeriesId: string | null;
  newsCategory: string;
  screenerTemplate: string | null;
  portfolioId: string | null;
  correlationTickers: string[];
  correlationPeriod: string;
}

interface TerminalContextType extends TerminalState {
  executeCommand: (input: string) => Command;
  setCurrentTicker: (ticker: string, instrumentId: string) => void;
  setActivePanel: (panel: string) => void;
  addToHistory: (command: string) => void;
  getPreviousCommand: () => string | null;
  getNextCommand: () => string | null;
  setMacroSeriesId: (seriesId: string) => void;
  setNewsCategory: (category: string) => void;
  setScreenerTemplate: (template: string | null) => void;
  setPortfolioId: (id: string | null) => void;
  setCorrelationTickers: (tickers: string[], period?: string) => void;
}

const TerminalContext = createContext<TerminalContextType | null>(null);

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TerminalState>({
    currentTicker: null,
    currentInstrumentId: null,
    activePanel: 'overview',
    commandHistory: [],
    historyIndex: -1,
    macroSeriesId: null,
    newsCategory: 'general',
    screenerTemplate: null,
    portfolioId: null,
    correlationTickers: [],
    correlationPeriod: '1y',
  });

  const executeCommand = useCallback((input: string): Command => {
    const command = parseCommand(input, state.currentTicker);

    // Update context ticker if command has one
    if (command.type !== 'error' && command.type !== 'help' && 'ticker' in command && command.ticker) {
      setState(prev => ({
        ...prev,
        currentTicker: command.ticker!,
      }));
    }

    return command;
  }, [state.currentTicker]);

  const setCurrentTicker = useCallback((ticker: string, instrumentId: string) => {
    setState(prev => ({
      ...prev,
      currentTicker: ticker,
      currentInstrumentId: instrumentId,
    }));
  }, []);

  const setActivePanel = useCallback((panel: string) => {
    setState(prev => ({
      ...prev,
      activePanel: panel,
    }));
  }, []);

  const addToHistory = useCallback((command: string) => {
    setState(prev => ({
      ...prev,
      commandHistory: [...prev.commandHistory.slice(-99), command],
      historyIndex: -1,
    }));
  }, []);

  const getPreviousCommand = useCallback((): string | null => {
    if (state.commandHistory.length === 0) return null;

    const newIndex = state.historyIndex === -1
      ? state.commandHistory.length - 1
      : Math.max(0, state.historyIndex - 1);

    setState(prev => ({ ...prev, historyIndex: newIndex }));
    return state.commandHistory[newIndex] || null;
  }, [state.commandHistory, state.historyIndex]);

  const getNextCommand = useCallback((): string | null => {
    if (state.historyIndex === -1) return null;

    const newIndex = state.historyIndex + 1;

    if (newIndex >= state.commandHistory.length) {
      setState(prev => ({ ...prev, historyIndex: -1 }));
      return null;
    }

    setState(prev => ({ ...prev, historyIndex: newIndex }));
    return state.commandHistory[newIndex] || null;
  }, [state.commandHistory, state.historyIndex]);

  const setMacroSeriesId = useCallback((seriesId: string) => {
    setState(prev => ({ ...prev, macroSeriesId: seriesId }));
  }, []);

  const setNewsCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, newsCategory: category }));
  }, []);

  const setScreenerTemplate = useCallback((template: string | null) => {
    setState(prev => ({ ...prev, screenerTemplate: template }));
  }, []);

  const setPortfolioId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, portfolioId: id }));
  }, []);

  const setCorrelationTickers = useCallback((tickers: string[], period: string = '1y') => {
    setState(prev => ({
      ...prev,
      correlationTickers: tickers,
      correlationPeriod: period,
    }));
  }, []);

  return (
    <TerminalContext.Provider
      value={{
        ...state,
        executeCommand,
        setCurrentTicker,
        setActivePanel,
        addToHistory,
        getPreviousCommand,
        getNextCommand,
        setMacroSeriesId,
        setNewsCategory,
        setScreenerTemplate,
        setPortfolioId,
        setCorrelationTickers,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within TerminalProvider');
  }
  return context;
}
