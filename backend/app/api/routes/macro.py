"""Macro economic data API routes."""
from datetime import date

from fastapi import APIRouter, Query

from app.services.macro_service import MacroService
from app.schemas.macro import MacroSeriesResponse, YieldCurveResponse, MacroSearchResponse

router = APIRouter()


@router.get("/series/{series_id}", response_model=MacroSeriesResponse)
async def get_macro_series(
    series_id: str,
    start_date: date | None = Query(None, description="Start date for observations"),
    end_date: date | None = Query(None, description="End date for observations"),
    limit: int | None = Query(None, ge=1, le=1000, description="Max observations"),
):
    """
    Get a FRED macro economic data series.

    Common series IDs:
    - CPI: Consumer Price Index (inflation)
    - GDP: Gross Domestic Product
    - UNRATE: Unemployment Rate
    - FEDFUNDS: Federal Funds Rate
    - DGS10: 10-Year Treasury Yield
    - DGS2: 2-Year Treasury Yield
    - T10Y2Y: 10Y-2Y Treasury Spread

    Full list: https://fred.stlouisfed.org/
    """
    service = MacroService()
    return await service.get_series(
        series_id=series_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )


@router.get("/yield-curve", response_model=YieldCurveResponse)
async def get_yield_curve():
    """
    Get current US Treasury yield curve.

    Returns yields for: 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y, 30Y

    Also indicates if curve is inverted (2Y > 10Y), which is
    historically a recession indicator.
    """
    service = MacroService()
    return await service.get_yield_curve()


@router.get("/search", response_model=MacroSearchResponse)
async def search_macro_series(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
):
    """
    Search for FRED series by keyword.

    Use this to discover available series IDs.
    """
    service = MacroService()
    return await service.search_series(q, limit)
