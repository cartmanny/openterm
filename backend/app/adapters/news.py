"""News adapter using Finnhub for market news.

Finnhub free tier: 60 calls/minute
API docs: https://finnhub.io/docs/api/market-news
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.adapters.base import BaseAdapter, InstrumentCandidate, InstrumentProfile, Bar
from app.core.config import settings
from app.core.errors import SourceError
from app.core.resilience import rate_limiter


@dataclass
class NewsArticle:
    """A news article."""

    id: str
    headline: str
    summary: str
    source: str
    url: str
    image_url: str | None
    published_at: datetime
    category: str
    related_symbols: list[str]


class NewsAdapter(BaseAdapter):
    """News adapter using Finnhub."""

    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self) -> None:
        super().__init__()
        self._api_key = settings.finnhub_api_key

        # Register rate limit (conservative: 50/min when limit is 60)
        rate_limiter.register("finnhub", 50)

    @property
    def source_name(self) -> str:
        return "finnhub"

    @property
    def timeout(self) -> float:
        return 15.0

    def _check_api_key(self) -> None:
        """Check if API key is configured."""
        if not self._api_key:
            raise SourceError(
                self.source_name,
                "FINNHUB_API_KEY not configured. Get one at: https://finnhub.io/",
                retryable=False,
            )

    async def get_market_news(
        self, category: str = "general", min_id: int | None = None
    ) -> list[NewsArticle]:
        """
        Get market news.

        Args:
            category: News category (general, forex, crypto, merger)
            min_id: Minimum article ID (for pagination)

        Returns:
            List of news articles
        """
        self._check_api_key()

        params: dict[str, Any] = {
            "category": category,
            "token": self._api_key,
        }

        if min_id is not None:
            params["minId"] = min_id

        response = await self._request(
            "GET",
            f"{self.BASE_URL}/news",
            params=params,
        )

        data = response.json()

        articles = []
        for item in data:
            try:
                published_at = datetime.fromtimestamp(
                    item.get("datetime", 0), tz=timezone.utc
                )
                articles.append(NewsArticle(
                    id=str(item.get("id", "")),
                    headline=item.get("headline", ""),
                    summary=item.get("summary", ""),
                    source=item.get("source", ""),
                    url=item.get("url", ""),
                    image_url=item.get("image"),
                    published_at=published_at,
                    category=category,
                    related_symbols=item.get("related", "").split(",") if item.get("related") else [],
                ))
            except Exception:
                continue

        return articles

    async def get_company_news(
        self,
        symbol: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[NewsArticle]:
        """
        Get news for a specific company.

        Args:
            symbol: Stock ticker symbol
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)

        Returns:
            List of news articles
        """
        self._check_api_key()

        # Default to last 7 days if not specified
        if not to_date:
            to_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if not from_date:
            from_dt = datetime.now(timezone.utc) - timedelta(days=7)
            from_date = from_dt.strftime("%Y-%m-%d")

        params = {
            "symbol": symbol.upper(),
            "from": from_date,
            "to": to_date,
            "token": self._api_key,
        }

        response = await self._request(
            "GET",
            f"{self.BASE_URL}/company-news",
            params=params,
        )

        data = response.json()

        articles = []
        for item in data:
            try:
                published_at = datetime.fromtimestamp(
                    item.get("datetime", 0), tz=timezone.utc
                )
                articles.append(NewsArticle(
                    id=str(item.get("id", "")),
                    headline=item.get("headline", ""),
                    summary=item.get("summary", ""),
                    source=item.get("source", ""),
                    url=item.get("url", ""),
                    image_url=item.get("image"),
                    published_at=published_at,
                    category="company",
                    related_symbols=[symbol.upper()],
                ))
            except Exception:
                continue

        return articles

    # Implement abstract methods (not used for news, but required)
    async def search_instruments(
        self, query: str, limit: int = 10
    ) -> list[InstrumentCandidate]:
        """News adapter doesn't search instruments."""
        return []

    async def get_profile(self, identifier: str) -> InstrumentProfile | None:
        """News adapter doesn't have profiles."""
        return None

    async def get_daily_bars(
        self, ticker: str, start: date, end: date
    ) -> list[Bar]:
        """News adapter doesn't have bars."""
        return []


# Import at end to avoid circular import
from datetime import date, timedelta
