"""Analytics schemas."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class CorrelationRequest(BaseModel):
    """Request for correlation matrix."""

    tickers: list[str] = Field(min_length=2, max_length=20)
    period: Literal["1m", "3m", "6m", "1y", "2y", "5y"] = "1y"
    method: Literal["pearson", "spearman"] = "pearson"


class CorrelationPair(BaseModel):
    """Correlation between two tickers."""

    ticker1: str
    ticker2: str
    correlation: float


class CorrelationMatrix(BaseModel):
    """Full correlation matrix."""

    tickers: list[str]
    matrix: list[list[float]]  # N x N matrix
    pairs: list[CorrelationPair]  # Flattened unique pairs


class CorrelationResponse(BaseModel):
    """Correlation matrix response."""

    data: CorrelationMatrix
    period: str
    method: str
    start_date: date
    end_date: date
    meta: ResponseMeta


class ReturnSeriesRequest(BaseModel):
    """Request for return series."""

    tickers: list[str] = Field(min_length=1, max_length=10)
    period: Literal["1m", "3m", "6m", "1y", "2y", "5y"] = "1y"
    frequency: Literal["daily", "weekly", "monthly"] = "daily"


class ReturnPoint(BaseModel):
    """Single return data point."""

    date: date
    value: float


class ReturnSeries(BaseModel):
    """Return series for a ticker."""

    ticker: str
    returns: list[ReturnPoint]
    cumulative_return: float
    annualized_return: float
    volatility: float


class ReturnSeriesResponse(BaseModel):
    """Return series response."""

    series: list[ReturnSeries]
    period: str
    frequency: str
    meta: ResponseMeta
