"""Instrument and Listing models (Security Master)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Instrument(Base):
    """Security master - central entity for tradeable securities."""

    __tablename__ = "instruments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Identifiers
    figi: Mapped[str | None] = mapped_column(String(12), unique=True, nullable=True)
    isin: Mapped[str | None] = mapped_column(String(12), nullable=True)
    cusip: Mapped[str | None] = mapped_column(String(9), nullable=True)
    cik: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)

    # Basic Info
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    security_type: Mapped[str] = mapped_column(String(50), nullable=False, default="equity")

    # Classification
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sic_code: Mapped[str | None] = mapped_column(String(4), nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Data Lineage
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    asof: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    quality_flags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Relationships
    listings: Mapped[list["Listing"]] = relationship(
        "Listing", back_populates="instrument", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_instruments_name_search", func.to_tsvector("english", name)),
        Index("idx_instruments_type", security_type),
        Index("idx_instruments_active", is_active, postgresql_where=(is_active == True)),
    )


class Listing(Base):
    """Exchange listing for an instrument."""

    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instruments.id", ondelete="CASCADE"), nullable=False
    )

    # Exchange Info
    exchange: Mapped[str] = mapped_column(String(20), nullable=False)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Status
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Data Lineage
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    asof: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    instrument: Mapped["Instrument"] = relationship("Instrument", back_populates="listings")

    __table_args__ = (
        Index("idx_listings_instrument", instrument_id),
        Index("idx_listings_ticker_upper", func.upper(ticker)),
        Index("idx_listings_primary", instrument_id, postgresql_where=(is_primary == True)),
    )
