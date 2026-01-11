'use client';

import { useState, useEffect } from 'react';

interface SentimentData {
  ticker: string;
  overall_score: number; // -1 to 1
  overall_label: 'Bearish' | 'Neutral' | 'Bullish';
  reddit: {
    mentions: number;
    bullish: number;
    bearish: number;
    score: number;
    top_posts: {
      title: string;
      subreddit: string;
      score: number;
      comments: number;
      url: string;
    }[];
  };
  twitter: {
    mentions: number;
    bullish: number;
    bearish: number;
    score: number;
    top_tweets: {
      text: string;
      author: string;
      likes: number;
      retweets: number;
    }[];
  };
  stocktwits: {
    bullish: number;
    bearish: number;
    total: number;
  };
  trending_rank?: number;
  news_sentiment: number;
}

interface Props {
  ticker?: string;
}

// Mock sentiment data
const MOCK_SENTIMENT: Record<string, SentimentData> = {
  AAPL: {
    ticker: 'AAPL',
    overall_score: 0.45,
    overall_label: 'Bullish',
    reddit: {
      mentions: 1234,
      bullish: 856,
      bearish: 245,
      score: 0.55,
      top_posts: [
        { title: 'Apple Vision Pro sales exceeding expectations', subreddit: 'wallstreetbets', score: 15234, comments: 892, url: '#' },
        { title: 'AAPL Q1 earnings preview - what to expect', subreddit: 'stocks', score: 3421, comments: 234, url: '#' },
        { title: 'iPhone 16 leaks suggest major camera upgrade', subreddit: 'investing', score: 1245, comments: 156, url: '#' },
      ],
    },
    twitter: {
      mentions: 45678,
      bullish: 28934,
      bearish: 12456,
      score: 0.42,
      top_tweets: [
        { text: '$AAPL looking strong heading into earnings. Services revenue growth is underappreciated. 🚀', author: '@financetwit', likes: 2345, retweets: 567 },
        { text: 'Apple has been quietly building the best AI chip business. Vision Pro is just the beginning.', author: '@techanalyst', likes: 1823, retweets: 423 },
      ],
    },
    stocktwits: {
      bullish: 68,
      bearish: 32,
      total: 5678,
    },
    trending_rank: 3,
    news_sentiment: 0.35,
  },
  TSLA: {
    ticker: 'TSLA',
    overall_score: -0.15,
    overall_label: 'Neutral',
    reddit: {
      mentions: 8923,
      bullish: 3456,
      bearish: 4234,
      score: -0.1,
      top_posts: [
        { title: 'Tesla Cybertruck deliveries ramping up slower than expected', subreddit: 'wallstreetbets', score: 23456, comments: 1892, url: '#' },
        { title: 'Is TSLA still worth it at current levels?', subreddit: 'stocks', score: 4521, comments: 678, url: '#' },
      ],
    },
    twitter: {
      mentions: 89234,
      bullish: 34567,
      bearish: 45678,
      score: -0.15,
      top_tweets: [
        { text: '$TSLA margins under pressure but FSD progress is real. Mixed signals here.', author: '@evanalyst', likes: 4567, retweets: 1234 },
      ],
    },
    stocktwits: {
      bullish: 45,
      bearish: 55,
      total: 12345,
    },
    trending_rank: 1,
    news_sentiment: -0.2,
  },
  NVDA: {
    ticker: 'NVDA',
    overall_score: 0.72,
    overall_label: 'Bullish',
    reddit: {
      mentions: 5678,
      bullish: 4567,
      bearish: 678,
      score: 0.75,
      top_posts: [
        { title: 'NVDA is the backbone of AI revolution - still undervalued?', subreddit: 'wallstreetbets', score: 34567, comments: 2345, url: '#' },
        { title: 'Jensen Huang reveals next-gen Blackwell architecture', subreddit: 'stocks', score: 12345, comments: 567, url: '#' },
      ],
    },
    twitter: {
      mentions: 67890,
      bullish: 54321,
      bearish: 8765,
      score: 0.72,
      top_tweets: [
        { text: '$NVDA dominating AI chips. Data center revenue growth is insane. 🔥', author: '@techbull', likes: 8765, retweets: 2345 },
      ],
    },
    stocktwits: {
      bullish: 82,
      bearish: 18,
      total: 8765,
    },
    trending_rank: 2,
    news_sentiment: 0.68,
  },
};

