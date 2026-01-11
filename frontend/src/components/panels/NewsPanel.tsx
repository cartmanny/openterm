'use client';

import { useEffect, useState } from 'react';
import { api, NewsArticle, ResponseMeta } from '@/lib/api';
import { FreshnessBadge } from '@/components/FreshnessBadge';

interface Props {
  ticker?: string; // If provided, show company news; otherwise market news
  category?: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function NewsPanel({ ticker, category = 'general' }: Props) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [meta, setMeta] = useState<ResponseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(category);

  const categories = ['general', 'forex', 'crypto', 'merger'];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        if (ticker) {
          const result = await api.getCompanyNews(ticker);
          setArticles(result.articles);
          setMeta(result.meta);
        } else {
          const result = await api.getMarketNews(selectedCategory);
          setArticles(result.articles);
          setMeta(result.meta);
        }
      } catch (err) {
        setError(ticker ? `Failed to load news for ${ticker}` : 'Failed to load market news');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [ticker, selectedCategory]);

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">{ticker ? `${ticker} News` : 'Market News'}</span>
        </div>
        <div className="panel-content">
          <div className="loading">Loading news...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">{ticker ? `${ticker} News` : 'Market News'}</span>
        </div>
        <div className="panel-content text-terminal-red">{error}</div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">{ticker ? `${ticker} News` : 'Market News'}</span>
          <FreshnessBadge meta={meta} compact />
        </div>
        {!ticker && (
          <div className="flex gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 text-xs rounded capitalize ${
                  selectedCategory === cat
                    ? 'bg-terminal-accent text-terminal-bg'
                    : 'bg-terminal-border text-terminal-muted hover:bg-terminal-border/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="panel-content flex-1 overflow-auto">
        {articles.length === 0 ? (
          <div className="text-terminal-muted">No news articles found</div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 hover:bg-terminal-border/30 rounded border border-terminal-border/50"
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-terminal-text font-medium text-sm leading-tight">
                    {article.headline}
                  </h3>
                  <span className="text-terminal-muted text-xs whitespace-nowrap">
                    {timeAgo(article.published_at)}
                  </span>
                </div>
                {article.summary && (
                  <p className="text-terminal-muted text-xs mt-1 line-clamp-2">
                    {article.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-terminal-accent text-xs">{article.source}</span>
                  {article.related_symbols.length > 0 && (
                    <span className="text-terminal-muted text-xs">
                      {article.related_symbols.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
