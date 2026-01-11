"""Price endpoints."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import Cache, DbSession
from app.schemas.price import PriceResponse, QuoteResponse
from app.services.price_service import PriceService

router = APIRouter()


@router.get("/{instrument_id}/daily", response_model=PriceResponse)
async def get_daily_bars(
    db: DbSession,
    cache: Cache,
    instrument_id: UUID,
    start: date | None = Query(None, description="Start date"),
    end: date | None = Query(None, description="End date"),
    period: str | None = Query(None, description="Period: 1M, 3M, 6M, 1Y, 2Y, 5Y, MAX"),
) -> PriceResponse:
    """Get historical daily OHLCV bars.

    Specify either start/end dates or a period shorthand.
    Data is fetched from cache/database, falling back to external sources.
    """
    service = PriceService(db, cache)
    data, meta = await service.get_daily_bars(
        instrument_id=instrument_id,
        start=start,
        end=end,
        period=period,
    )

    return PriceResponse(data=data, meta=meta)


@router.get("/{instrument_id}/quote", response_model=QuoteResponse)
async def get_quote(
    db: DbSession,
    cache: Cache,
    instrument_id: UUID,
) -> QuoteResponse:
    """Get latest quote for instrument.

    Returns most recent price with change from previous close.
    """
    service = PriceService(db, cache)
    quote, meta = await service.get_quote(instrument_id)

    return QuoteResponse(data=quote, meta=meta)
