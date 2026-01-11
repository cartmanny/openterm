"""Filing-related schemas."""
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import PaginatedMeta, ResponseMeta


class FilingItem(BaseModel):
    """Filing list item."""

    id: UUID
    instrument_id: UUID | None = None
    ticker: str | None = None
    cik: str
    form_type: str
    filing_date: date
    accepted_date: datetime | None = None
    accession_number: str
    title: str | None = None
    primary_doc_url: str | None = None
    summary: str | None = None


class FilingDocument(BaseModel):
    """Document within a filing."""

    filename: str
    description: str | None = None
    url: str
    size_bytes: int | None = None
    type: str = "exhibit"  # primary, exhibit


class FilingDetail(BaseModel):
    """Detailed filing information."""

    id: UUID
    instrument_id: UUID | None = None
    ticker: str | None = None
    company_name: str | None = None
    cik: str
    form_type: str
    filing_date: date
    accepted_date: datetime | None = None
    accession_number: str
    fiscal_year_end: date | None = None
    documents: list[FilingDocument] = Field(default_factory=list)
    summary: str | None = None
    is_amended: bool = False


class FilingsListMeta(PaginatedMeta):
    """Metadata for filings list."""

    pass


class FilingsResponse(BaseModel):
    """Filings list response."""

    data: list[FilingItem]
    meta: FilingsListMeta


class FilingDetailResponse(BaseModel):
    """Single filing detail response."""

    data: FilingDetail
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
