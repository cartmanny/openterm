'use client';

import { useEffect, useState } from 'react';
import { api, Filing, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

interface Props {
  ticker: string;
  formType?: string;
  compact?: boolean;
}

// Static meta for SEC EDGAR - always the source for filings
const SEC_META: ResponseMeta = {
  source: 'sec_edgar',
  asof: null,
  freshness: 'realtime',
  cached: false,
};

export function FilingsPanel({ ticker, formType, compact = false }: Props) {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | undefined>(formType);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const data = await api.getFilings(ticker, selectedType, compact ? 5 : 20);
        setFilings(data);
      } catch (err) {
        setError('Failed to load filings');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [ticker, selectedType, compact]);

  const formTypes = ['All', '10-K', '10-Q', '8-K'];

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">SEC Filings</span>
        </div>
        <div className="panel-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">SEC Filings</span>
        </div>
        <div className="panel-content text-terminal-red">{error}</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent Filings</span>
          <FreshnessBadge meta={SEC_META} compact />
        </div>
        <div className="panel-content">
          {filings.length === 0 ? (
            <div className="text-terminal-muted">No filings found</div>
          ) : (
            <div className="space-y-1">
              {filings.map((filing) => (
                <a
                  key={filing.id}
                  href={filing.primary_doc_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:bg-terminal-border/30 px-1 py-0.5 rounded text-sm"
                >
                  <span className="text-terminal-accent">{filing.form_type}</span>
                  <span className="text-terminal-muted ml-2">{filing.filing_date}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">{ticker} - SEC Filings</span>
          <FreshnessBadge meta={SEC_META} compact />
        </div>
        <div className="flex gap-1">
          {formTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type === 'All' ? undefined : type)}
              className={`px-2 py-0.5 text-xs rounded ${
                (type === 'All' && !selectedType) || type === selectedType
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-content flex-1 overflow-auto">
        {filings.length === 0 ? (
          <div className="text-terminal-muted">No filings found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Form</th>
                <th>Filed</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filings.map((filing) => (
                <tr key={filing.id}>
                  <td>
                    <a
                      href={filing.primary_doc_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terminal-accent hover:underline"
                    >
                      {filing.form_type}
                    </a>
                  </td>
                  <td className="text-terminal-muted">{filing.filing_date}</td>
                  <td className="text-terminal-muted truncate max-w-[200px]">
                    {filing.title || filing.form_type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
