'use client';

interface EmptyPanelProps {
  message?: string;
}

export function EmptyPanel({ message }: EmptyPanelProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4">
      <div className="text-terminal-accent text-2xl font-bold mb-2">OpenTerm</div>
      <p className="text-terminal-muted text-sm mb-4">
        {message || 'Enter a command to get started'}
      </p>
      <div className="text-xs text-terminal-muted space-y-1">
        <p>Try: <span className="text-terminal-text">AAPL</span> or <span className="text-terminal-text">AAPL GP</span></p>
        <p>Or: <span className="text-terminal-text">NEWS</span>, <span className="text-terminal-text">YCRV</span>, <span className="text-terminal-text">HELP</span></p>
      </div>
    </div>
  );
}
