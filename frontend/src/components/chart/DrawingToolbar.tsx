'use client';

import { useState } from 'react';
import { DrawingMode, DRAWING_COLORS, Drawing } from '@/types/drawings';

interface Props {
  drawingMode: DrawingMode;
  onModeChange: (mode: DrawingMode) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  drawings: Drawing[];
  onClearDrawings: () => void;
  onDeleteDrawing: (id: string) => void;
}

const TOOLS: { mode: DrawingMode; icon: string; label: string }[] = [
  { mode: 'horizontal_line', icon: '—', label: 'Horizontal Line' },
  { mode: 'trendline', icon: '⁄', label: 'Trendline' },
  { mode: 'text', icon: 'T', label: 'Text Annotation' },
  { mode: 'delete', icon: '×', label: 'Delete Drawing' },
];

export function DrawingToolbar({
  drawingMode,
  onModeChange,
  selectedColor,
  onColorChange,
  drawings,
  onClearDrawings,
  onDeleteDrawing,
}: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDrawingsList, setShowDrawingsList] = useState(false);

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-terminal-border bg-terminal-bg/50">
      {/* Drawing tools */}
      {TOOLS.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => onModeChange(drawingMode === tool.mode ? 'none' : tool.mode)}
          className={`
            w-7 h-7 flex items-center justify-center text-sm rounded
            ${drawingMode === tool.mode
              ? 'bg-terminal-accent text-terminal-bg'
              : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
            }
          `}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      <span className="w-px h-5 bg-terminal-border mx-1" />

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-7 h-7 flex items-center justify-center rounded border border-terminal-border"
          title="Drawing Color"
        >
          <span
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: selectedColor }}
          />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-terminal-panel border border-terminal-border rounded-lg p-2 shadow-lg">
            <div className="grid grid-cols-4 gap-1">
              {DRAWING_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                  className={`w-6 h-6 rounded ${
                    selectedColor === color ? 'ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <span className="w-px h-5 bg-terminal-border mx-1" />

      {/* Drawings list */}
      <div className="relative">
        <button
          onClick={() => setShowDrawingsList(!showDrawingsList)}
          className={`
            px-2 py-1 text-xs rounded flex items-center gap-1
            ${drawings.length > 0
              ? 'bg-terminal-border text-terminal-text'
              : 'bg-terminal-border/50 text-terminal-muted'
            }
          `}
          title="View Drawings"
        >
          <span>{drawings.length} drawings</span>
        </button>
        {showDrawingsList && drawings.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-terminal-panel border border-terminal-border rounded-lg shadow-lg min-w-[200px]">
            <div className="max-h-48 overflow-auto">
              {drawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-terminal-border/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: drawing.color }}
                    />
                    <span className="text-terminal-text capitalize">
                      {drawing.type.replace('_', ' ')}
                    </span>
                    {drawing.type === 'horizontal_line' && (
                      <span className="text-terminal-muted">
                        @ ${(drawing as any).price?.toFixed(2)}
                      </span>
                    )}
                    {drawing.type === 'text' && (
                      <span className="text-terminal-muted truncate max-w-[100px]">
                        "{(drawing as any).text}"
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteDrawing(drawing.id)}
                    className="text-terminal-muted hover:text-red-400 p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-terminal-border px-3 py-2">
              <button
                onClick={() => {
                  onClearDrawings();
                  setShowDrawingsList(false);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear All Drawings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mode indicator */}
      {drawingMode !== 'none' && (
        <>
          <span className="w-px h-5 bg-terminal-border mx-1" />
          <span className="text-xs text-terminal-accent">
            {drawingMode === 'delete' ? 'Click drawing to delete' : `Drawing: ${drawingMode.replace('_', ' ')}`}
          </span>
          <button
            onClick={() => onModeChange('none')}
            className="text-xs text-terminal-muted hover:text-terminal-text ml-1"
          >
            (Esc to cancel)
          </button>
        </>
      )}
    </div>
  );
}
