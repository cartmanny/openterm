'use client';

import { usePanel } from '@/context/PanelContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { PANEL_TITLES, PANEL_TO_POSITION } from '@/types/workspace';

export function PanelHeader() {
  const { panelId, state, isFocused } = usePanel();
  const { maximizePanel, restorePanel, swapPanels, workspace } = useWorkspace();

  const panelNumber = panelId.replace('panel-', '');
  const isMaximized = state.isMaximized;

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) {
      restorePanel();
    } else {
      maximizePanel(panelId);
    }
  };

  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-terminal-border bg-terminal-bg/50">
      <div className="flex items-center gap-2 min-w-0">
        {/* Panel number indicator */}
        <span className={`
          text-xs font-bold w-4 h-4 flex items-center justify-center rounded
          ${isFocused ? 'bg-terminal-accent text-terminal-bg' : 'bg-terminal-border text-terminal-muted'}
        `}>
          {panelNumber}
        </span>

        {/* Ticker badge if present */}
        {state.currentTicker && (
          <span className="text-terminal-accent font-bold text-sm">
            [{state.currentTicker}]
          </span>
        )}

        {/* Panel type */}
        <span className="text-terminal-muted text-xs truncate">
          {PANEL_TITLES[state.panelType]}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Maximize/restore button */}
        <button
          onClick={handleMaximize}
          className="p-1 text-terminal-muted hover:text-terminal-text transition-colors"
          title={isMaximized ? 'Restore (Esc)' : 'Maximize (Alt+Enter)'}
        >
          {isMaximized ? (
            <RestoreIcon className="w-3 h-3" />
          ) : (
            <MaximizeIcon className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
}

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="1" />
    </svg>
  );
}

function RestoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="10" height="10" rx="1" />
      <path d="M4 10V3a1 1 0 011-1h7" />
    </svg>
  );
}
