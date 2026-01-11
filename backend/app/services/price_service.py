"""Price service for historical and quote data."""
import time
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.base import Bar as AdapterBar
from app.adapters.stooq import StooqAdapter
from app.adapters.yahoo import YahooFinanceAdapter
from app.core.config import settings
from app.core.errors import NotFoundError, SourceError
from app.core.redis import CacheManager
from app.core.resilience import source_registry
from app.models.instrument import Instrument, Listing
from app.models.price import DailyPrice
from app.schemas.price import Bar, PriceData, PriceMeta, Quote


class PriceService:
    """Service for price data operations."""

    def __init__(self, db: AsyncSession, cache: CacheManager | None = None):
        self.db = db
        self.cache = cache
        self.stooq = StooqAdapter()
        self.yahoo = YahooFinanceAdapter()

    async def get_daily_bars(
        self,
        instrument_id: UUID,
        start: date | None = None,
        end: date | None = None,
        period: str | None = None,
    ) -> tuple[PriceData, PriceMeta]:
        """Get historical daily price bars.

        Args:
            instrument_id: Instrument UUID
            start: Start date (optional if period provided)
            end: End date (default: today)
            period: Period shorthand: 1M, 3M, 6M, 1Y, 2Y, 5Y, MAX

        Returns:
            Tuple of (PriceData, PriceMeta)
        """
        # Get ticker for instrument
        stmt = (
            select(Instrument, Listing)
            .join(Listing, Instrument.id == Listing.instrument_id)
            .where(Instrument.id == instrument_id)
            .where(Listing.is_primary == True)
        )
        result = await self.db.execute(stmt)
        row = result.first()

        if not row:
            raise NotFoundError("Instrument", str(instrument_id))

        instrument, listing = row
        ticker = listing.ticker

        # Resolve period to date range
        end = end or date.today()
        if period:
            start = self._period_to_start_date(period, end)
        elif not start:
            start = end - timedelta(days=365)  # Default 1 year

        # Check cache
        cache_key = f"{instrument_id}:{start}:{end}"
        if self.cache:
            cached = await self.cache.get("bars", cache_key)
            if cached:
                return (
                    PriceData(**cached["data"]),
                    PriceMeta(**cached["meta"]),
                )

        # Check database for existing data
        db_bars = await self._get_bars_from_db(instrument_id, start, end)

        # Determine if we need to fetch more data
        source = "database"
        freshness = "eod"
        quality_flags: list[str] = []

        if not db_bars or self._data_is_stale(db_bars, end):
            # Fetch from external source
            try:
                fetched_bars, source = await self._fetch_from_source(ticker, start, end)

                if fetched_bars:
                    # Store in database
                    await self._store_bars(instrument_id, fetched_bars, source)
                    db_bars = await self._get_bars_from_db(instrument_id, start, end)

            except SourceError as e:
                if db_bars:
                    # Use stale data with warning
                    quality_flags.append("stale_data")
                    freshness = "stale"
                else:
                    raise

        # Convert to response format
        bars = [
            Bar(
                date=b.trade_date,
                open=float(b.open) if b.open else None,
                high=float(b.high) if b.high else None,
                low=float(b.low) if b.low else None,
                close=float(b.close),
                adj_close=float(b.adj_close) if b.adj_close else None,
                volume=b.volume,
            )
            for b in db_bars
        ]

        data = PriceData(
            instrument_id=instrument_id,
            ticker=ticker,
            currency="USD",
            bars=bars,
        )

        meta = PriceMeta(
            source=source,
            asof=datetime.now(timezone.utc),
            freshness=freshness,
            bar_count=len(bars),
            quality_flags=quality_flags,
        )

        # Cache result
        if self.cache and bars:
            await self.cache.set(
                "bars",
                cache_key,
                value={"data": data.model_dump(), "meta": meta.model_dump()},
                ttl=settings.cache_bars_ttl,
            )

        return data, meta

    async def get_quote(self, instrument_id: UUID) -> tuple[Quote, PriceMeta]:
        """Get latest quote for instrument.

        Args:
            instrument_id: Instrument UUID

        Returns:
            Tuple of (Quote, PriceMeta)
        """
        # Get recent bars
        end = date.today()
        start = end - timedelta(days=5)

        data, meta = await self.get_daily_bars(instrument_id, start, end)

        if not data.bars:
            raise NotFoundError("Quote", str(instrument_id))

        # Get latest bar
        latest = data.bars[-1]
        prev = data.bars[-2] if len(data.bars) > 1 else latest

        # Calculate change
        change = latest.close - (prev.close if prev else latest.close)
        change_pct = change / prev.close if prev and prev.close else 0.0

        quote = Quote(
            instrument_id=instrument_id,
            ticker=data.ticker,
            price=latest.close,
            change=round(change, 2),
            change_percent=round(change_pct, 4),
            open=latest.open,
            high=latest.high,
            low=latest.low,
            prev_close=prev.close if prev else None,
            volume=latest.volume,
            trade_date=latest.date,
            currency="USD",
        )

        return quote, meta

    async def _get_bars_from_db(
        self, instrument_id: UUID, start: date, end: date
    ) -> list[DailyPrice]:
        """Get bars from database."""
        stmt = (
            select(DailyPrice)
            .where(DailyPrice.instrument_id == instrument_id)
            .where(DailyPrice.trade_date >= start)
            .where(DailyPrice.trade_date <= end)
            .order_by(DailyPrice.trade_date)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _fetch_from_source(
        self, ticker: str, start: date, end: date
    ) -> tuple[list[AdapterBar], str]:
        """Fetch bars from external source with fallback.

        Respects feature flags and records metrics for each source.
        """
        # Try Stooq first (primary) if enabled and circuit is closed
        if settings.enable_stooq and source_registry.is_available("stooq"):
            start_time = time.time()
            try:
                bars = await self.stooq.get_daily_bars(ticker, start, end)
                latency_ms = (time.time() - start_time) * 1000
                source_registry.record_request("stooq", latency_ms, success=True)
                if bars:
                    return bars, "stooq"
            except Exception:
                latency_ms = (time.time() - start_time) * 1000
                source_registry.record_request("stooq", latency_ms, success=False)

        # Fallback to Yahoo if enabled and circuit is closed
        if settings.enable_yahoo and source_registry.is_available("yahoo_finance"):
            start_time = time.time()
            try:
                bars = await self.yahoo.get_daily_bars(ticker, start, end)
                latency_ms = (time.time() - start_time) * 1000
                source_registry.record_request("yahoo_finance", latency_ms, success=True)
                if bars:
                    return bars, "yahoo_finance"
            except Exception:
                latency_ms = (time.time() - start_time) * 1000
                source_registry.record_request("yahoo_finance", latency_ms, success=False)

        return [], "none"

    async def _store_bars(
        self, instrument_id: UUID, bars: list[AdapterBar], source: str
    ) -> None:
        """Store bars in database using upsert."""
        if not bars:
            return

        now = datetime.now(timezone.utc)

        for bar in bars:
            stmt = insert(DailyPrice).values(
                instrument_id=instrument_id,
                trade_date=bar.date,
                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,
                adj_close=bar.adj_close,
                volume=bar.volume,
                currency="USD",
                source=source,
                asof=now,
                ingested_at=now,
                quality_flags=[],
            )

            stmt = stmt.on_conflict_do_update(
                index_elements=["instrument_id", "trade_date"],
                set_={
                    "open": stmt.excluded.open,
                    "high": stmt.excluded.high,
                    "low": stmt.excluded.low,
                    "close": stmt.excluded.close,
                    "adj_close": stmt.excluded.adj_close,
                    "volume": stmt.excluded.volume,
                    "source": stmt.excluded.source,
                    "asof": stmt.excluded.asof,
                },
            )

            await self.db.execute(stmt)

        await self.db.commit()

    def _data_is_stale(self, bars: list[DailyPrice], end: date) -> bool:
        """Check if data is stale and needs refresh."""
        if not bars:
            return True

        latest = max(b.trade_date for b in bars)

        # Consider data stale if latest bar is more than 2 days old
        # (accounting for weekends)
        days_old = (end - latest).days
        return days_old > 3

    def _period_to_start_date(self, period: str, end: date) -> date:
        """Convert period shorthand to start date."""
        period = period.upper()
        periods = {
            "1M": timedelta(days=30),
            "3M": timedelta(days=90),
            "6M": timedelta(days=180),
            "1Y": timedelta(days=365),
            "2Y": timedelta(days=730),
            "5Y": timedelta(days=1825),
            "MAX": timedelta(days=365 * 20),
        }
        delta = periods.get(period, timedelta(days=365))
        return end - delta
