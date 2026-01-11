"""API router aggregation."""
from fastapi import APIRouter

from app.api.routes import (
    instruments,
    prices,
    fundamentals,
    filings,
    watchlists,
    health,
    macro,
    news,
    screener,
    portfolio,
    analytics,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(instruments.router, prefix="/instruments", tags=["instruments"])
api_router.include_router(prices.router, prefix="/prices", tags=["prices"])
api_router.include_router(fundamentals.router, prefix="/fundamentals", tags=["fundamentals"])
api_router.include_router(filings.router, prefix="/filings", tags=["filings"])
api_router.include_router(watchlists.router, prefix="/watchlists", tags=["watchlists"])
api_router.include_router(macro.router, prefix="/macro", tags=["macro"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(screener.router, prefix="/screener", tags=["screener"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
