"""Filing service for SEC filings."""
import time
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.sec_edgar import SECEdgarAdapter
from app.core.config import settings
from app.core.errors import NotFoundError
from app.core.redis import CacheManager
from app.core.resilience import source_registry
from app.models.filing import Filing
from app.models.instrument import Instrument, Listing
from app.schemas.common import PaginatedMeta
from app.schemas.filing import FilingDetail, FilingDocument, FilingItem


class FilingService:
    """Service for SEC filing operations."""

    def __init__(self, db: AsyncSession, cache: CacheManager | None = None):
        self.db = db
        self.cache = cache
        self.sec = SECEdgarAdapter()

    async def get_filings(
        self,
        instrument_id: UUID | None = None,
        ticker: str | None = None,
        cik: str | None = None,
        form_type: str | None = None,
        start: date | None = None,
        end: date | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[FilingItem], PaginatedMeta]:
        """Get SEC filings with filtering.

        Args:
            instrument_id: Filter by instrument
            ticker: Filter by ticker
            cik: Filter by CIK
            form_type: Filter by form type (10-K, 10-Q, 8-K)
            start: Filing date start
            end: Filing date end
            limit: Max results
            offset: Pagination offset

        Returns:
            Tuple of (filings, metadata)
        """
        # Resolve to CIK if needed
        resolved_cik = cik
        resolved_ticker = ticker
        resolved_instrument_id = instrument_id

        if ticker and not cik:
            resolved_cik = await self._get_cik_for_ticker(ticker)
            if resolved_cik:
                # Also get instrument_id
                stmt = (
                    select(Instrument.id)
                    .join(Listing)
                    .where(func.upper(Listing.ticker) == ticker.upper())
                )
                result = await self.db.execute(stmt)
                resolved_instrument_id = result.scalar_one_or_none()

        if instrument_id and not cik:
            stmt = select(Instrument.cik).where(Instrument.id == instrument_id)
            result = await self.db.execute(stmt)
            resolved_cik = result.scalar_one_or_none()

            # Also get ticker
            stmt = (
                select(Listing.ticker)
                .where(Listing.instrument_id == instrument_id)
                .where(Listing.is_primary == True)
            )
            result = await self.db.execute(stmt)
            resolved_ticker = result.scalar_one_or_none()

        if not resolved_cik:
            raise NotFoundError("CIK", ticker or str(instrument_id))

        # Check cache
        cache_key = f"{resolved_cik}:{form_type or 'all'}:{limit}:{offset}"
        if self.cache:
            cached = await self.cache.get("filings", cache_key)
            if cached:
                return (
                    [FilingItem(**f) for f in cached["data"]],
                    PaginatedMeta(**cached["meta"]),
                )

        # Check database first
        db_filings = await self._get_from_db(
            resolved_cik, form_type, start, end, limit, offset
        )

        # If no data or potentially stale, fetch from SEC if enabled
        if not db_filings and settings.enable_edgar and source_registry.is_available("sec_edgar"):
            form_types = [form_type] if form_type else ["10-K", "10-Q", "8-K"]
            start_time = time.time()
            try:
                sec_filings = await self.sec.get_filings(resolved_cik, form_types, limit=50)
                latency_ms = (time.time() - start_time) * 1000
                source_registry.record_request("sec_edgar", latency_ms, success=True)

                if sec_filings:
                    await self._store_filings(sec_filings, resolved_instrument_id)
                    db_filings = await self._get_from_db(
                        resolved_cik, form_type, start, end, limit, offset
                    )
            except Exception:
                latency_ms = (time.time() - start_time) * 1000
                source_registry.record_request("sec_edgar", latency_ms, success=False)

        # Count total
        total_count = await self._count_filings(resolved_cik, form_type, start, end)

        # Convert to response format
        items = [
            FilingItem(
                id=f.id,
                instrument_id=f.instrument_id,
                ticker=resolved_ticker,
                cik=f.cik,
                form_type=f.form_type,
                filing_date=f.filing_date,
                accepted_date=f.accepted_date,
                accession_number=f.accession_number,
                title=f.title,
                primary_doc_url=f.primary_doc_url,
                summary=f.summary,
            )
            for f in db_filings
        ]

        meta = PaginatedMeta(
            source="sec_edgar",
            total_count=total_count,
            limit=limit,
            offset=offset,
        )

        # Cache result
        if self.cache and items:
            await self.cache.set(
                "filings",
                cache_key,
                value={
                    "data": [item.model_dump() for item in items],
                    "meta": meta.model_dump(),
                },
                ttl=settings.cache_filings_ttl,
            )

        return items, meta

    async def get_filing_detail(self, filing_id: UUID) -> FilingDetail:
        """Get detailed filing information.

        Args:
            filing_id: Filing UUID

        Returns:
            FilingDetail
        """
        stmt = select(Filing).where(Filing.id == filing_id)
        result = await self.db.execute(stmt)
        filing = result.scalar_one_or_none()

        if not filing:
            raise NotFoundError("Filing", str(filing_id))

        # Get ticker if we have instrument_id
        ticker = None
        company_name = None
        if filing.instrument_id:
            stmt = (
                select(Instrument.name, Listing.ticker)
                .join(Listing)
                .where(Instrument.id == filing.instrument_id)
                .where(Listing.is_primary == True)
            )
            result = await self.db.execute(stmt)
            row = result.first()
            if row:
                company_name, ticker = row

        # Build document list
        documents = []
        if filing.primary_document:
            documents.append(
                FilingDocument(
                    filename=filing.primary_document,
                    description=filing.form_type,
                    url=filing.primary_doc_url or "",
                    type="primary",
                )
            )

        return FilingDetail(
            id=filing.id,
            instrument_id=filing.instrument_id,
            ticker=ticker,
            company_name=company_name,
            cik=filing.cik,
            form_type=filing.form_type,
            filing_date=filing.filing_date,
            accepted_date=filing.accepted_date,
            accession_number=filing.accession_number,
            documents=documents,
            summary=filing.summary,
            is_amended=filing.is_amended,
        )

    async def _get_cik_for_ticker(self, ticker: str) -> str | None:
        """Get CIK for ticker from database."""
        stmt = (
            select(Instrument.cik)
            .join(Listing)
            .where(func.upper(Listing.ticker) == ticker.upper())
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_from_db(
        self,
        cik: str,
        form_type: str | None,
        start: date | None,
        end: date | None,
        limit: int,
        offset: int,
    ) -> list[Filing]:
        """Get filings from database."""
        stmt = select(Filing).where(Filing.cik == cik)

        if form_type:
            stmt = stmt.where(Filing.form_type == form_type.upper())
        if start:
            stmt = stmt.where(Filing.filing_date >= start)
        if end:
            stmt = stmt.where(Filing.filing_date <= end)

        stmt = stmt.order_by(Filing.filing_date.desc()).limit(limit).offset(offset)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _count_filings(
        self,
        cik: str,
        form_type: str | None,
        start: date | None,
        end: date | None,
    ) -> int:
        """Count total filings matching criteria."""
        stmt = select(func.count(Filing.id)).where(Filing.cik == cik)

        if form_type:
            stmt = stmt.where(Filing.form_type == form_type.upper())
        if start:
            stmt = stmt.where(Filing.filing_date >= start)
        if end:
            stmt = stmt.where(Filing.filing_date <= end)

        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    async def _store_filings(
        self, filings: list, instrument_id: UUID | None
    ) -> None:
        """Store filings in database."""
        from app.adapters.base import Filing as AdapterFiling

        now = datetime.now(timezone.utc)

        for f in filings:
            if not isinstance(f, AdapterFiling):
                continue

            stmt = insert(Filing).values(
                instrument_id=instrument_id,
                cik=f.cik,
                accession_number=f.accession_number,
                form_type=f.form_type,
                filing_date=f.filing_date,
                accepted_date=f.accepted_date,
                primary_document=f.primary_document,
                primary_doc_url=f.primary_doc_url,
                title=f.title,
                description=f.description,
                source="sec_edgar",
                asof=now,
                ingested_at=now,
            )

            stmt = stmt.on_conflict_do_nothing(index_elements=["accession_number"])

            await self.db.execute(stmt)

        await self.db.commit()
