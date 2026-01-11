'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  WorkspaceState,
  PanelState,
  PanelId,
  PanelType,
  PanelParams,
  PanelPosition,
  LayoutType,
  WorkspaceTemplate,
  createDefaultWorkspace,
  isPositionVisible,
  getAdjacentPosition,
  POSITION_TO_PANEL,
  PANEL_TO_POSITION,
} from '@/types/workspace';

const STORAGE_KEY = 'openterm-workspace';
const TEMPLATES_KEY = 'openterm-workspace-templates';

interface WorkspaceContextType {
  // State
  workspace: WorkspaceState;

  // Layout actions
  setLayout: (layout: LayoutType) => void;

  // Panel management
  focusPanel: (panelId: PanelId) => void;
  focusPanelAtPosition: (position: PanelPosition) => void;
  focusDirection: (direction: 'left' | 'right' | 'up' | 'down') => void;
  swapPanels: (panelId1: PanelId, panelId2: PanelId) => void;
  maximizePanel: (panelId: PanelId) => void;
  restorePanel: () => void;

  // Panel state updates
  updatePanelState: (panelId: PanelId, updates: Partial<PanelState>) => void;
  setPanelType: (panelId: PanelId, type: PanelType, params?: PanelParams) => void;
  setPanelTicker: (panelId: PanelId, ticker: string, instrumentId: string) => void;
  setPanelParams: (panelId: PanelId, params: Partial<PanelParams>) => void;

  // Command history (per-panel)
  addToHistory: (panelId: PanelId, command: string) => void;
  getPreviousCommand: (panelId: PanelId) => string | null;
  getNextCommand: (panelId: PanelId) => string | null;

  // Workspace persistence
  saveWorkspaceAsTemplate: (name: string, description?: string) => void;
  loadWorkspaceTemplate: (template: WorkspaceTemplate) => void;
  getSavedTemplates: () => WorkspaceTemplate[];
  deleteTemplate: (templateId: string) => void;

  // Derived state
  getFocusedPanel: () => PanelState;
  getPanelAtPosition: (position: PanelPosition) => PanelState | null;
  getVisiblePanels: () => PanelState[];
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

function loadWorkspaceFromStorage(): WorkspaceState {
  if (typeof window === 'undefined') {
    return createDefaultWorkspace();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (parsed.layout && parsed.panels && parsed.focusedPanelId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load workspace from storage:', e);
  }

  return createDefaultWorkspace();
}

function saveWorkspaceToStorage(workspace: WorkspaceState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch (e) {
    console.error('Failed to save workspace to storage:', e);
  }
}

function loadTemplatesFromStorage(): WorkspaceTemplate[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load templates from storage:', e);
  }

  return [];
}

function saveTemplatesToStorage(templates: WorkspaceTemplate[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to storage:', e);
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(createDefaultWorkspace);
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([]);
  const [maximizedPanelId, setMaximizedPanelId] = useState<PanelId | null>(null);
  const [previousLayout, setPreviousLayout] = useState<LayoutType | null>(null);

  // Load from storage on mount
  useEffect(() => {
    setWorkspace(loadWorkspaceFromStorage());
    setTemplates(loadTemplatesFromStorage());
  }, []);

  // Save to storage on changes
  useEffect(() => {
    saveWorkspaceToStorage(workspace);
  }, [workspace]);

  // Layout actions
  const setLayout = useCallback((layout: LayoutType) => {
    setWorkspace(prev => ({
      ...prev,
      layout,
      lastModified: Date.now(),
    }));
  }, []);

  // Panel focus
  const focusPanel = useCallback((panelId: PanelId) => {
    setWorkspace(prev => ({
      ...prev,
      focusedPanelId: panelId,
    }));
  }, []);

  const focusPanelAtPosition = useCallback((position: PanelPosition) => {
    const panelId = POSITION_TO_PANEL[position];
    focusPanel(panelId);
  }, [focusPanel]);

  const focusDirection = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    setWorkspace(prev => {
      const currentPosition = PANEL_TO_POSITION[prev.focusedPanelId];
      const nextPosition = getAdjacentPosition(currentPosition, direction, prev.layout);

      if (nextPosition) {
        return {
          ...prev,
          focusedPanelId: POSITION_TO_PANEL[nextPosition],
        };
      }

      return prev;
    });
  }, []);

