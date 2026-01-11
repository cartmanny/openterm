"""Analytics API routes."""
from typing import Literal

from fastapi import APIRouter, Query

from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    CorrelationRequest,
    CorrelationResponse,
    ReturnSeriesRequest,
    ReturnSeriesResponse,
)

router = APIRouter()


@router.post("/correlation", response_model=CorrelationResponse)
async def get_correlation_matrix(request: CorrelationRequest):
    """
    Calculate correlation matrix for a list of tickers.

    Returns an N x N correlation matrix showing how price movements
    of different assets are related.

    Correlation ranges from -1 (perfectly negative) to +1 (perfectly positive).
    """
    service = AnalyticsService()
    return await service.get_correlation_matrix(
        tickers=request.tickers,
        period=request.period,
        method=request.method,
    )


@router.get("/correlation", response_model=CorrelationResponse)
async def get_correlation_matrix_get(
    tickers: str = Query(..., description="Comma-separated list of tickers"),
    period: Literal["1m", "3m", "6m", "1y", "2y", "5y"] = Query("1y"),
    method: Literal["pearson", "spearman"] = Query("pearson"),
):
    """
    Calculate correlation matrix (GET version for simpler queries).

    Example: /analytics/correlation?tickers=AAPL,MSFT,GOOGL&period=1y
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    service = AnalyticsService()
    return await service.get_correlation_matrix(
        tickers=ticker_list,
        period=period,
        method=method,
    )


@router.post("/returns", response_model=ReturnSeriesResponse)
async def get_return_series(request: ReturnSeriesRequest):
    """
    Get return series for multiple tickers.

    Returns daily/weekly/monthly returns with cumulative return,
    annualized return, and volatility for each ticker.
    """
    service = AnalyticsService()
    return await service.get_return_series(
        tickers=request.tickers,
        period=request.period,
        frequency=request.frequency,
    )


@router.get("/returns", response_model=ReturnSeriesResponse)
async def get_return_series_get(
    tickers: str = Query(..., description="Comma-separated list of tickers"),
    period: Literal["1m", "3m", "6m", "1y", "2y", "5y"] = Query("1y"),
    frequency: Literal["daily", "weekly", "monthly"] = Query("daily"),
):
    """
    Get return series (GET version for simpler queries).

    Example: /analytics/returns?tickers=AAPL,MSFT&period=1y&frequency=daily
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    service = AnalyticsService()
    return await service.get_return_series(
        tickers=ticker_list,
        period=period,
        frequency=frequency,
    )
