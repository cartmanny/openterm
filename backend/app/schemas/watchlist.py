"""Watchlist-related schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class WatchlistItemResponse(BaseModel):
    """Single watchlist item with price info."""

    instrument_id: UUID
    ticker: str
    name: str
    price: float | None = None
    change: float | None = None
    change_percent: float | None = None
    added_at: datetime


class WatchlistData(BaseModel):
    """Watchlist with items."""

    id: UUID
    name: str
    items: list[WatchlistItemResponse] = Field(default_factory=list)
    item_count: int = 0


class WatchlistMeta(ResponseMeta):
    """Metadata for watchlist response."""

    price_freshness: str | None = None


class WatchlistResponse(BaseModel):
    """Watchlist endpoint response."""

    data: WatchlistData
    meta: WatchlistMeta = Field(default_factory=WatchlistMeta)


class AddToWatchlistRequest(BaseModel):
    """Request to add item to watchlist."""

    ticker: str | None = None
    instrument_id: UUID | None = None


class AddToWatchlistResponse(BaseModel):
    """Response after adding to watchlist."""

    data: WatchlistItemResponse
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
