"""Instrument endpoints."""
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import Cache, DbSession
from app.schemas.common import ResponseMeta
from app.schemas.instrument import (
    InstrumentByTickerResponse,
    InstrumentResponse,
    SearchMeta,
    SearchResponse,
)
from app.services.instrument_service import InstrumentService

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search_instruments(
    db: DbSession,
    cache: Cache,
    q: str = Query(..., min_length=1, description="Search query"),
    type: str | None = Query(None, description="Filter by type: equity, etf"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
) -> SearchResponse:
    """Search for instruments by name or ticker.

    Supports fuzzy matching and returns results ranked by relevance.
    """
    service = InstrumentService(db, cache)
    results, total = await service.search(q, security_type=type, limit=limit)

    return SearchResponse(
        data=results,
        meta=SearchMeta(
            query=q,
            total_matches=total,
            cached=False,  # TODO: track actual cache status
        ),
    )


@router.get("/ticker/{ticker}", response_model=InstrumentByTickerResponse)
async def get_by_ticker(
    db: DbSession,
    ticker: str,
) -> InstrumentByTickerResponse:
    """Get instrument by ticker symbol.

    Resolves ticker to instrument ID and returns basic info.
    """
    service = InstrumentService(db)
    result = await service.get_by_ticker(ticker)

    return InstrumentByTickerResponse(
        data=result,
        meta=ResponseMeta(source="database", cached=True),
    )


@router.get("/{instrument_id}", response_model=InstrumentResponse)
async def get_instrument(
    db: DbSession,
    instrument_id: UUID,
) -> InstrumentResponse:
    """Get detailed instrument profile.

    Includes all listings and classification data.
    """
    service = InstrumentService(db)
    profile = await service.get_by_id(instrument_id)

    return InstrumentResponse(
        data=profile,
        meta=ResponseMeta(source="database"),
    )
