'use client';

interface Props {
  source: string | null;
  freshness?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  stooq: 'Stooq',
  yahoo_finance: 'Yahoo',
  sec_edgar: 'SEC',
  fred: 'FRED',
  database: 'Cached',
};

export function SourceBadge({ source, freshness }: Props) {
  if (!source) return null;

  const label = SOURCE_LABELS[source] || source;
  const isStale = freshness === 'stale';

  return (
    <span
      className={`badge ${isStale ? 'badge-stale' : 'badge-source'}`}
      title={`Data source: ${source}${freshness ? ` (${freshness})` : ''}`}
    >
      {label}
      {freshness === 'eod' && <span className="ml-1 text-[10px]">EOD</span>}
    </span>
  );
}
