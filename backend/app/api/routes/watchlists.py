"""Watchlist endpoints."""
from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.deps import DbSession
from app.schemas.common import ResponseMeta
from app.schemas.watchlist import (
    AddToWatchlistRequest,
    AddToWatchlistResponse,
    WatchlistMeta,
    WatchlistResponse,
)
from app.services.watchlist_service import WatchlistService

router = APIRouter()


@router.get("/default", response_model=WatchlistResponse)
async def get_default_watchlist(
    db: DbSession,
) -> WatchlistResponse:
    """Get default watchlist with items and current prices.

    For MVP, there is a single default watchlist (no auth).
    """
    service = WatchlistService(db)
    data = await service.get_default_with_items()

    return WatchlistResponse(
        data=data,
        meta=WatchlistMeta(price_freshness="eod"),
    )


@router.post("/{watchlist_id}/items", response_model=AddToWatchlistResponse)
async def add_to_watchlist(
    db: DbSession,
    watchlist_id: UUID,
    request: AddToWatchlistRequest,
) -> AddToWatchlistResponse:
    """Add item to watchlist.

    Provide either ticker or instrument_id.
    """
    service = WatchlistService(db)
    item = await service.add_item(
        watchlist_id=watchlist_id,
        ticker=request.ticker,
        instrument_id=request.instrument_id,
    )

    return AddToWatchlistResponse(
        data=item,
        meta=ResponseMeta(source="database"),
    )


@router.delete("/{watchlist_id}/items/{instrument_id}")
async def remove_from_watchlist(
    db: DbSession,
    watchlist_id: UUID,
    instrument_id: UUID,
) -> Response:
    """Remove item from watchlist."""
    service = WatchlistService(db)
    await service.remove_item(watchlist_id, instrument_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
