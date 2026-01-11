'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FunctionDefinition,
  FunctionCategory,
  searchFunctions,
  getFunctionsByCategory,
  getRelatedFunctions,
  CATEGORY_ORDER
} from '@/lib/functionCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string) => void;
  initialQuery?: string;
}

export function HelpSearch({ isOpen, onClose, onExecuteCommand, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedFunction, setSelectedFunction] = useState<FunctionDefinition | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get search results
  const results = query.trim() ? searchFunctions(query) : [];
  const byCategory = query.trim() ? null : getFunctionsByCategory();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedFunction(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, initialQuery]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = query.trim() ? results : CATEGORY_ORDER.flatMap(cat => byCategory?.[cat] || []);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          setSelectedFunction(items[selectedIndex]);
        }
        break;
      case 'Escape':
        if (selectedFunction) {
          setSelectedFunction(null);
        } else {
          onClose();
        }
        break;
      case 'Backspace':
        if (query === '' && selectedFunction) {
          setSelectedFunction(null);
        }
        break;
    }
  }, [query, results, byCategory, selectedIndex, selectedFunction, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleExecute = (fn: FunctionDefinition, example?: string) => {
    const command = example || fn.mnemonic;
    onExecuteCommand(command);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/70">
      <div
        className="bg-terminal-panel border border-terminal-border rounded-lg w-[700px] max-h-[70vh] overflow-hidden flex flex-col shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-terminal-border bg-terminal-bg">
          <span className="text-terminal-accent font-bold">HL</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
              setSelectedFunction(null);
            }}
            placeholder="Search functions... (e.g., chart, portfolio, news)"
            className="flex-1 bg-transparent text-terminal-text outline-none placeholder:text-terminal-muted"
          />
          <span className="text-terminal-muted text-xs">
            Esc to close
          </span>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Results list */}
          <div
            ref={listRef}
            className="w-1/2 overflow-y-auto border-r border-terminal-border"
          >
            {query.trim() ? (
              // Search results
              results.length > 0 ? (
                <div className="p-2">
                  {results.map((fn, i) => (
                    <FunctionItem
                      key={fn.mnemonic}
                      fn={fn}
                      selected={i === selectedIndex}
                      onClick={() => setSelectedFunction(fn)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 text-terminal-muted text-center">
                  No functions found for "{query}"
                </div>
              )
            ) : (
              // Browse by category
              <div>
                {CATEGORY_ORDER.map((category) => {
                  const fns = byCategory?.[category] || [];
                  if (fns.length === 0) return null;

                  return (
                    <div key={category} className="border-b border-terminal-border last:border-b-0">
                      <div className="px-3 py-2 text-xs text-terminal-accent font-semibold uppercase tracking-wide bg-terminal-bg/50">
                        {category}
                      </div>
                      <div className="p-1">
                        {fns.map((fn) => (
                          <FunctionItem
                            key={fn.mnemonic}
                            fn={fn}
                            selected={selectedFunction?.mnemonic === fn.mnemonic}
                            onClick={() => setSelectedFunction(fn)}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {selectedFunction ? (
              <FunctionDetail
                fn={selectedFunction}
                onExecute={handleExecute}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-terminal-muted">
                <div className="text-2xl mb-2">HL</div>
                <div className="text-sm">Select a function to see details</div>
                <div className="text-xs mt-4">
                  Type to search or browse categories
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FunctionItemProps {
  fn: FunctionDefinition;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}

function FunctionItem({ fn, selected, onClick, compact }: FunctionItemProps) {
  return (
    <button
      data-selected={selected}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 ${
        selected
          ? 'bg-terminal-accent/20 text-terminal-accent'
          : 'hover:bg-terminal-border/50 text-terminal-text'
      }`}
    >
      <span className="font-mono font-bold text-terminal-accent w-16 flex-shrink-0">
        {fn.mnemonic}
      </span>
      <div className="flex-1 min-w-0">
        {compact ? (
          <div className="truncate text-sm">{fn.name}</div>
        ) : (
          <>
            <div className="font-medium truncate">{fn.name}</div>
            <div className="text-xs text-terminal-muted truncate">
              {fn.description}
            </div>
          </>
        )}
      </div>
      {fn.requiresTicker && (
        <span className="text-xs text-terminal-muted px-1.5 py-0.5 bg-terminal-border/50 rounded">
          ticker
        </span>
      )}
    </button>
  );
}

interface FunctionDetailProps {
  fn: FunctionDefinition;
  onExecute: (fn: FunctionDefinition, example?: string) => void;
}

function FunctionDetail({ fn, onExecute }: FunctionDetailProps) {
  const relatedFunctions = getRelatedFunctions(fn.mnemonic);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold text-terminal-accent">
            {fn.mnemonic}
          </span>
          {fn.aliases.length > 0 && (
            <span className="text-xs text-terminal-muted">
              ({fn.aliases.join(', ')})
            </span>
          )}
        </div>
        <div className="text-lg text-terminal-text mt-1">{fn.name}</div>
        <div className="text-sm text-terminal-muted mt-1">{fn.description}</div>
      </div>

      {/* Category badge */}
      <div>
        <span className="text-xs px-2 py-1 bg-terminal-border/50 rounded text-terminal-muted">
          {fn.category}
        </span>
      </div>

      {/* Parameters */}
      {fn.parameters && fn.parameters.length > 0 && (
        <div>
          <div className="text-xs text-terminal-muted uppercase mb-2">Parameters</div>
          <div className="space-y-1">
            {fn.parameters.map((param) => (
              <div key={param.name} className="flex items-start gap-2 text-sm">
                <span className="font-mono text-terminal-accent">{param.name}</span>
                <span className="text-terminal-muted">:</span>
                <span className="text-terminal-text">{param.type}</span>
                {!param.required && (
                  <span className="text-terminal-muted text-xs">(optional)</span>
                )}
                {param.default && (
                  <span className="text-terminal-muted text-xs">
                    default: {param.default}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      <div>
        <div className="text-xs text-terminal-muted uppercase mb-2">Examples</div>
        <div className="space-y-1">
          {fn.examples.map((example, i) => (
            <button
              key={i}
              onClick={() => onExecute(fn, example)}
              className="block w-full text-left px-3 py-1.5 rounded font-mono text-sm bg-terminal-bg hover:bg-terminal-border/50 text-terminal-green transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Related Functions */}
      {relatedFunctions.length > 0 && (
        <div>
          <div className="text-xs text-terminal-muted uppercase mb-2">Related Functions</div>
          <div className="flex flex-wrap gap-2">
            {relatedFunctions.map((related) => (
              <button
                key={related.mnemonic}
                onClick={() => onExecute(related)}
                className="px-2 py-1 rounded text-sm bg-terminal-border/50 hover:bg-terminal-border text-terminal-text transition-colors"
              >
                <span className="font-mono text-terminal-accent">{related.mnemonic}</span>
                <span className="text-terminal-muted ml-1">- {related.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Execute button */}
      <button
        onClick={() => onExecute(fn)}
        className="w-full py-2 bg-terminal-accent text-terminal-bg rounded font-medium hover:bg-terminal-accent/90 transition-colors"
      >
        Execute {fn.mnemonic}
      </button>
    </div>
  );
}
