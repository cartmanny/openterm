"""SEC Filing model."""
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Filing(Base):
    """SEC EDGAR filings."""

    __tablename__ = "filings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    instrument_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # SEC Identifiers
    cik: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    accession_number: Mapped[str] = mapped_column(String(25), nullable=False, unique=True)

    # Filing Info
    form_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    filing_date: Mapped[date] = mapped_column(Date, nullable=False)
    accepted_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Document Info
    primary_document: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_doc_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Content
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Flags
    is_amended: Mapped[bool] = mapped_column(Boolean, default=False)
    amendment_of: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("filings.id"), nullable=True
    )

    # Data Lineage
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="sec_edgar")
    asof: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    quality_flags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)

    __table_args__ = (
        Index("idx_filings_date", "filing_date"),
        Index("idx_filings_instrument_form", instrument_id, form_type, "filing_date"),
    )
