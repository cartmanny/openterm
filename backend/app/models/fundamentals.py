"""Fundamentals (financial snapshots) model."""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Fundamentals(Base):
    """Point-in-time fundamental data snapshots."""

    __tablename__ = "fundamentals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Reporting Period
    period_type: Mapped[str] = mapped_column(String(10), nullable=False)  # annual, quarterly, ttm
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    fiscal_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fiscal_quarter: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Valuation
    market_cap: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    enterprise_value: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    shares_outstanding: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    float_shares: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Valuation Ratios
    pe_trailing: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    pe_forward: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    peg_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    price_to_book: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    price_to_sales: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    ev_to_ebitda: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Income Statement
    revenue: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    gross_profit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    operating_income: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    net_income: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    ebitda: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    eps: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    eps_diluted: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Margins
    gross_margin: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    operating_margin: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    profit_margin: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Balance Sheet
    total_assets: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_liabilities: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_equity: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_debt: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cash: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Returns
    roe: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    roa: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    roic: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Leverage
    debt_to_equity: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    debt_to_ebitda: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    current_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    quick_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Dividend
    dividend_yield: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    payout_ratio: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Data Lineage
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    asof: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    quality_flags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)

    __table_args__ = (
        UniqueConstraint("instrument_id", "period_type", "period_end"),
        Index("idx_fundamentals_period", "period_end"),
        Index("idx_fundamentals_market_cap", market_cap),
        Index("idx_fundamentals_pe", pe_trailing),
        Index("idx_fundamentals_roe", roe),
    )
