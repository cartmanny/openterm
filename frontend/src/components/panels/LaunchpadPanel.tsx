'use client';

import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { WorkspaceTemplate, PanelType, PANEL_TITLES, LayoutType } from '@/types/workspace';

// Built-in workspace templates
const BUILT_IN_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'builtin-trading',
    name: 'Trading View',
    description: 'Chart, watchlist, news, and company overview',
    layout: '2x2',
    panels: {
      'panel-1': {
        id: 'panel-1',
        position: 'top-left',
        panelType: 'chart',
        currentTicker: null,
        currentInstrumentId: null,
        params: { chartPeriod: '1Y' },
        isMaximized: false,
      },
      'panel-2': {
        id: 'panel-2',
        position: 'top-right',
        panelType: 'overview',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-3': {
        id: 'panel-3',
        position: 'bottom-left',
        panelType: 'watchlist',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-4': {
        id: 'panel-4',
        position: 'bottom-right',
        panelType: 'news',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-research',
    name: 'Research View',
    description: 'Fundamentals, filings, chart, and news',
    layout: '2x2',
    panels: {
      'panel-1': {
        id: 'panel-1',
        position: 'top-left',
        panelType: 'fundamentals',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-2': {
        id: 'panel-2',
        position: 'top-right',
        panelType: 'filings',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-3': {
        id: 'panel-3',
        position: 'bottom-left',
        panelType: 'chart',
        currentTicker: null,
        currentInstrumentId: null,
        params: { chartPeriod: '1Y' },
        isMaximized: false,
      },
      'panel-4': {
        id: 'panel-4',
        position: 'bottom-right',
        panelType: 'news',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-macro',
    name: 'Macro View',
    description: 'Economic calendar, yield curve, market news, and macro data',
    layout: '2x2',
    panels: {
      'panel-1': {
        id: 'panel-1',
        position: 'top-left',
        panelType: 'economic_calendar',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-2': {
        id: 'panel-2',
        position: 'top-right',
        panelType: 'yield_curve',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-3': {
        id: 'panel-3',
        position: 'bottom-left',
        panelType: 'market_news',
        currentTicker: null,
        currentInstrumentId: null,
        params: { newsCategory: 'general' },
        isMaximized: false,
      },
      'panel-4': {
        id: 'panel-4',
        position: 'bottom-right',
        panelType: 'macro',
        currentTicker: null,
        currentInstrumentId: null,
        params: { macroSeriesId: 'GDP' },
        isMaximized: false,
      },
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-portfolio',
    name: 'Portfolio View',
    description: 'Portfolio, correlation, alerts, and watchlist',
    layout: '2x2',
    panels: {
      'panel-1': {
        id: 'panel-1',
        position: 'top-left',
        panelType: 'portfolio',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-2': {
        id: 'panel-2',
        position: 'top-right',
        panelType: 'alerts',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-3': {
        id: 'panel-3',
        position: 'bottom-left',
        panelType: 'watchlist',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-4': {
        id: 'panel-4',
        position: 'bottom-right',
        panelType: 'earnings_calendar',
        currentTicker: null,
        currentInstrumentId: null,
        params: { earnFilter: 'watchlist' },
        isMaximized: false,
      },
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-screener',
    name: 'Screener View',
    description: 'Stock screener with chart, fundamentals, and news',
    layout: '2x2',
    panels: {
      'panel-1': {
        id: 'panel-1',
        position: 'top-left',
        panelType: 'screener',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-2': {
        id: 'panel-2',
        position: 'top-right',
        panelType: 'chart',
        currentTicker: null,
        currentInstrumentId: null,
        params: { chartPeriod: '1Y' },
        isMaximized: false,
      },
      'panel-3': {
        id: 'panel-3',
        position: 'bottom-left',
        panelType: 'fundamentals',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
      'panel-4': {
        id: 'panel-4',
        position: 'bottom-right',
        panelType: 'news',
        currentTicker: null,
        currentInstrumentId: null,
        params: {},
        isMaximized: false,
      },
    },
    createdAt: 0,
    updatedAt: 0,
  },
];

const LAYOUT_ICONS: Record<LayoutType, string> = {
  '1x1': '[ ]',
  '2x1': '[ | ]',
  '1x2': '[-]',
  '2x2': '[+]',
};

export function LaunchpadPanel() {
  const { workspace, saveWorkspaceAsTemplate, loadWorkspaceTemplate, getSavedTemplates, deleteTemplate } = useWorkspace();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [view, setView] = useState<'saved' | 'builtin'>('saved');

  const savedTemplates = getSavedTemplates();
  const allTemplates = view === 'builtin' ? BUILT_IN_TEMPLATES : savedTemplates;

  const handleSaveWorkspace = () => {
    if (newTemplateName.trim()) {
      saveWorkspaceAsTemplate(newTemplateName.trim(), newTemplateDescription.trim() || undefined);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setShowSaveModal(false);
    }
  };

  const handleLoadTemplate = (template: WorkspaceTemplate) => {
    loadWorkspaceTemplate(template);
  };

  const handleDeleteTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this workspace?')) {
      deleteTemplate(templateId);
    }
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return 'Built-in';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPanelPreview = (template: WorkspaceTemplate): string[] => {
    return Object.values(template.panels)
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .slice(0, 4)
      .map(p => PANEL_TITLES[p.panelType as PanelType] || p.panelType);
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="panel-title">Workspace Launchpad</span>
        </div>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setView('saved')}
            className={`px-2 py-0.5 text-xs rounded ${
              view === 'saved'
                ? 'bg-terminal-accent text-terminal-bg'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            MY WORKSPACES ({savedTemplates.length})
          </button>
          <button
            onClick={() => setView('builtin')}
            className={`px-2 py-0.5 text-xs rounded ${
              view === 'builtin'
                ? 'bg-terminal-accent text-terminal-bg'
                : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }`}
          >
            TEMPLATES ({BUILT_IN_TEMPLATES.length})
          </button>
          <span className="w-px h-4 bg-terminal-border mx-1" />
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-2 py-0.5 text-xs rounded bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30"
          >
            + SAVE CURRENT
          </button>
        </div>
      </div>

      <div className="panel-content flex-1 overflow-auto p-4">
        {allTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-terminal-muted">
            <p className="text-lg mb-2">No saved workspaces</p>
            <p className="text-sm mb-4">Save your current workspace to access it later</p>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-4 py-2 text-sm rounded bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/80"
            >
              Save Current Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleLoadTemplate(template)}
                className="bg-terminal-panel border border-terminal-border rounded-lg p-4 cursor-pointer hover:border-terminal-accent transition-colors group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-terminal-text group-hover:text-terminal-accent transition-colors">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-xs text-terminal-muted mt-0.5">
                        {template.description}
                      </p>
                    )}
                  </div>
                  {!template.id.startsWith('builtin-') && (
                    <button
                      onClick={(e) => handleDeleteTemplate(template.id, e)}
                      className="text-terminal-muted hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Layout Preview */}
                <div className="mb-3">
                  <LayoutPreview layout={template.layout} panels={template.panels} />
                </div>

                {/* Panels List */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {getPanelPreview(template).map((panelName, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 text-xs bg-terminal-border rounded text-terminal-muted"
                    >
                      {panelName}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-terminal-muted">
                  <span className="font-mono">{LAYOUT_ICONS[template.layout]}</span>
                  <span>{formatDate(template.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Workspace Info */}
      <div className="border-t border-terminal-border px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-terminal-muted">Current:</span>
          <span className="text-terminal-text font-medium">{workspace.workspaceName}</span>
          <span className="text-terminal-muted">({workspace.layout})</span>
        </div>
        <div className="text-terminal-muted">
          {Object.values(workspace.panels)
            .filter(p => p.currentTicker)
            .map(p => p.currentTicker)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(', ') || 'No tickers loaded'}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="bg-terminal-bg border border-terminal-border rounded-lg shadow-xl w-full max-w-md mx-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-terminal-text mb-4">Save Workspace</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-terminal-muted mb-1">Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My Trading Setup"
                  className="w-full px-3 py-2 bg-terminal-panel border border-terminal-border rounded text-terminal-text placeholder:text-terminal-muted/50 focus:outline-none focus:ring-1 focus:ring-terminal-accent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-terminal-muted mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="4-panel layout for day trading"
                  className="w-full px-3 py-2 bg-terminal-panel border border-terminal-border rounded text-terminal-text placeholder:text-terminal-muted/50 focus:outline-none focus:ring-1 focus:ring-terminal-accent"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm text-terminal-muted mb-1">Preview</label>
                <div className="p-2 bg-terminal-panel border border-terminal-border rounded">
                  <LayoutPreview layout={workspace.layout} panels={workspace.panels} showTickers />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm rounded bg-terminal-border text-terminal-muted hover:bg-terminal-border/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkspace}
                disabled={!newTemplateName.trim()}
                className="px-4 py-2 text-sm rounded bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Visual preview of layout with panel types
function LayoutPreview({
  layout,
  panels,
  showTickers = false,
}: {
  layout: LayoutType;
  panels: WorkspaceTemplate['panels'];
  showTickers?: boolean;
}) {
  const gridClass = {
    '1x1': 'grid-cols-1 grid-rows-1',
    '2x1': 'grid-cols-2 grid-rows-1',
    '1x2': 'grid-cols-1 grid-rows-2',
    '2x2': 'grid-cols-2 grid-rows-2',
  }[layout];

  const visiblePositions = {
    '1x1': ['top-left'],
    '2x1': ['top-left', 'top-right'],
    '1x2': ['top-left', 'bottom-left'],
    '2x2': ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  }[layout];

  const positionToPanel = {
    'top-left': 'panel-1',
    'top-right': 'panel-2',
    'bottom-left': 'panel-3',
    'bottom-right': 'panel-4',
  };

  return (
    <div className={`grid ${gridClass} gap-1 h-16`}>
      {visiblePositions.map((position) => {
        const panelId = positionToPanel[position as keyof typeof positionToPanel];
        const panel = panels[panelId as keyof typeof panels];

        return (
          <div
            key={position}
            className="bg-terminal-border/50 rounded flex items-center justify-center text-xs text-terminal-muted p-1"
          >
            {panel ? (
              <div className="text-center truncate">
                <div className="font-medium text-terminal-text text-[10px]">
                  {PANEL_TITLES[panel.panelType as PanelType]?.split(' ')[0] || panel.panelType}
                </div>
                {showTickers && panel.currentTicker && (
                  <div className="text-terminal-accent text-[9px]">
                    {panel.currentTicker}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-terminal-muted/50">Empty</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
