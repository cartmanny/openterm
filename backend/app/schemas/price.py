"""Price-related schemas."""
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class Bar(BaseModel):
    """OHLCV bar."""

    date: date
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float
    adj_close: float | None = None
    volume: int | None = None


class PriceData(BaseModel):
    """Price data with bars."""

    instrument_id: UUID
    ticker: str
    currency: str = "USD"
    bars: list[Bar]


class PriceMeta(ResponseMeta):
    """Metadata for price response."""

    bar_count: int = 0


class PriceResponse(BaseModel):
    """Historical price response."""

    data: PriceData
    meta: PriceMeta = Field(default_factory=PriceMeta)


class Quote(BaseModel):
    """Current quote snapshot."""

    instrument_id: UUID
    ticker: str
    price: float
    change: float
    change_percent: float
    open: float | None = None
    high: float | None = None
    low: float | None = None
    prev_close: float | None = None
    volume: int | None = None
    market_cap: int | None = None
    trade_date: date
    currency: str = "USD"


class QuoteResponse(BaseModel):
    """Quote endpoint response."""

    data: Quote
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
