"""Fundamentals endpoints."""
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import Cache, DbSession
from app.schemas.fundamentals import FundamentalsResponse
from app.services.fundamentals_service import FundamentalsService

router = APIRouter()


@router.get("/{instrument_id}", response_model=FundamentalsResponse)
async def get_fundamentals(
    db: DbSession,
    cache: Cache,
    instrument_id: UUID,
    period_type: str = Query("ttm", description="Period: ttm, annual, quarterly"),
) -> FundamentalsResponse:
    """Get fundamentals snapshot for instrument.

    Includes valuation metrics, income, margins, balance sheet, and ratios.
    Data is cached and refreshed from Yahoo Finance as needed.
    """
    service = FundamentalsService(db, cache)
    snapshot, meta = await service.get_fundamentals(
        instrument_id=instrument_id,
        period_type=period_type,
    )

    return FundamentalsResponse(data=snapshot, meta=meta)
