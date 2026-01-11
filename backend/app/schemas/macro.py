"""Macro economic data schemas."""
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class MacroObservationSchema(BaseModel):
    """A single macro data observation."""

    date: date
    value: float | None
    series_id: str


class MacroSeriesData(BaseModel):
    """Macro economic data series."""

    series_id: str
    title: str
    units: str
    frequency: str
    observations: list[MacroObservationSchema] = Field(default_factory=list)


class MacroSeriesResponse(BaseModel):
    """Response for macro series data."""

    data: MacroSeriesData
    meta: ResponseMeta


class YieldPoint(BaseModel):
    """A single point on the yield curve."""

    yield_value: float | None = Field(alias="yield")
    date: str | None


class YieldCurveData(BaseModel):
    """US Treasury yield curve data."""

    curve: dict[str, YieldPoint]  # Maturity -> yield
    is_inverted: bool = False  # True if 2Y > 10Y
    spread_2y_10y: float | None = None


class YieldCurveResponse(BaseModel):
    """Response for yield curve data."""

    data: YieldCurveData
    meta: ResponseMeta


class MacroSeriesInfo(BaseModel):
    """Information about a FRED series."""

    series_id: str
    title: str
    units: str
    frequency: str
    popularity: int | None = None


class MacroSearchResponse(BaseModel):
    """Response for macro series search."""

    query: str
    results: list[MacroSeriesInfo]
    meta: ResponseMeta


# Common series aliases for easier lookup
COMMON_SERIES = {
    "CPI": {"series_id": "CPIAUCSL", "title": "Consumer Price Index", "description": "Measures inflation"},
    "GDP": {"series_id": "GDP", "title": "Gross Domestic Product", "description": "Economic output"},
    "UNRATE": {"series_id": "UNRATE", "title": "Unemployment Rate", "description": "Jobless rate"},
    "FEDFUNDS": {"series_id": "FEDFUNDS", "title": "Federal Funds Rate", "description": "Fed interest rate"},
    "DGS10": {"series_id": "DGS10", "title": "10-Year Treasury", "description": "Long-term yield"},
    "DGS2": {"series_id": "DGS2", "title": "2-Year Treasury", "description": "Short-term yield"},
    "T10Y2Y": {"series_id": "T10Y2Y", "title": "10Y-2Y Spread", "description": "Yield curve slope"},
}
