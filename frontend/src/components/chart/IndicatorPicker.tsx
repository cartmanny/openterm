'use client';

import { useState } from 'react';
import {
  IndicatorType,
  IndicatorParams,
  IndicatorDefinition,
  getIndicatorsByCategory,
  getIndicatorDefinition,
  INDICATOR_COLORS
} from '@/types/indicators';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddIndicator: (type: IndicatorType, params: IndicatorParams, color: string) => void;
  existingCount: number;
}

export function IndicatorPicker({ isOpen, onClose, onAddIndicator, existingCount }: Props) {
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorDefinition | null>(null);
  const [params, setParams] = useState<IndicatorParams>({});
  const [color, setColor] = useState(INDICATOR_COLORS[existingCount % INDICATOR_COLORS.length]);

  const categories = getIndicatorsByCategory();

  const handleSelect = (ind: IndicatorDefinition) => {
    setSelectedIndicator(ind);
    setParams(ind.defaultParams);
    setColor(ind.defaultColor || INDICATOR_COLORS[existingCount % INDICATOR_COLORS.length]);
  };

  const handleAdd = () => {
    if (selectedIndicator) {
      onAddIndicator(selectedIndicator.type, params, color);
      setSelectedIndicator(null);
      setParams({});
      onClose();
    }
  };

  const updateParam = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-terminal-panel border border-terminal-border rounded-lg w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <h2 className="text-terminal-text font-semibold">Add Indicator</h2>
          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-terminal-text"
          >
            Esc
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Indicator list */}
          <div className="w-2/3 border-r border-terminal-border overflow-y-auto">
            {Object.entries(categories).map(([category, indicators]) => (
              <div key={category} className="p-2">
                <div className="text-xs text-terminal-muted uppercase tracking-wide px-2 py-1">
                  {category}
                </div>
                {indicators.map((ind) => (
                  <button
                    key={ind.type}
                    onClick={() => handleSelect(ind)}
                    className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 ${
                      selectedIndicator?.type === ind.type
                        ? 'bg-terminal-accent/20 text-terminal-accent'
                        : 'hover:bg-terminal-border/50 text-terminal-text'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ind.defaultColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{ind.shortName}</div>
                      <div className="text-xs text-terminal-muted truncate">
                        {ind.name}
                      </div>
                    </div>
                    <span className="text-xs text-terminal-muted">
                      {ind.placement === 'overlay' ? 'Overlay' : 'Subplot'}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Parameter panel */}
          <div className="w-1/3 p-4 flex flex-col">
            {selectedIndicator ? (
              <>
                <div className="mb-4">
                  <h3 className="font-medium text-terminal-text">
                    {selectedIndicator.name}
                  </h3>
                  <p className="text-xs text-terminal-muted mt-1">
                    {selectedIndicator.description}
                  </p>
                </div>

                {/* Parameters */}
                {selectedIndicator.paramDefinitions.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <div className="text-xs text-terminal-muted uppercase">Parameters</div>
                    {selectedIndicator.paramDefinitions.map((paramDef) => (
                      <div key={paramDef.key} className="flex items-center gap-2">
                        <label className="text-sm text-terminal-text flex-1">
                          {paramDef.name}
                        </label>
                        <input
                          type="number"
                          min={paramDef.min}
                          max={paramDef.max}
                          step={paramDef.step}
                          value={params[paramDef.key as keyof IndicatorParams] ?? paramDef.defaultValue}
                          onChange={(e) => updateParam(paramDef.key, Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-terminal-bg border border-terminal-border rounded text-terminal-text text-sm text-right"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Color picker */}
                <div className="mb-4">
                  <div className="text-xs text-terminal-muted uppercase mb-2">Color</div>
                  <div className="flex gap-2 flex-wrap">
                    {INDICATOR_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          color === c ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Add button */}
                <button
                  onClick={handleAdd}
                  className="mt-auto w-full py-2 bg-terminal-accent text-terminal-bg rounded font-medium hover:bg-terminal-accent/90"
                >
                  Add {selectedIndicator.shortName}
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-terminal-muted text-sm">
                Select an indicator to configure
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
