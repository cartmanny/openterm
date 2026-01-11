'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAlerts } from '@/context/AlertsContext';
import { WorkspaceGrid, PanelSlot } from '@/components/workspace';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { HelpSearch } from '@/components/HelpSearch';
import { CreateAlertModal } from '@/components/CreateAlertModal';
import { LAYOUT_POSITIONS } from '@/types/workspace';
import { getFunction } from '@/lib/functionCatalog';

export default function Home() {
  const { workspace, setLayout, setPanelType, setPanelTicker } = useWorkspace();
  const { unreadCount, activeAlertCount } = useAlerts();
  const [showHelpSearch, setShowHelpSearch] = useState(false);
  const [helpSearchQuery, setHelpSearchQuery] = useState('');
  const [showCreateAlert, setShowCreateAlert] = useState(false);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Global keyboard shortcut for Help Search (Ctrl+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+H or Ctrl+K for help search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'k')) {
        e.preventDefault();
        setShowHelpSearch(true);
        setHelpSearchQuery('');
      }

      // ? for help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowHelpSearch(true);
        setHelpSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle command execution from help search
  const handleExecuteCommand = useCallback((command: string) => {
    // Parse command to determine if it's a function with parameters
    const parts = command.trim().split(/\s+/);
    const firstPart = parts[0].toUpperCase();
    const fn = getFunction(firstPart);

    if (fn && fn.panelType) {
      // If it's a known function with a panel type, switch to that panel
      const panelId = workspace.focusedPanelId;

      // Check if command includes a ticker
      if (fn.requiresTicker && parts.length > 1) {
        // Command like "AAPL GP" - ticker is first
        const potentialTicker = parts.find(p => p !== firstPart);
        if (potentialTicker) {
          setPanelTicker(panelId, potentialTicker.toUpperCase(), `instrument-${potentialTicker.toLowerCase()}`);
        }
      }

      setPanelType(panelId, fn.panelType as any);
    } else if (parts.length >= 1) {
      // Check if first part is a ticker followed by a function
      const secondPart = parts[1]?.toUpperCase();
      const fnFromSecond = secondPart ? getFunction(secondPart) : null;

      if (fnFromSecond && fnFromSecond.panelType) {
        // Command like "AAPL GP" - first part is ticker
        const ticker = firstPart;
        const panelId = workspace.focusedPanelId;
        setPanelTicker(panelId, ticker, `instrument-${ticker.toLowerCase()}`);
        setPanelType(panelId, fnFromSecond.panelType as any);
      }
    }
  }, [workspace.focusedPanelId, setPanelType, setPanelTicker]);

  return (
    <div className="h-screen flex flex-col">
      <main className="flex-1 overflow-hidden">
        <WorkspaceGrid layout={workspace.layout}>
          <PanelSlot position="top-left" />
          <PanelSlot position="top-right" />
          <PanelSlot position="bottom-left" />
          <PanelSlot position="bottom-right" />
        </WorkspaceGrid>
      </main>
      <StatusBar
        onOpenHelpSearch={() => setShowHelpSearch(true)}
        onOpenCreateAlert={() => setShowCreateAlert(true)}
        unreadAlerts={unreadCount}
        activeAlerts={activeAlertCount}
      />

      {/* Help Search Modal */}
      <HelpSearch
        isOpen={showHelpSearch}
        onClose={() => setShowHelpSearch(false)}
        onExecuteCommand={handleExecuteCommand}
        initialQuery={helpSearchQuery}
      />

      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={showCreateAlert}
        onClose={() => setShowCreateAlert(false)}
      />
    </div>
  );
}

function StatusBar({
  onOpenHelpSearch,
  onOpenCreateAlert,
  unreadAlerts,
  activeAlerts,
}: {
  onOpenHelpSearch: () => void;
  onOpenCreateAlert: () => void;
  unreadAlerts: number;
  activeAlerts: number;
}) {
  const { workspace, setLayout } = useWorkspace();
  const focusedPanel = workspace.panels[workspace.focusedPanelId];

  return (
    <footer className="h-6 bg-terminal-panel border-t border-terminal-border px-4 flex items-center justify-between text-xs text-terminal-muted">
      <div className="flex items-center gap-4">
        <span>OpenTerm v0.1.0</span>
        <span className="text-terminal-muted/50">|</span>
        <button
          onClick={onOpenHelpSearch}
          className="hover:text-terminal-accent transition-colors"
        >
          Press ? or Ctrl+H for help
        </button>
        <span className="text-terminal-muted/50">|</span>
        <button
          onClick={onOpenCreateAlert}
          className="hover:text-terminal-accent transition-colors flex items-center gap-1"
        >
          <span>Alerts ({activeAlerts})</span>
          {unreadAlerts > 0 && (
            <span className="px-1 py-0.5 rounded-full bg-red-500 text-white text-[10px] min-w-[16px] text-center">
              {unreadAlerts}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Layout indicator */}
        <div className="flex items-center gap-1">
          <span className="text-terminal-muted/50">Layout:</span>
          <div className="flex gap-0.5">
            {(['1x1', '2x1', '1x2', '2x2'] as const).map((layout) => (
              <button
                key={layout}
                onClick={() => setLayout(layout)}
                className={`
                  w-4 h-4 flex items-center justify-center text-[8px] rounded
                  ${workspace.layout === layout
                    ? 'bg-terminal-accent text-terminal-bg'
                    : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
                  }
                `}
                title={`${layout} layout (Alt+${layout === '1x1' ? '1' : layout === '2x1' ? '2' : layout === '1x2' ? '3' : '4'})`}
              >
                <LayoutIcon layout={layout} />
              </button>
            ))}
          </div>
        </div>

        {/* Focused panel indicator */}
        {focusedPanel.currentTicker && (
          <>
            <span className="text-terminal-muted/50">|</span>
            <span className="text-terminal-accent">{focusedPanel.currentTicker}</span>
          </>
        )}
      </div>
    </footer>
  );
}

function LayoutIcon({ layout }: { layout: '1x1' | '2x1' | '1x2' | '2x2' }) {
  switch (layout) {
    case '1x1':
      return (
        <svg viewBox="0 0 8 8" className="w-3 h-3" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="0.5" />
        </svg>
      );
    case '2x1':
      return (
        <svg viewBox="0 0 8 8" className="w-3 h-3" fill="currentColor">
          <rect x="1" y="1" width="2.5" height="6" rx="0.5" />
          <rect x="4.5" y="1" width="2.5" height="6" rx="0.5" />
        </svg>
      );
    case '1x2':
      return (
        <svg viewBox="0 0 8 8" className="w-3 h-3" fill="currentColor">
          <rect x="1" y="1" width="6" height="2.5" rx="0.5" />
          <rect x="1" y="4.5" width="6" height="2.5" rx="0.5" />
        </svg>
      );
    case '2x2':
      return (
        <svg viewBox="0 0 8 8" className="w-3 h-3" fill="currentColor">
          <rect x="1" y="1" width="2.5" height="2.5" rx="0.5" />
          <rect x="4.5" y="1" width="2.5" height="2.5" rx="0.5" />
          <rect x="1" y="4.5" width="2.5" height="2.5" rx="0.5" />
          <rect x="4.5" y="4.5" width="2.5" height="2.5" rx="0.5" />
        </svg>
      );
  }
}