  // Panel swap
  const swapPanels = useCallback((panelId1: PanelId, panelId2: PanelId) => {
    setWorkspace(prev => {
      const panel1 = prev.panels[panelId1];
      const panel2 = prev.panels[panelId2];

      return {
        ...prev,
        panels: {
          ...prev.panels,
          [panelId1]: {
            ...panel2,
            id: panelId1,
            position: panel1.position,
          },
          [panelId2]: {
            ...panel1,
            id: panelId2,
            position: panel2.position,
          },
        },
        lastModified: Date.now(),
      };
    });
  }, []);

  // Maximize/restore
  const maximizePanel = useCallback((panelId: PanelId) => {
    setWorkspace(prev => {
      setPreviousLayout(prev.layout);
      setMaximizedPanelId(panelId);

      // Move the panel to top-left and switch to 1x1
      const panel = prev.panels[panelId];

      return {
        ...prev,
        layout: '1x1',
        focusedPanelId: 'panel-1',
        panels: {
          ...prev.panels,
          'panel-1': {
            ...panel,
            id: 'panel-1',
            position: 'top-left',
            isMaximized: true,
          },
          [panelId]: panelId !== 'panel-1' ? {
            ...prev.panels['panel-1'],
            id: panelId,
            position: PANEL_TO_POSITION[panelId],
            isMaximized: false,
          } : prev.panels[panelId],
        },
        lastModified: Date.now(),
      };
    });
  }, []);

  const restorePanel = useCallback(() => {
    if (previousLayout && maximizedPanelId) {
      setWorkspace(prev => ({
        ...prev,
        layout: previousLayout,
        panels: {
          ...prev.panels,
          'panel-1': {
            ...prev.panels['panel-1'],
            isMaximized: false,
          },
        },
        lastModified: Date.now(),
      }));
      setMaximizedPanelId(null);
      setPreviousLayout(null);
    }
  }, [previousLayout, maximizedPanelId]);

