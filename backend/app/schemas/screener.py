"""Screener-related schemas."""
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class ScreenerFilter(BaseModel):
    """Single filter condition."""

    field: str
    operator: Literal["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]
    value: Any


class ScreenerSort(BaseModel):
    """Sort specification."""

    field: str
    order: Literal["asc", "desc"] = "desc"


class ScreenerRequest(BaseModel):
    """Screener request."""

    filters: list[ScreenerFilter] = Field(default_factory=list)
    sort: ScreenerSort | None = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class ScreenerResult(BaseModel):
    """Single screener result."""

    instrument_id: UUID
    ticker: str
    name: str
    sector: str | None = None
    industry: str | None = None

    # Metrics (populated based on what's available)
    market_cap: int | None = None
    pe_trailing: float | None = None
    roe: float | None = None
    roic: float | None = None
    profit_margin: float | None = None
    debt_to_equity: float | None = None
    dividend_yield: float | None = None
    price: float | None = None
    return_1m: float | None = None
    return_3m: float | None = None
    return_6m: float | None = None
    return_1y: float | None = None


class ScreenerResultData(BaseModel):
    """Screener results data."""

    results: list[ScreenerResult]
    total_count: int
    filters_applied: int


class ScreenerMeta(ResponseMeta):
    """Metadata for screener response."""

    note: str | None = None


class ScreenerResponse(BaseModel):
    """Screener endpoint response."""

    data: ScreenerResultData
    meta: ScreenerMeta = Field(default_factory=ScreenerMeta)


# Pre-defined screen templates
SCREEN_TEMPLATES = {
    "value": {
        "name": "Value Stocks",
        "description": "Low P/E, positive earnings",
        "filters": [
            {"field": "pe_trailing", "operator": "gt", "value": 0},
            {"field": "pe_trailing", "operator": "lt", "value": 15},
            {"field": "market_cap", "operator": "gt", "value": 1_000_000_000},
        ],
    },
    "growth": {
        "name": "Growth Stocks",
        "description": "High revenue growth",
        "filters": [
            {"field": "revenue_growth_yoy", "operator": "gt", "value": 0.20},
            {"field": "market_cap", "operator": "gt", "value": 1_000_000_000},
        ],
    },
    "dividend": {
        "name": "Dividend Stocks",
        "description": "High dividend yield, sustainable payout",
        "filters": [
            {"field": "dividend_yield", "operator": "gt", "value": 0.03},
            {"field": "payout_ratio", "operator": "lt", "value": 0.80},
            {"field": "market_cap", "operator": "gt", "value": 1_000_000_000},
        ],
    },
    "quality": {
        "name": "Quality Stocks",
        "description": "High ROE, low debt",
        "filters": [
            {"field": "roe", "operator": "gt", "value": 0.15},
            {"field": "debt_to_equity", "operator": "lt", "value": 1.0},
            {"field": "market_cap", "operator": "gt", "value": 5_000_000_000},
        ],
    },
    "large_cap": {
        "name": "Large Cap",
        "description": "Market cap > $10B",
        "filters": [
            {"field": "market_cap", "operator": "gt", "value": 10_000_000_000},
        ],
    },
    "small_cap": {
        "name": "Small Cap",
        "description": "Market cap $300M - $2B",
        "filters": [
            {"field": "market_cap", "operator": "gt", "value": 300_000_000},
            {"field": "market_cap", "operator": "lt", "value": 2_000_000_000},
        ],
    },
}
