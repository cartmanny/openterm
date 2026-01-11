"""Fundamentals service for financial data."""
import time
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.yahoo import YahooFinanceAdapter
from app.core.config import settings
from app.core.errors import NotFoundError
from app.core.redis import CacheManager
from app.core.resilience import source_registry
from app.models.fundamentals import Fundamentals
from app.models.instrument import Instrument, Listing
from app.schemas.common import ResponseMeta
from app.schemas.fundamentals import (
    BalanceSheetMetrics,
    DividendMetrics,
    FundamentalsSnapshot,
    IncomeMetrics,
    LeverageMetrics,
    MarginMetrics,
    ReturnMetrics,
    ValuationMetrics,
)


class FundamentalsService:
    """Service for fundamentals data operations."""

    def __init__(self, db: AsyncSession, cache: CacheManager | None = None):
        self.db = db
        self.cache = cache
        self.yahoo = YahooFinanceAdapter()

    async def get_fundamentals(
        self,
        instrument_id: UUID,
        period_type: str = "ttm",
    ) -> tuple[FundamentalsSnapshot, ResponseMeta]:
        """Get fundamentals snapshot for instrument.

        Args:
            instrument_id: Instrument UUID
            period_type: ttm, annual, or quarterly

        Returns:
            Tuple of (FundamentalsSnapshot, ResponseMeta)
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

        # Check cache
        if self.cache:
            cached = await self.cache.get("fundies", f"{instrument_id}:{period_type}")
            if cached:
                return (
                    FundamentalsSnapshot(**cached["data"]),
                    ResponseMeta(**cached["meta"]),
                )

        # Check database for recent data
        db_fundies = await self._get_from_db(instrument_id, period_type)

        source = "database"
        quality_flags: list[str] = []

        if not db_fundies or self._data_is_stale(db_fundies):
            # Fetch from Yahoo if enabled and circuit is closed
            if settings.enable_yahoo and source_registry.is_available("yahoo_finance"):
                start_time = time.time()
                try:
                    yahoo_data = await self.yahoo.get_fundamentals(ticker)
                    latency_ms = (time.time() - start_time) * 1000
                    source_registry.record_request("yahoo_finance", latency_ms, success=True)
                    if yahoo_data:
                        # Store in database
                        await self._store_fundamentals(instrument_id, yahoo_data, period_type)
                        db_fundies = await self._get_from_db(instrument_id, period_type)
                        source = "yahoo_finance"
                except Exception:
                    latency_ms = (time.time() - start_time) * 1000
                    source_registry.record_request("yahoo_finance", latency_ms, success=False)
                    if not db_fundies:
                        raise NotFoundError("Fundamentals", ticker)
                    quality_flags.append("stale_data")
            elif not db_fundies:
                # Yahoo disabled and no cached data
                raise NotFoundError("Fundamentals", ticker)
            else:
                quality_flags.append("yahoo_disabled")

        if not db_fundies:
            raise NotFoundError("Fundamentals", ticker)

        # Convert to response format
        snapshot = FundamentalsSnapshot(
            instrument_id=instrument_id,
            ticker=ticker,
            period_type=period_type,
            period_end=db_fundies.period_end,
            valuation=ValuationMetrics(
                market_cap=db_fundies.market_cap,
                enterprise_value=db_fundies.enterprise_value,
                pe_trailing=float(db_fundies.pe_trailing) if db_fundies.pe_trailing else None,
                pe_forward=float(db_fundies.pe_forward) if db_fundies.pe_forward else None,
                peg_ratio=float(db_fundies.peg_ratio) if db_fundies.peg_ratio else None,
                price_to_book=float(db_fundies.price_to_book) if db_fundies.price_to_book else None,
                price_to_sales=float(db_fundies.price_to_sales) if db_fundies.price_to_sales else None,
                ev_to_ebitda=float(db_fundies.ev_to_ebitda) if db_fundies.ev_to_ebitda else None,
            ),
            income=IncomeMetrics(
                revenue=db_fundies.revenue,
                gross_profit=db_fundies.gross_profit,
                operating_income=db_fundies.operating_income,
                net_income=db_fundies.net_income,
                ebitda=db_fundies.ebitda,
                eps=float(db_fundies.eps) if db_fundies.eps else None,
                eps_diluted=float(db_fundies.eps_diluted) if db_fundies.eps_diluted else None,
            ),
            margins=MarginMetrics(
                gross_margin=float(db_fundies.gross_margin) if db_fundies.gross_margin else None,
                operating_margin=float(db_fundies.operating_margin) if db_fundies.operating_margin else None,
                profit_margin=float(db_fundies.profit_margin) if db_fundies.profit_margin else None,
            ),
            balance_sheet=BalanceSheetMetrics(
                total_assets=db_fundies.total_assets,
                total_liabilities=db_fundies.total_liabilities,
                total_equity=db_fundies.total_equity,
                total_debt=db_fundies.total_debt,
                cash=db_fundies.cash,
            ),
            returns=ReturnMetrics(
                roe=float(db_fundies.roe) if db_fundies.roe else None,
                roa=float(db_fundies.roa) if db_fundies.roa else None,
                roic=float(db_fundies.roic) if db_fundies.roic else None,
            ),
            leverage=LeverageMetrics(
                debt_to_equity=float(db_fundies.debt_to_equity) if db_fundies.debt_to_equity else None,
                debt_to_ebitda=float(db_fundies.debt_to_ebitda) if db_fundies.debt_to_ebitda else None,
                current_ratio=float(db_fundies.current_ratio) if db_fundies.current_ratio else None,
                quick_ratio=float(db_fundies.quick_ratio) if db_fundies.quick_ratio else None,
            ),
            dividend=DividendMetrics(
                dividend_yield=float(db_fundies.dividend_yield) if db_fundies.dividend_yield else None,
                payout_ratio=float(db_fundies.payout_ratio) if db_fundies.payout_ratio else None,
            ),
        )

        meta = ResponseMeta(
            source=source,
            asof=db_fundies.asof,
            freshness="quarterly",
            quality_flags=quality_flags,
        )

        # Cache result
        if self.cache:
            await self.cache.set(
                "fundies",
                f"{instrument_id}:{period_type}",
                value={"data": snapshot.model_dump(), "meta": meta.model_dump()},
                ttl=settings.cache_fundamentals_ttl,
            )

        return snapshot, meta

    async def _get_from_db(
        self, instrument_id: UUID, period_type: str
    ) -> Fundamentals | None:
        """Get latest fundamentals from database."""
        stmt = (
            select(Fundamentals)
            .where(Fundamentals.instrument_id == instrument_id)
            .where(Fundamentals.period_type == period_type)
            .order_by(Fundamentals.period_end.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _store_fundamentals(
        self, instrument_id: UUID, data: "FundamentalsData", period_type: str
    ) -> None:
        """Store fundamentals in database."""
        from app.adapters.base import FundamentalsData

        now = datetime.now(timezone.utc)
        today = date.today()

        stmt = insert(Fundamentals).values(
            instrument_id=instrument_id,
            period_type=period_type,
            period_end=today,
            market_cap=data.market_cap,
            enterprise_value=data.enterprise_value,
            pe_trailing=data.pe_trailing,
            pe_forward=data.pe_forward,
            peg_ratio=data.peg_ratio,
            price_to_book=data.price_to_book,
            price_to_sales=data.price_to_sales,
            ev_to_ebitda=data.ev_to_ebitda,
            revenue=data.revenue,
            gross_profit=data.gross_profit,
            operating_income=data.operating_income,
            net_income=data.net_income,
            ebitda=data.ebitda,
            eps=data.eps,
            gross_margin=data.gross_margin,
            operating_margin=data.operating_margin,
            profit_margin=data.profit_margin,
            roe=data.roe,
            roa=data.roa,
            debt_to_equity=data.debt_to_equity,
            current_ratio=data.current_ratio,
            dividend_yield=data.dividend_yield,
            source="yahoo_finance",
            asof=now,
            ingested_at=now,
            quality_flags=data.quality_flags,
        )

        stmt = stmt.on_conflict_do_update(
            constraint="fundamentals_instrument_id_period_type_period_end_key",
            set_={
                "market_cap": stmt.excluded.market_cap,
                "pe_trailing": stmt.excluded.pe_trailing,
                "asof": stmt.excluded.asof,
            },
        )

        await self.db.execute(stmt)
        await self.db.commit()

    def _data_is_stale(self, fundies: Fundamentals) -> bool:
        """Check if fundamentals data is stale."""
        if not fundies or not fundies.asof:
            return True

        # Consider stale if older than 1 day
        age = datetime.now(timezone.utc) - fundies.asof
        return age.days > 1
