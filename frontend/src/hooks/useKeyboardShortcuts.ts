'use client';

import { useEffect, useCallback } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { LayoutType, PanelId } from '@/types/workspace';

interface ShortcutConfig {
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  description: string;
}

function matchesModifiers(
  e: KeyboardEvent,
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[]
): boolean {
  const ctrl = modifiers.includes('ctrl');
  const alt = modifiers.includes('alt');
  const shift = modifiers.includes('shift');
  const meta = modifiers.includes('meta');

  return (
    e.ctrlKey === ctrl &&
    e.altKey === alt &&
    e.shiftKey === shift &&
    e.metaKey === meta
  );
}

export function useKeyboardShortcuts() {
  const {
    setLayout,
    focusPanel,
    focusDirection,
    maximizePanel,
    restorePanel,
    workspace,
  } = useWorkspace();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only allow Escape to work in inputs
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur?.();
        }
        return;
      }

      // Layout switching: Alt+1-4
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setLayout('1x1');
            return;
          case '2':
            e.preventDefault();
            setLayout('2x1');
            return;
          case '3':
            e.preventDefault();
            setLayout('1x2');
            return;
          case '4':
            e.preventDefault();
            setLayout('2x2');
            return;
        }

        // Panel navigation: Alt+Arrow
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            focusDirection('left');
            return;
          case 'ArrowRight':
            e.preventDefault();
            focusDirection('right');
            return;
          case 'ArrowUp':
            e.preventDefault();
            focusDirection('up');
            return;
          case 'ArrowDown':
            e.preventDefault();
            focusDirection('down');
            return;
        }

        // Maximize: Alt+Enter
        if (e.key === 'Enter') {
          e.preventDefault();
          maximizePanel(workspace.focusedPanelId);
          return;
        }
      }

      // F1-F4: Focus panels directly
      if (!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        switch (e.key) {
          case 'F1':
            e.preventDefault();
            focusPanel('panel-1');
            return;
          case 'F2':
            e.preventDefault();
            focusPanel('panel-2');
            return;
          case 'F3':
            e.preventDefault();
            focusPanel('panel-3');
            return;
          case 'F4':
            e.preventDefault();
            focusPanel('panel-4');
            return;
        }
      }

      // Escape: Restore from maximize
      if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        restorePanel();
        return;
      }
    },
    [setLayout, focusPanel, focusDirection, maximizePanel, restorePanel, workspace.focusedPanelId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get a list of all keyboard shortcuts for display in help
 */
export function getKeyboardShortcuts(): { key: string; description: string }[] {
  return [
    { key: 'F1-F4', description: 'Focus panel 1-4' },
    { key: 'Alt+1', description: 'Single panel layout' },
    { key: 'Alt+2', description: 'Side by side layout' },
    { key: 'Alt+3', description: 'Stacked layout' },
    { key: 'Alt+4', description: 'Quad panel layout' },
    { key: 'Alt+Arrow', description: 'Navigate between panels' },
    { key: 'Alt+Enter', description: 'Maximize focused panel' },
    { key: 'Escape', description: 'Restore from maximize' },
    { key: '/', description: 'Focus command bar' },
  ];
}
