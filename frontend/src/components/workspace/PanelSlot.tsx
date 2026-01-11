'use client';

import { PanelPosition, PanelId, POSITION_TO_PANEL, isPositionVisible } from '@/types/workspace';
import { useWorkspace } from '@/context/WorkspaceContext';
import { PanelProvider } from '@/context/PanelContext';
import { Panel } from './Panel';

interface PanelSlotProps {
  position: PanelPosition;
}

const POSITION_CLASSES: Record<PanelPosition, string> = {
  'top-left': 'col-start-1 row-start-1',
  'top-right': 'col-start-2 row-start-1',
  'bottom-left': 'col-start-1 row-start-2',
  'bottom-right': 'col-start-2 row-start-2',
};

export function PanelSlot({ position }: PanelSlotProps) {
  const { workspace } = useWorkspace();
  const panelId = POSITION_TO_PANEL[position];

  // Don't render if position is not visible in current layout
  if (!isPositionVisible(workspace.layout, position)) {
    return null;
  }

  return (
    <div className={`${POSITION_CLASSES[position]} min-h-0 overflow-hidden`}>
      <PanelProvider panelId={panelId}>
        <Panel />
      </PanelProvider>
    </div>
  );
}
