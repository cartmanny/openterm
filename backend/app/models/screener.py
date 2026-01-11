"""Screener derived facts model.

This table stores pre-computed metrics for fast stock screening.
Updated periodically from fundamentals and price data.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DerivedFacts(Base):
    """Pre-computed derived metrics for screening.

    This table combines fundamentals, price, and calculated metrics
    into a single row per instrument for fast filtering.
    """

    __tablename__ = "derived_facts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One row per instrument
        index=True,
    )

    # Identifiers (denormalized for fast queries)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Price Metrics
    last_price: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    price_change_1d: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    price_change_5d: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    price_change_1m: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    price_change_3m: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    price_change_ytd: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    price_change_1y: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    high_52w: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    low_52w: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    from_52w_high: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    from_52w_low: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Volume Metrics
    avg_volume_10d: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    avg_volume_3m: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    relative_volume: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Valuation
    market_cap: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    enterprise_value: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    pe_trailing: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True, index=True)
    pe_forward: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    peg_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    price_to_book: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    price_to_sales: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    ev_to_ebitda: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Growth
    revenue_growth_yoy: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    eps_growth_yoy: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Profitability
    gross_margin: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    operating_margin: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    profit_margin: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    roe: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True, index=True)
    roa: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Dividend
    dividend_yield: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True, index=True)
    payout_ratio: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Leverage
    debt_to_equity: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    current_ratio: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)

    # Volatility
    beta: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    volatility_30d: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Data Lineage
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    quality_flags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)

    __table_args__ = (
        Index("idx_derived_facts_sector_mcap", "sector", "market_cap"),
        Index("idx_derived_facts_div_yield", "dividend_yield"),
        Index("idx_derived_facts_pe", "pe_trailing"),
    )
