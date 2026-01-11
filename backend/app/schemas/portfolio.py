"""Portfolio schemas."""
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class TransactionCreate(BaseModel):
    """Create a new transaction."""

    instrument_id: UUID
    transaction_type: Literal["buy", "sell", "dividend", "split"]
    transaction_date: date
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)
    currency: str = "USD"
    fees: float = 0
    notes: str | None = None


class TransactionSchema(BaseModel):
    """Transaction schema."""

    id: UUID
    portfolio_id: UUID
    instrument_id: UUID
    ticker: str | None = None  # Populated from join
    transaction_type: str
    transaction_date: date
    quantity: float
    price: float
    currency: str
    fees: float
    notes: str | None
    created_at: datetime


class PortfolioCreate(BaseModel):
    """Create a new portfolio."""

    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    currency: str = "USD"


class PortfolioSchema(BaseModel):
    """Portfolio schema."""

    id: UUID
    name: str
    description: str | None
    currency: str
    is_default: bool
    created_at: datetime
    updated_at: datetime


class HoldingSchema(BaseModel):
    """Current holding in portfolio."""

    instrument_id: UUID
    ticker: str
    name: str | None
    quantity: float
    avg_cost: float
    current_price: float | None
    market_value: float | None
    cost_basis: float
    unrealized_pnl: float | None
    unrealized_pnl_pct: float | None
    weight: float | None  # Percent of portfolio


class PortfolioSummary(BaseModel):
    """Portfolio summary statistics."""

    total_value: float
    total_cost: float
    total_unrealized_pnl: float
    total_unrealized_pnl_pct: float
    total_realized_pnl: float
    num_holdings: int
    num_transactions: int


class PortfolioAnalytics(BaseModel):
    """Portfolio analytics metrics."""

    # Returns
    return_1d: float | None
    return_1w: float | None
    return_1m: float | None
    return_3m: float | None
    return_ytd: float | None
    return_1y: float | None

    # Risk-adjusted
    sharpe_ratio: float | None
    sortino_ratio: float | None
    beta: float | None
    alpha: float | None

    # Risk
    volatility: float | None
    max_drawdown: float | None
    var_95: float | None  # 95% VaR

    # Allocation
    top_holdings: list[dict]  # [{ticker, weight}]
    sector_allocation: dict[str, float]  # {sector: weight}


class PortfolioDetailResponse(BaseModel):
    """Full portfolio response."""

    portfolio: PortfolioSchema
    summary: PortfolioSummary
    holdings: list[HoldingSchema]
    meta: ResponseMeta


class PortfolioAnalyticsResponse(BaseModel):
    """Portfolio analytics response."""

    portfolio_id: UUID
    portfolio_name: str
    analytics: PortfolioAnalytics
    meta: ResponseMeta
