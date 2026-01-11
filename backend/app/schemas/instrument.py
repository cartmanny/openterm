"""Instrument-related schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class ListingInfo(BaseModel):
    """Exchange listing information."""

    exchange: str
    ticker: str
    is_primary: bool


class InstrumentSearchResult(BaseModel):
    """Single search result."""

    id: UUID
    ticker: str
    name: str
    exchange: str | None = None
    security_type: str
    sector: str | None = None
    match_score: float = 1.0


class SearchMeta(ResponseMeta):
    """Metadata for search response."""

    query: str
    total_matches: int


class SearchResponse(BaseModel):
    """Search endpoint response."""

    data: list[InstrumentSearchResult]
    meta: SearchMeta


class InstrumentProfile(BaseModel):
    """Detailed instrument profile."""

    id: UUID
    name: str
    short_name: str | None = None
    security_type: str
    sector: str | None = None
    industry: str | None = None
    cik: str | None = None
    listings: list[ListingInfo] = Field(default_factory=list)
    is_active: bool = True


class InstrumentResponse(BaseModel):
    """Single instrument response."""

    data: InstrumentProfile
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


class InstrumentByTickerResponse(BaseModel):
    """Response for ticker lookup."""

    data: InstrumentSearchResult
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
