"""News service."""
from datetime import datetime, timezone

from app.adapters.news import NewsAdapter
from app.core.config import settings
from app.core.errors import SourceError
from app.schemas.common import ResponseMeta
from app.schemas.news import (
    NewsArticleSchema,
    MarketNewsResponse,
    CompanyNewsResponse,
)


class NewsService:
    """Service for news operations."""

    def __init__(self) -> None:
        self.news = NewsAdapter() if settings.finnhub_api_key else None

    def _check_news_available(self) -> None:
        """Check if news is available."""
        if not settings.enable_news:
            raise SourceError(
                "finnhub",
                "News integration is disabled. Set ENABLE_NEWS=true to enable.",
                retryable=False,
            )
        if not self.news:
            raise SourceError(
                "finnhub",
                "FINNHUB_API_KEY not configured. Get one at: https://finnhub.io/",
                retryable=False,
            )

    async def get_market_news(
        self, category: str = "general", limit: int = 20
    ) -> MarketNewsResponse:
        """
        Get market news.

        Args:
            category: News category (general, forex, crypto, merger)
            limit: Maximum articles to return

        Returns:
            MarketNewsResponse with articles
        """
        self._check_news_available()

        articles = await self.news.get_market_news(category=category)

        # Limit results
        articles = articles[:limit]

        # Convert to schema
        article_schemas = [
            NewsArticleSchema(
                id=a.id,
                headline=a.headline,
                summary=a.summary,
                source=a.source,
                url=a.url,
                image_url=a.image_url,
                published_at=a.published_at,
                category=a.category,
                related_symbols=a.related_symbols,
            )
            for a in articles
        ]

        meta = ResponseMeta(
            source="finnhub",
            asof=datetime.now(timezone.utc),
            ingested_at=datetime.now(timezone.utc),
            freshness="realtime",
            quality_flags=[],
        )

        return MarketNewsResponse(
            articles=article_schemas,
            category=category,
            meta=meta,
        )

    async def get_company_news(
        self,
        symbol: str,
        from_date: str | None = None,
        to_date: str | None = None,
        limit: int = 20,
    ) -> CompanyNewsResponse:
        """
        Get news for a specific company.

        Args:
            symbol: Stock ticker symbol
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            limit: Maximum articles to return

        Returns:
            CompanyNewsResponse with articles
        """
        self._check_news_available()

        articles = await self.news.get_company_news(
            symbol=symbol,
            from_date=from_date,
            to_date=to_date,
        )

        # Limit results
        articles = articles[:limit]

        # Convert to schema
        article_schemas = [
            NewsArticleSchema(
                id=a.id,
                headline=a.headline,
                summary=a.summary,
                source=a.source,
                url=a.url,
                image_url=a.image_url,
                published_at=a.published_at,
                category=a.category,
                related_symbols=a.related_symbols,
            )
            for a in articles
        ]

        meta = ResponseMeta(
            source="finnhub",
            asof=datetime.now(timezone.utc),
            ingested_at=datetime.now(timezone.utc),
            freshness="realtime",
            quality_flags=[],
        )

        return CompanyNewsResponse(
            symbol=symbol.upper(),
            articles=article_schemas,
            meta=meta,
        )
