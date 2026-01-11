'use client';

import { ReactNode } from 'react';
import { LayoutType } from '@/types/workspace';

interface WorkspaceGridProps {
  layout: LayoutType;
  children: ReactNode;
}

const LAYOUT_CLASSES: Record<LayoutType, string> = {
  '1x1': 'grid-cols-1 grid-rows-1',
  '2x1': 'grid-cols-2 grid-rows-1',
  '1x2': 'grid-cols-1 grid-rows-2',
  '2x2': 'grid-cols-2 grid-rows-2',
};

export function WorkspaceGrid({ layout, children }: WorkspaceGridProps) {
  return (
    <div className={`grid ${LAYOUT_CLASSES[layout]} gap-1 h-full p-1 bg-terminal-bg`}>
      {children}
    </div>
  );
}
