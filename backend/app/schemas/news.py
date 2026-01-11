"""News data schemas."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class NewsArticleSchema(BaseModel):
    """A news article."""

    id: str
    headline: str
    summary: str
    source: str
    url: str
    image_url: str | None = None
    published_at: datetime
    category: str
    related_symbols: list[str] = Field(default_factory=list)


class MarketNewsResponse(BaseModel):
    """Response for market news."""

    articles: list[NewsArticleSchema]
    category: str
    meta: ResponseMeta


class CompanyNewsResponse(BaseModel):
    """Response for company-specific news."""

    symbol: str
    articles: list[NewsArticleSchema]
    meta: ResponseMeta
