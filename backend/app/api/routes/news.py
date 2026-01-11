"""News API routes."""
from fastapi import APIRouter, Query

from app.services.news_service import NewsService
from app.schemas.news import MarketNewsResponse, CompanyNewsResponse

router = APIRouter()


@router.get("/market", response_model=MarketNewsResponse)
async def get_market_news(
    category: str = Query("general", description="News category: general, forex, crypto, merger"),
    limit: int = Query(20, ge=1, le=100, description="Max articles to return"),
):
    """
    Get market news.

    Categories:
    - general: General market news
    - forex: Foreign exchange news
    - crypto: Cryptocurrency news
    - merger: M&A news
    """
    service = NewsService()
    return await service.get_market_news(category=category, limit=limit)


@router.get("/company/{symbol}", response_model=CompanyNewsResponse)
async def get_company_news(
    symbol: str,
    from_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(20, ge=1, le=100, description="Max articles to return"),
):
    """
    Get news for a specific company.

    Returns news articles mentioning the given stock symbol.
    """
    service = NewsService()
    return await service.get_company_news(
        symbol=symbol,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
    )
