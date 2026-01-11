"""Watchlist service for managing user watchlists."""
from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.models.instrument import Instrument, Listing
from app.models.price import DailyPrice
from app.models.watchlist import Watchlist, WatchlistItem
from app.schemas.watchlist import WatchlistData, WatchlistItemResponse


class WatchlistService:
    """Service for watchlist operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_default(self) -> Watchlist:
        """Get or create the default watchlist.

        For MVP, there's a single default watchlist with no user auth.
        """
        stmt = select(Watchlist).where(Watchlist.is_default == True)
        result = await self.db.execute(stmt)
        watchlist = result.scalar_one_or_none()

        if not watchlist:
            watchlist = Watchlist(
                name="Default",
                is_default=True,
            )
            self.db.add(watchlist)
            await self.db.commit()
            await self.db.refresh(watchlist)

        return watchlist

    async def get_default_with_items(self) -> WatchlistData:
        """Get default watchlist with items and current prices.

        Returns:
            WatchlistData with items including latest prices
        """
        watchlist = await self.get_or_create_default()

        # Get items with instrument and price data
        stmt = (
            select(WatchlistItem, Instrument, Listing)
            .join(Instrument, WatchlistItem.instrument_id == Instrument.id)
            .join(Listing, Instrument.id == Listing.instrument_id)
            .where(WatchlistItem.watchlist_id == watchlist.id)
            .where(Listing.is_primary == True)
            .order_by(WatchlistItem.sort_order, WatchlistItem.added_at)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items = []
        for item, instrument, listing in rows:
            # Get latest price
            price_stmt = (
                select(DailyPrice)
                .where(DailyPrice.instrument_id == instrument.id)
                .order_by(DailyPrice.trade_date.desc())
                .limit(2)
            )
            price_result = await self.db.execute(price_stmt)
            prices = list(price_result.scalars().all())

            price = None
            change = None
            change_pct = None

            if prices:
                latest = prices[0]
                price = float(latest.close)

                if len(prices) > 1:
                    prev = prices[1]
                    change = round(float(latest.close) - float(prev.close), 2)
                    change_pct = round(change / float(prev.close), 4) if prev.close else None

            items.append(
                WatchlistItemResponse(
                    instrument_id=instrument.id,
                    ticker=listing.ticker,
                    name=instrument.name,
                    price=price,
                    change=change,
                    change_percent=change_pct,
                    added_at=item.added_at,
                )
            )

        return WatchlistData(
            id=watchlist.id,
            name=watchlist.name,
            items=items,
            item_count=len(items),
        )

    async def add_item(
        self,
        watchlist_id: UUID,
        ticker: str | None = None,
        instrument_id: UUID | None = None,
    ) -> WatchlistItemResponse:
        """Add item to watchlist.

        Args:
            watchlist_id: Watchlist UUID
            ticker: Ticker symbol (resolved to instrument_id)
            instrument_id: Direct instrument UUID

        Returns:
            WatchlistItemResponse

        Raises:
            ValidationError: If neither ticker nor instrument_id provided
            NotFoundError: If ticker or instrument not found
        """
        if not ticker and not instrument_id:
            raise ValidationError("Either ticker or instrument_id required")

        # Resolve ticker to instrument_id
        if ticker and not instrument_id:
            stmt = (
                select(Instrument.id)
                .join(Listing)
                .where(func.upper(Listing.ticker) == ticker.upper())
            )
            result = await self.db.execute(stmt)
            instrument_id = result.scalar_one_or_none()

            if not instrument_id:
                raise NotFoundError("Ticker", ticker)

        # Get instrument details
        stmt = (
            select(Instrument, Listing)
            .join(Listing)
            .where(Instrument.id == instrument_id)
            .where(Listing.is_primary == True)
        )
        result = await self.db.execute(stmt)
        row = result.first()

        if not row:
            raise NotFoundError("Instrument", str(instrument_id))

        instrument, listing = row

        # Check if already in watchlist
        stmt = (
            select(WatchlistItem)
            .where(WatchlistItem.watchlist_id == watchlist_id)
            .where(WatchlistItem.instrument_id == instrument_id)
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            raise ValidationError(f"{listing.ticker} is already in the watchlist")

        # Get max sort order
        stmt = (
            select(func.max(WatchlistItem.sort_order))
            .where(WatchlistItem.watchlist_id == watchlist_id)
        )
        result = await self.db.execute(stmt)
        max_order = result.scalar_one() or 0

        # Create item
        item = WatchlistItem(
            watchlist_id=watchlist_id,
            instrument_id=instrument_id,
            sort_order=max_order + 1,
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)

        return WatchlistItemResponse(
            instrument_id=instrument.id,
            ticker=listing.ticker,
            name=instrument.name,
            added_at=item.added_at,
        )

    async def remove_item(
        self,
        watchlist_id: UUID,
        instrument_id: UUID,
    ) -> None:
        """Remove item from watchlist.

        Args:
            watchlist_id: Watchlist UUID
            instrument_id: Instrument UUID to remove

        Raises:
            NotFoundError: If item not found
        """
        stmt = delete(WatchlistItem).where(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.instrument_id == instrument_id,
        )
        result = await self.db.execute(stmt)

        if result.rowcount == 0:
            raise NotFoundError("Watchlist item", str(instrument_id))

        await self.db.commit()
