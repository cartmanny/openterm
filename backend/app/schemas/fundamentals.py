"""Fundamentals-related schemas."""
from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class ValuationMetrics(BaseModel):
    """Valuation-related metrics."""

    market_cap: int | None = None
    enterprise_value: int | None = None
    pe_trailing: float | None = None
    pe_forward: float | None = None
    peg_ratio: float | None = None
    price_to_book: float | None = None
    price_to_sales: float | None = None
    ev_to_ebitda: float | None = None


class IncomeMetrics(BaseModel):
    """Income statement metrics."""

    revenue: int | None = None
    gross_profit: int | None = None
    operating_income: int | None = None
    net_income: int | None = None
    ebitda: int | None = None
    eps: float | None = None
    eps_diluted: float | None = None


class MarginMetrics(BaseModel):
    """Margin metrics."""

    gross_margin: float | None = None
    operating_margin: float | None = None
    profit_margin: float | None = None


class BalanceSheetMetrics(BaseModel):
    """Balance sheet metrics."""

    total_assets: int | None = None
    total_liabilities: int | None = None
    total_equity: int | None = None
    total_debt: int | None = None
    cash: int | None = None


class ReturnMetrics(BaseModel):
    """Return metrics."""

    roe: float | None = None
    roa: float | None = None
    roic: float | None = None


class LeverageMetrics(BaseModel):
    """Leverage metrics."""

    debt_to_equity: float | None = None
    debt_to_ebitda: float | None = None
    current_ratio: float | None = None
    quick_ratio: float | None = None


class DividendMetrics(BaseModel):
    """Dividend metrics."""

    dividend_yield: float | None = None
    payout_ratio: float | None = None


class FundamentalsSnapshot(BaseModel):
    """Complete fundamentals snapshot."""

    instrument_id: UUID
    ticker: str
    period_type: str
    period_end: date

    valuation: ValuationMetrics = Field(default_factory=ValuationMetrics)
    income: IncomeMetrics = Field(default_factory=IncomeMetrics)
    margins: MarginMetrics = Field(default_factory=MarginMetrics)
    balance_sheet: BalanceSheetMetrics = Field(default_factory=BalanceSheetMetrics)
    returns: ReturnMetrics = Field(default_factory=ReturnMetrics)
    leverage: LeverageMetrics = Field(default_factory=LeverageMetrics)
    dividend: DividendMetrics = Field(default_factory=DividendMetrics)


class FundamentalsResponse(BaseModel):
    """Fundamentals endpoint response."""

    data: FundamentalsSnapshot
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