export function SentimentPanel({ ticker = 'AAPL' }: Props) {
  const [selectedTicker, setSelectedTicker] = useState(ticker);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [view, setView] = useState<'overview' | 'reddit' | 'twitter'>('overview');

  useEffect(() => {
    // Use mock data or fetch from API
    const data = MOCK_SENTIMENT[selectedTicker.toUpperCase()] || MOCK_SENTIMENT['AAPL'];
    setSentiment({ ...data, ticker: selectedTicker.toUpperCase() });
  }, [selectedTicker]);

  if (!sentiment) return null;

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return 'text-green-500';
    if (score < -0.2) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getSentimentBg = (score: number) => {
    if (score > 0.2) return 'bg-green-500';
    if (score < -0.2) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const formatScore = (score: number) => {
    const percentage = Math.abs(score * 100).toFixed(0);
    return score >= 0 ? `+${percentage}%` : `-${percentage}%`;
  };

  return (
    <div className="flex flex-col h-full bg-terminal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-4">
          <span className="text-terminal-accent font-bold">SENTIMENT</span>
          <input
            type="text"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
            className="bg-terminal-panel border border-terminal-border rounded px-2 py-1 text-sm text-terminal-text w-20 uppercase"
            placeholder="Ticker"
          />
        </div>
        <div className="flex items-center gap-2">
          {['overview', 'reddit', 'twitter'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`px-3 py-1 text-xs rounded capitalize ${
                view === v
                  ? 'bg-terminal-accent text-terminal-bg'
                  : 'bg-terminal-border text-terminal-muted hover:text-terminal-text'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Sentiment Gauge */}
      <div className="px-4 py-4 border-b border-terminal-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-terminal-muted text-sm">Overall Sentiment</span>
          <span className={`font-bold ${getSentimentColor(sentiment.overall_score)}`}>
            {sentiment.overall_label} ({formatScore(sentiment.overall_score)})
          </span>
        </div>
        <div className="h-4 bg-terminal-panel rounded-full overflow-hidden flex">
          <div
            className="bg-red-500 h-full"
            style={{ width: `${Math.max(0, -sentiment.overall_score) * 50}%` }}
          />
          <div className="bg-terminal-border h-full flex-1" />
          <div
            className="bg-green-500 h-full"
            style={{ width: `${Math.max(0, sentiment.overall_score) * 50}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-terminal-muted mt-1">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {view === 'overview' && (
          <div className="space-y-4">
            {/* Source Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              {/* Reddit */}
              <div className="bg-terminal-panel rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-500 font-bold">Reddit</span>
                  <span className={`text-xs ${getSentimentColor(sentiment.reddit.score)}`}>
                    {formatScore(sentiment.reddit.score)}
                  </span>
                </div>
                <div className="text-2xl font-bold text-terminal-text">
                  {sentiment.reddit.mentions.toLocaleString()}
                </div>
                <div className="text-xs text-terminal-muted">mentions</div>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-green-500">🚀 {sentiment.reddit.bullish}</span>
                  <span className="text-red-500">🐻 {sentiment.reddit.bearish}</span>
                </div>
              </div>

              {/* Twitter */}
              <div className="bg-terminal-panel rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-400 font-bold">Twitter/X</span>
                  <span className={`text-xs ${getSentimentColor(sentiment.twitter.score)}`}>
                    {formatScore(sentiment.twitter.score)}
                  </span>
                </div>
                <div className="text-2xl font-bold text-terminal-text">
                  {sentiment.twitter.mentions.toLocaleString()}
                </div>
                <div className="text-xs text-terminal-muted">mentions</div>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-green-500">📈 {sentiment.twitter.bullish.toLocaleString()}</span>
                  <span className="text-red-500">📉 {sentiment.twitter.bearish.toLocaleString()}</span>
                </div>
              </div>

              {/* StockTwits */}
              <div className="bg-terminal-panel rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400 font-bold">StockTwits</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-terminal-border rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${sentiment.stocktwits.bullish}%` }}
                    />
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${sentiment.stocktwits.bearish}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-500">{sentiment.stocktwits.bullish}% Bull</span>
                  <span className="text-red-500">{sentiment.stocktwits.bearish}% Bear</span>
                </div>
                <div className="text-xs text-terminal-muted mt-1">
                  {sentiment.stocktwits.total.toLocaleString()} watchers
                </div>
              </div>
            </div>

            {/* Trending Rank */}
            {sentiment.trending_rank && (
              <div className="bg-terminal-panel rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-terminal-muted">WSB Trending Rank</span>
                  <span className="text-2xl font-bold text-terminal-accent">
                    #{sentiment.trending_rank}
                  </span>
                </div>
              </div>
            )}

            {/* News Sentiment */}
            <div className="bg-terminal-panel rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-terminal-muted">News Sentiment</span>
                <span className={`font-bold ${getSentimentColor(sentiment.news_sentiment)}`}>
                  {formatScore(sentiment.news_sentiment)}
                </span>
              </div>
              <div className="h-2 bg-terminal-border rounded-full overflow-hidden">
                <div
                  className={`h-full ${getSentimentBg(sentiment.news_sentiment)}`}
                  style={{
                    width: `${50 + sentiment.news_sentiment * 50}%`,
                    marginLeft: sentiment.news_sentiment < 0 ? 'auto' : 0
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {view === 'reddit' && (
          <div className="space-y-3">
            <h3 className="text-terminal-muted text-sm">Top Reddit Posts</h3>
            {sentiment.reddit.top_posts.map((post, index) => (
              <div key={index} className="bg-terminal-panel rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-terminal-text text-sm font-medium mb-1">
                      {post.title}
                    </div>
                    <div className="text-xs text-terminal-muted">
                      r/{post.subreddit}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-orange-500">⬆ {post.score.toLocaleString()}</div>
                    <div className="text-terminal-muted">💬 {post.comments}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'twitter' && (
          <div className="space-y-3">
            <h3 className="text-terminal-muted text-sm">Top Tweets</h3>
            {sentiment.twitter.top_tweets.map((tweet, index) => (
              <div key={index} className="bg-terminal-panel rounded-lg p-3">
                <div className="text-terminal-text text-sm mb-2">
                  {tweet.text}
                </div>
                <div className="flex items-center justify-between text-xs text-terminal-muted">
                  <span>{tweet.author}</span>
                  <div className="flex gap-3">
                    <span>❤️ {tweet.likes.toLocaleString()}</span>
                    <span>🔁 {tweet.retweets.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-terminal-border text-xs text-terminal-muted">
        Data aggregated from Reddit, Twitter/X, StockTwits, and news sources
      </div>
    </div>
  );
}
