"""Macro/Economic data models."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MacroSeries(Base):
    """Economic time series metadata (from FRED)."""

    __tablename__ = "macro_series"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # FRED series ID

    # Metadata
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    units: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(20), nullable=True)
    seasonal_adjustment: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Data Lineage
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="fred")
    last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    observations: Mapped[list["MacroObservation"]] = relationship(
        "MacroObservation", back_populates="series", cascade="all, delete-orphan"
    )


class MacroObservation(Base):
    """Individual observation in a macro series."""

    __tablename__ = "macro_observations"

    series_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("macro_series.id", ondelete="CASCADE"),
        primary_key=True,
    )
    observation_date: Mapped[date] = mapped_column(Date, primary_key=True)

    value: Mapped[float | None] = mapped_column(Numeric(20, 6), nullable=True)

    # Data Lineage
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    series: Mapped["MacroSeries"] = relationship("MacroSeries", back_populates="observations")

    __table_args__ = (Index("idx_macro_obs_date", "observation_date"),)