  // Panel state updates
  const updatePanelState = useCallback((panelId: PanelId, updates: Partial<PanelState>) => {
    setWorkspace(prev => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panelId]: {
          ...prev.panels[panelId],
          ...updates,
        },
      },
      lastModified: Date.now(),
    }));
  }, []);

  const setPanelType = useCallback((panelId: PanelId, type: PanelType, params?: PanelParams) => {
    updatePanelState(panelId, {
      panelType: type,
      params: params || {},
    });
  }, [updatePanelState]);

  const setPanelTicker = useCallback((panelId: PanelId, ticker: string, instrumentId: string) => {
    updatePanelState(panelId, {
      currentTicker: ticker,
      currentInstrumentId: instrumentId,
    });
  }, [updatePanelState]);

  const setPanelParams = useCallback((panelId: PanelId, params: Partial<PanelParams>) => {
    setWorkspace(prev => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panelId]: {
          ...prev.panels[panelId],
          params: {
            ...prev.panels[panelId].params,
            ...params,
          },
        },
      },
      lastModified: Date.now(),
    }));
  }, []);

  // Command history
  const addToHistory = useCallback((panelId: PanelId, command: string) => {
    setWorkspace(prev => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panelId]: {
          ...prev.panels[panelId],
          commandHistory: [...prev.panels[panelId].commandHistory.slice(-99), command],
          historyIndex: -1,
        },
      },
    }));
  }, []);

  const getPreviousCommand = useCallback((panelId: PanelId): string | null => {
    const panel = workspace.panels[panelId];
    if (panel.commandHistory.length === 0) return null;

    const newIndex = panel.historyIndex === -1
      ? panel.commandHistory.length - 1
      : Math.max(0, panel.historyIndex - 1);

    setWorkspace(prev => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panelId]: {
          ...prev.panels[panelId],
          historyIndex: newIndex,
        },
      },
    }));

    return panel.commandHistory[newIndex] || null;
  }, [workspace.panels]);

  const getNextCommand = useCallback((panelId: PanelId): string | null => {
    const panel = workspace.panels[panelId];
    if (panel.historyIndex === -1) return null;

    const newIndex = panel.historyIndex + 1;

    if (newIndex >= panel.commandHistory.length) {
      setWorkspace(prev => ({
        ...prev,
        panels: {
          ...prev.panels,
          [panelId]: {
            ...prev.panels[panelId],
            historyIndex: -1,
          },
        },
      }));
      return null;
    }

    setWorkspace(prev => ({
      ...prev,
      panels: {
        ...prev.panels,
        [panelId]: {
          ...prev.panels[panelId],
          historyIndex: newIndex,
        },
      },
    }));

    return panel.commandHistory[newIndex] || null;
  }, [workspace.panels]);

  // Template management
  const saveWorkspaceAsTemplate = useCallback((name: string, description?: string) => {
    const template: WorkspaceTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      layout: workspace.layout,
      panels: Object.fromEntries(
        Object.entries(workspace.panels).map(([id, panel]) => [
          id,
          {
            id: panel.id,
            position: panel.position,
            panelType: panel.panelType,
            currentTicker: panel.currentTicker,
            currentInstrumentId: panel.currentInstrumentId,
            params: panel.params,
            isMaximized: false,
          },
        ])
      ) as WorkspaceTemplate['panels'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newTemplates = [...templates, template];
    setTemplates(newTemplates);
    saveTemplatesToStorage(newTemplates);
  }, [workspace, templates]);

  const loadWorkspaceTemplate = useCallback((template: WorkspaceTemplate) => {
    setWorkspace(prev => {
      // Start with existing panels structure
      const newPanels = { ...prev.panels };

      // Override with template panels
      for (const [id, panel] of Object.entries(template.panels)) {
        if (panel && (id === 'panel-1' || id === 'panel-2' || id === 'panel-3' || id === 'panel-4')) {
          newPanels[id as PanelId] = {
            ...panel,
            id: id as PanelId,
            commandHistory: [],
            historyIndex: -1,
          } as PanelState;
        }
      }

      return {
        layout: template.layout,
        panels: newPanels,
        focusedPanelId: 'panel-1',
        workspaceName: template.name,
        lastModified: Date.now(),
      };
    });
  }, []);

  const getSavedTemplates = useCallback((): WorkspaceTemplate[] => {
    return templates;
  }, [templates]);

  const deleteTemplate = useCallback((templateId: string) => {
    const newTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(newTemplates);
    saveTemplatesToStorage(newTemplates);
  }, [templates]);

  // Derived state
  const getFocusedPanel = useCallback((): PanelState => {
    return workspace.panels[workspace.focusedPanelId];
  }, [workspace.panels, workspace.focusedPanelId]);

  const getPanelAtPosition = useCallback((position: PanelPosition): PanelState | null => {
    const panelId = POSITION_TO_PANEL[position];
    if (!isPositionVisible(workspace.layout, position)) {
      return null;
    }
    return workspace.panels[panelId];
  }, [workspace.panels, workspace.layout]);

  const getVisiblePanels = useCallback((): PanelState[] => {
    return Object.values(workspace.panels).filter(panel =>
      isPositionVisible(workspace.layout, panel.position)
    );
  }, [workspace.panels, workspace.layout]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        setLayout,
        focusPanel,
        focusPanelAtPosition,
        focusDirection,
        swapPanels,
        maximizePanel,
        restorePanel,
        updatePanelState,
        setPanelType,
        setPanelTicker,
        setPanelParams,
        addToHistory,
        getPreviousCommand,
        getNextCommand,
        saveWorkspaceAsTemplate,
        loadWorkspaceTemplate,
        getSavedTemplates,
        deleteTemplate,
        getFocusedPanel,
        getPanelAtPosition,
        getVisiblePanels,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
