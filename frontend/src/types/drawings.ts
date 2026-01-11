/**
 * Chart Drawing Types
 * Support for trendlines, price levels, and annotations
 */

export type DrawingType = 'horizontal_line' | 'trendline' | 'rectangle' | 'text';

export interface DrawingBase {
  id: string;
  type: DrawingType;
  ticker: string;
  createdAt: number;
  color: string;
  visible: boolean;
}

export interface HorizontalLine extends DrawingBase {
  type: 'horizontal_line';
  price: number;
  label?: string;
}

export interface TrendLine extends DrawingBase {
  type: 'trendline';
  startTime: number; // timestamp
  startPrice: number;
  endTime: number;
  endPrice: number;
  extended?: boolean; // extend line beyond points
}

export interface RectangleDrawing extends DrawingBase {
  type: 'rectangle';
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
}

export interface TextAnnotation extends DrawingBase {
  type: 'text';
  time: number;
  price: number;
  text: string;
  fontSize?: number;
}

export type Drawing = HorizontalLine | TrendLine | RectangleDrawing | TextAnnotation;

export type DrawingMode = 'none' | 'horizontal_line' | 'trendline' | 'rectangle' | 'text' | 'delete';

// Storage key for drawings
export const DRAWINGS_STORAGE_KEY = 'openterm_chart_drawings';

// Default drawing colors
export const DRAWING_COLORS = [
  '#ff6600', // orange (default)
  '#00cc66', // green
  '#ff4444', // red
  '#4488ff', // blue
  '#ffcc00', // yellow
  '#cc44ff', // purple
  '#ffffff', // white
];

// Generate drawing ID
export function generateDrawingId(): string {
  return `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Load drawings from storage
export function loadDrawings(ticker: string): Drawing[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(DRAWINGS_STORAGE_KEY);
    if (stored) {
      const allDrawings: Drawing[] = JSON.parse(stored);
      return allDrawings.filter(d => d.ticker === ticker);
    }
  } catch (error) {
    console.error('Failed to load drawings:', error);
  }

  return [];
}

// Save drawing to storage
export function saveDrawing(drawing: Drawing): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(DRAWINGS_STORAGE_KEY);
    const allDrawings: Drawing[] = stored ? JSON.parse(stored) : [];
    allDrawings.push(drawing);
    localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(allDrawings));
  } catch (error) {
    console.error('Failed to save drawing:', error);
  }
}

// Delete drawing from storage
export function deleteDrawing(drawingId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(DRAWINGS_STORAGE_KEY);
    if (stored) {
      const allDrawings: Drawing[] = JSON.parse(stored);
      const filtered = allDrawings.filter(d => d.id !== drawingId);
      localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Failed to delete drawing:', error);
  }
}

// Clear all drawings for a ticker
export function clearDrawings(ticker: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(DRAWINGS_STORAGE_KEY);
    if (stored) {
      const allDrawings: Drawing[] = JSON.parse(stored);
      const filtered = allDrawings.filter(d => d.ticker !== ticker);
      localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Failed to clear drawings:', error);
  }
}
