'use client';

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { PanelId, PanelState, PanelType, PanelParams } from '@/types/workspace';
import { parseCommand, Command } from '@/lib/commands/parser';
import { useWorkspace } from './WorkspaceContext';

interface PanelContextType {
  // Identity
  panelId: PanelId;

  // State (read from workspace)
  state: PanelState;

  // Focus state
  isFocused: boolean;

  // Actions
  executeCommand: (input: string) => Command;
  setTicker: (ticker: string, instrumentId: string) => void;
  setType: (type: PanelType, params?: PanelParams) => void;
  setParams: (params: Partial<PanelParams>) => void;

  // Command history
  addToHistory: (command: string) => void;
  getPreviousCommand: () => string | null;
  getNextCommand: () => string | null;

  // Focus
  focus: () => void;

  // Ref for command bar focus
  commandBarRef: React.RefObject<HTMLInputElement>;
}

const PanelContext = createContext<PanelContextType | null>(null);

interface PanelProviderProps {
  panelId: PanelId;
  children: ReactNode;
}

export function PanelProvider({ panelId, children }: PanelProviderProps) {
  const workspace = useWorkspace();
  const commandBarRef = useRef<HTMLInputElement>(null);

  const state = workspace.workspace.panels[panelId];
  const isFocused = workspace.workspace.focusedPanelId === panelId;

  const executeCommand = useCallback((input: string): Command => {
    const command = parseCommand(input, state.currentTicker);
    return command;
  }, [state.currentTicker]);

  const setTicker = useCallback((ticker: string, instrumentId: string) => {
    workspace.setPanelTicker(panelId, ticker, instrumentId);
  }, [workspace, panelId]);

  const setType = useCallback((type: PanelType, params?: PanelParams) => {
    workspace.setPanelType(panelId, type, params);
  }, [workspace, panelId]);

  const setParams = useCallback((params: Partial<PanelParams>) => {
    workspace.setPanelParams(panelId, params);
  }, [workspace, panelId]);

  const addToHistory = useCallback((command: string) => {
    workspace.addToHistory(panelId, command);
  }, [workspace, panelId]);

  const getPreviousCommand = useCallback((): string | null => {
    return workspace.getPreviousCommand(panelId);
  }, [workspace, panelId]);

  const getNextCommand = useCallback((): string | null => {
    return workspace.getNextCommand(panelId);
  }, [workspace, panelId]);

  const focus = useCallback(() => {
    workspace.focusPanel(panelId);
  }, [workspace, panelId]);

  return (
    <PanelContext.Provider
      value={{
        panelId,
        state,
        isFocused,
        executeCommand,
        setTicker,
        setType,
        setParams,
        addToHistory,
        getPreviousCommand,
        getNextCommand,
        focus,
        commandBarRef,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel(): PanelContextType {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanel must be used within PanelProvider');
  }
  return context;
}

/**
 * Hook to focus the command bar of the current panel
 */
export function usePanelCommandBarFocus() {
  const { commandBarRef } = usePanel();

  const focusCommandBar = useCallback(() => {
    commandBarRef.current?.focus();
  }, [commandBarRef]);

  return focusCommandBar;
}
