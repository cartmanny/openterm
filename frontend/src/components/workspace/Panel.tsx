'use client';

import { usePanel } from '@/context/PanelContext';
import { PanelHeader } from './PanelHeader';
import { PanelCommandBar } from './PanelCommandBar';
import { PanelContent } from './PanelContent';

export function Panel() {
  const { isFocused, focus } = usePanel();

  return (
    <div
      className={`
        flex flex-col h-full
        bg-terminal-panel border border-terminal-border rounded
        ${isFocused ? 'ring-1 ring-terminal-accent' : ''}
        transition-shadow duration-150
      `}
      onClick={focus}
    >
      <PanelHeader />
      <PanelCommandBar />
      <PanelContent />
    </div>
  );
}
