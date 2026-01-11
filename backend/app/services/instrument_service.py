"""Instrument service for security master operations."""
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.core.redis import CacheManager
from app.core.config import settings
from app.models.instrument import Instrument, Listing
from app.schemas.instrument import (
    InstrumentProfile,
    InstrumentSearchResult,
    ListingInfo,
)


class InstrumentService:
    """Service for instrument/security master operations."""

    def __init__(self, db: AsyncSession, cache: CacheManager | None = None):
        self.db = db
        self.cache = cache

    async def search(
        self,
        query: str,
        security_type: str | None = None,
        limit: int = 10,
    ) -> tuple[list[InstrumentSearchResult], int]:
        """Search for instruments by name or ticker.

        Uses full-text search on name and exact/prefix match on ticker.

        Args:
            query: Search query string
            security_type: Optional filter by type (equity, etf)
            limit: Maximum results to return

        Returns:
            Tuple of (results, total_count)
        """
        query = query.strip().upper()

        if not query:
            return [], 0

        # Check cache first
        if self.cache:
            cache_key = f"{query}:{security_type or 'all'}"
            cached = await self.cache.get("search", cache_key)
            if cached:
                return (
                    [InstrumentSearchResult(**r) for r in cached["results"]],
                    cached["total"],
                )

        # Build query with ranking
        # Priority: exact ticker match > prefix ticker match > name contains
        stmt = (
            select(Instrument, Listing)
            .join(Listing, Instrument.id == Listing.instrument_id)
            .where(Instrument.is_active == True)
            .where(Listing.is_primary == True)
        )

        # Filter by type if specified
        if security_type:
            stmt = stmt.where(Instrument.security_type == security_type.lower())

        # Search conditions
        stmt = stmt.where(
            or_(
                func.upper(Listing.ticker) == query,
                func.upper(Listing.ticker).startswith(query),
                Instrument.name.ilike(f"%{query}%"),
            )
        )

        # Execute
        result = await self.db.execute(stmt.limit(limit * 2))
        rows = result.all()

        # Score and rank results
        results = []
        for instrument, listing in rows:
            ticker = listing.ticker.upper()

            # Calculate match score
            if ticker == query:
                score = 1.0
            elif ticker.startswith(query):
                score = 0.8
            else:
                score = 0.5

            results.append(
                InstrumentSearchResult(
                    id=instrument.id,
                    ticker=listing.ticker,
                    name=instrument.name,
                    exchange=listing.exchange,
                    security_type=instrument.security_type,
                    sector=instrument.sector,
                    match_score=score,
                )
            )

        # Sort by score descending
        results.sort(key=lambda r: r.match_score, reverse=True)
        results = results[:limit]

        # Cache results
        if self.cache and results:
            await self.cache.set(
                "search",
                cache_key,
                value={"results": [r.model_dump() for r in results], "total": len(results)},
                ttl=settings.cache_search_ttl,
            )

        return results, len(results)

    async def get_by_id(self, instrument_id: UUID) -> InstrumentProfile:
        """Get instrument by ID with listings.

        Args:
            instrument_id: Instrument UUID

        Returns:
            InstrumentProfile

        Raises:
            NotFoundError: If instrument not found
        """
        stmt = (
            select(Instrument)
            .where(Instrument.id == instrument_id)
            .options(selectinload(Instrument.listings))
        )

        result = await self.db.execute(stmt)
        instrument = result.scalar_one_or_none()

        if not instrument:
            raise NotFoundError("Instrument", str(instrument_id))

        return InstrumentProfile(
            id=instrument.id,
            name=instrument.name,
            short_name=instrument.short_name,
            security_type=instrument.security_type,
            sector=instrument.sector,
            industry=instrument.industry,
            cik=instrument.cik,
            listings=[
                ListingInfo(
                    exchange=listing.exchange,
                    ticker=listing.ticker,
                    is_primary=listing.is_primary,
                )
                for listing in instrument.listings
            ],
            is_active=instrument.is_active,
        )

    async def get_by_ticker(self, ticker: str) -> InstrumentSearchResult:
        """Get instrument by ticker symbol.

        Args:
            ticker: Ticker symbol (e.g., "AAPL")

        Returns:
            InstrumentSearchResult

        Raises:
            NotFoundError: If ticker not found
        """
        ticker = ticker.strip().upper()

        stmt = (
            select(Instrument, Listing)
            .join(Listing, Instrument.id == Listing.instrument_id)
            .where(Instrument.is_active == True)
            .where(func.upper(Listing.ticker) == ticker)
        )

        result = await self.db.execute(stmt)
        row = result.first()

        if not row:
            raise NotFoundError("Ticker", ticker)

        instrument, listing = row

        return InstrumentSearchResult(
            id=instrument.id,
            ticker=listing.ticker,
            name=instrument.name,
            exchange=listing.exchange,
            security_type=instrument.security_type,
            sector=instrument.sector,
            match_score=1.0,
        )

    async def get_cik_for_ticker(self, ticker: str) -> str | None:
        """Get CIK for a ticker.

        Args:
            ticker: Ticker symbol

        Returns:
            CIK string or None if not found
        """
        ticker = ticker.strip().upper()

        stmt = (
            select(Instrument.cik)
            .join(Listing, Instrument.id == Listing.instrument_id)
            .where(func.upper(Listing.ticker) == ticker)
        )

        result = await self.db.execute(stmt)
        cik = result.scalar_one_or_none()

        return cik
