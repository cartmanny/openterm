/**
 * Multi-Panel Workspace Type Definitions
 * Bloomberg-style 4-panel workspace with independent panel contexts
 */

/** Panel type identifiers - maps to actual panel components */
export type PanelType =
  | 'chart'
  | 'overview'
  | 'fundamentals'
  | 'filings'
  | 'news'
  | 'market_news'
  | 'macro'
  | 'yield_curve'
  | 'screener'
  | 'portfolio'
  | 'correlation'
  | 'compare'
  | 'economic_calendar'
  | 'earnings_calendar'
  | 'alerts'
  | 'launchpad'
  | 'watchlist'
  | 'help'
  | 'status'
  | 'heatmap'
  | 'orderbook'
  | 'options'
  | 'sentiment'
  | 'insider'
  | 'empty';

/** Unique panel identifier */
export type PanelId = 'panel-1' | 'panel-2' | 'panel-3' | 'panel-4';

/** Panel position in grid */
export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Layout configurations for the workspace */
export type LayoutType = '1x1' | '2x1' | '1x2' | '2x2';

/** Mapping of layout types to visible panel positions */
export const LAYOUT_POSITIONS: Record<LayoutType, PanelPosition[]> = {
  '1x1': ['top-left'],
  '2x1': ['top-left', 'top-right'],
  '1x2': ['top-left', 'bottom-left'],
  '2x2': ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
};

/** Mapping of positions to panel IDs */
export const POSITION_TO_PANEL: Record<PanelPosition, PanelId> = {
  'top-left': 'panel-1',
  'top-right': 'panel-2',
  'bottom-left': 'panel-3',
  'bottom-right': 'panel-4',
};

/** Mapping of panel IDs to positions */
export const PANEL_TO_POSITION: Record<PanelId, PanelPosition> = {
  'panel-1': 'top-left',
  'panel-2': 'top-right',
  'panel-3': 'bottom-left',
  'panel-4': 'bottom-right',
};

/** Human-readable panel type names */
export const PANEL_TITLES: Record<PanelType, string> = {
  chart: 'Price Chart',
  overview: 'Overview',
  fundamentals: 'Fundamentals',
  filings: 'SEC Filings',
  news: 'Company News',
  market_news: 'Market News',
  macro: 'Economic Data',
  yield_curve: 'Yield Curve',
  screener: 'Screener',
  portfolio: 'Portfolio',
  correlation: 'Correlation',
  compare: 'Compare',
  economic_calendar: 'Economic Calendar',
  earnings_calendar: 'Earnings Calendar',
  alerts: 'Alerts',
  launchpad: 'Launchpad',
  watchlist: 'Watchlist',
  help: 'Help',
  status: 'Data Status',
  heatmap: 'Market Heatmap',
  orderbook: 'Order Book',
  options: 'Options Chain',
  sentiment: 'Social Sentiment',
  insider: 'Insider Trading',
  empty: 'Empty',
};

/** Panel-specific parameters */
export interface PanelParams {
  // Chart params
  chartPeriod?: string;

  // News params
  newsCategory?: string;

  // Macro params
  macroSeriesId?: string;

  // Screener params
  screenerTemplate?: string;

  // Portfolio params
  portfolioId?: string;

  // Correlation params
  correlationTickers?: string[];
  correlationPeriod?: string;

  // Filings params
  filingsFormType?: string;

  // Compare params
  compareTickers?: string[];
  compareBenchmark?: string;
  comparePeriod?: string;

  // Economic Calendar params
  ecoFilter?: 'today' | 'week' | 'month' | 'us' | 'eu';

  // Earnings Calendar params
  earnFilter?: 'today' | 'week' | 'watchlist';

  // Order Book params (crypto)
  cryptoSymbol?: string;

  // Options params
  optionsExpiration?: string;
}

/** Per-panel state - everything needed to render a panel independently */
export interface PanelState {
  id: PanelId;
  position: PanelPosition;

  // Panel content type
  panelType: PanelType;

  // Instrument context (independent per panel)
  currentTicker: string | null;
  currentInstrumentId: string | null;

  // Panel-specific parameters
  params: PanelParams;

  // Command history (per-panel)
  commandHistory: string[];
  historyIndex: number;

  // UI state
  isMaximized: boolean;
}

/** Complete workspace state */
export interface WorkspaceState {
  // Layout
  layout: LayoutType;

  // All panels (keyed by PanelId)
  panels: Record<PanelId, PanelState>;

  // Focus management
  focusedPanelId: PanelId;

  // Workspace metadata
  workspaceName: string;
  lastModified: number;
}

/** Saved workspace template */
export interface WorkspaceTemplate {
  id: string;
  name: string;
  description?: string;
  layout: LayoutType;
  panels: Partial<Record<PanelId, Omit<PanelState, 'commandHistory' | 'historyIndex'>>>;
  createdAt: number;
  updatedAt: number;
}

/** Create a default panel state */
export function createDefaultPanel(id: PanelId, position: PanelPosition): PanelState {
  const defaults: Record<PanelPosition, PanelType> = {
    'top-left': 'empty',
    'top-right': 'chart',
    'bottom-left': 'watchlist',
    'bottom-right': 'news',
  };

  return {
    id,
    position,
    panelType: defaults[position],
    currentTicker: null,
    currentInstrumentId: null,
    params: {},
    commandHistory: [],
    historyIndex: -1,
    isMaximized: false,
  };
}

/** Create a default workspace state */
export function createDefaultWorkspace(): WorkspaceState {
  return {
    layout: '2x2',
    panels: {
      'panel-1': createDefaultPanel('panel-1', 'top-left'),
      'panel-2': createDefaultPanel('panel-2', 'top-right'),
      'panel-3': createDefaultPanel('panel-3', 'bottom-left'),
      'panel-4': createDefaultPanel('panel-4', 'bottom-right'),
    },
    focusedPanelId: 'panel-1',
    workspaceName: 'Default',
    lastModified: Date.now(),
  };
}

/** Check if a position is visible in a given layout */
export function isPositionVisible(layout: LayoutType, position: PanelPosition): boolean {
  return LAYOUT_POSITIONS[layout].includes(position);
}

/** Get adjacent panel position for navigation */
export function getAdjacentPosition(
  current: PanelPosition,
  direction: 'left' | 'right' | 'up' | 'down',
  layout: LayoutType
): PanelPosition | null {
  const grid: PanelPosition[][] = [
    ['top-left', 'top-right'],
    ['bottom-left', 'bottom-right'],
  ];

  const coords: Record<PanelPosition, [number, number]> = {
    'top-left': [0, 0],
    'top-right': [0, 1],
    'bottom-left': [1, 0],
    'bottom-right': [1, 1],
  };

  const [row, col] = coords[current];

  const moves: Record<string, [number, number]> = {
    left: [row, col - 1],
    right: [row, col + 1],
    up: [row - 1, col],
    down: [row + 1, col],
  };

  const [newRow, newCol] = moves[direction];

  if (newRow < 0 || newRow > 1 || newCol < 0 || newCol > 1) {
    return null;
  }

  const targetPosition = grid[newRow][newCol];

  if (!isPositionVisible(layout, targetPosition)) {
    return null;
  }

  return targetPosition;
}
