"""SEC filings endpoints."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import Cache, DbSession
from app.schemas.filing import FilingDetailResponse, FilingsResponse
from app.services.filing_service import FilingService

router = APIRouter()


@router.get("", response_model=FilingsResponse)
async def list_filings(
    db: DbSession,
    cache: Cache,
    instrument_id: UUID | None = Query(None, description="Filter by instrument"),
    ticker: str | None = Query(None, description="Filter by ticker"),
    cik: str | None = Query(None, description="Filter by CIK"),
    form_type: str | None = Query(None, description="Filter by form: 10-K, 10-Q, 8-K"),
    start: date | None = Query(None, description="Filing date start"),
    end: date | None = Query(None, description="Filing date end"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> FilingsResponse:
    """List SEC filings with filtering.

    At least one of instrument_id, ticker, or cik must be provided.
    Data is fetched from SEC EDGAR and cached.
    """
    service = FilingService(db, cache)
    filings, meta = await service.get_filings(
        instrument_id=instrument_id,
        ticker=ticker,
        cik=cik,
        form_type=form_type,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
    )

    return FilingsResponse(data=filings, meta=meta)


@router.get("/{filing_id}", response_model=FilingDetailResponse)
async def get_filing_detail(
    db: DbSession,
    filing_id: UUID,
) -> FilingDetailResponse:
    """Get detailed filing information.

    Includes document list and links to SEC.gov.
    """
    service = FilingService(db)
    detail = await service.get_filing_detail(filing_id)

    return FilingDetailResponse(data=detail)
