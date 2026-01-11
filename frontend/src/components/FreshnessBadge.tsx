'use client';

import { ResponseMeta } from '@/lib/api';

interface Props {
  meta: ResponseMeta | null;
  compact?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  stooq: 'Stooq',
  yahoo_finance: 'Yahoo',
  sec_edgar: 'SEC',
  fred: 'FRED',
  database: 'Cached',
};

const FRESHNESS_LABELS: Record<string, string> = {
  eod: 'End of Day',
  quarterly: 'Quarterly',
  realtime: 'Real-time',
  stale: 'Stale',
};

function formatAsOf(asof: string | null): string {
  if (!asof) return '';

  const date = new Date(asof);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins <= 1 ? 'Just now' : `${mins}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStalenessColor(freshness: string | null, asof: string | null): string {
  if (freshness === 'stale') return 'text-yellow-500 bg-yellow-500/10';

  if (!asof) return 'text-terminal-muted bg-terminal-muted/10';

  const date = new Date(asof);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = diff / 86400000;

  if (days > 7) return 'text-yellow-500 bg-yellow-500/10';
  if (days > 1) return 'text-terminal-muted bg-terminal-muted/10';
  return 'text-green-500 bg-green-500/10';
}

export function FreshnessBadge({ meta, compact = false }: Props) {
  if (!meta) return null;

  const sourceLabel = meta.source ? (SOURCE_LABELS[meta.source] || meta.source) : 'Unknown';
  const freshnessLabel = meta.freshness ? FRESHNESS_LABELS[meta.freshness] : '';
  const asofLabel = formatAsOf(meta.asof);
  const stalenessColor = getStalenessColor(meta.freshness, meta.asof);

  if (compact) {
    return (
      <span
        className={`text-xs px-1.5 py-0.5 rounded ${stalenessColor}`}
        title={`Source: ${sourceLabel}${freshnessLabel ? ` | ${freshnessLabel}` : ''}${asofLabel ? ` | Updated: ${asofLabel}` : ''}`}
      >
        {sourceLabel}
        {meta.cached && <span className="ml-1">*</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`px-1.5 py-0.5 rounded ${stalenessColor}`}>
        {sourceLabel}
      </span>
      {freshnessLabel && (
        <span className="text-terminal-muted">{freshnessLabel}</span>
      )}
      {asofLabel && (
        <span className="text-terminal-muted" title={meta.asof || ''}>
          {asofLabel}
        </span>
      )}
      {meta.cached && (
        <span className="text-terminal-muted" title="Served from cache">
          (cached)
        </span>
      )}
    </div>
  );
}
