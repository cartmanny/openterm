"""Seed the database with initial data from SEC ticker list."""
import asyncio
import httpx
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.database import async_session_maker
from app.core.config import settings
from app.models.instrument import Instrument, Listing
from app.models.watchlist import Watchlist


async def load_sec_tickers():
    """Load company tickers from SEC EDGAR."""
    print("Fetching SEC company tickers...")

    url = "https://www.sec.gov/files/company_tickers.json"
    headers = {"User-Agent": settings.sec_user_agent}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()

    print(f"Found {len(data)} companies")
    return data


async def seed_instruments(session, tickers_data):
    """Insert instruments and listings."""
    now = datetime.now(timezone.utc)
    count = 0

    for _, company in tickers_data.items():
        ticker = company.get("ticker", "")
        if not ticker:
            continue

        cik = str(company.get("cik_str", "")).zfill(10)
        name = company.get("title", "")

        # Insert instrument
        instrument_stmt = insert(Instrument).values(
            cik=cik,
            name=name,
            security_type="equity",
            is_active=True,
            source="sec_edgar",
            source_id=cik,
            asof=now,
            ingested_at=now,
            updated_at=now,
        )
        instrument_stmt = instrument_stmt.on_conflict_do_nothing(
            index_elements=["cik"]
        ).returning(Instrument.id)

        result = await session.execute(instrument_stmt)
        instrument_row = result.first()

        if instrument_row:
            instrument_id = instrument_row[0]

            # Insert listing
            listing_stmt = insert(Listing).values(
                instrument_id=instrument_id,
                exchange="US",
                ticker=ticker.upper(),
                is_primary=True,
                is_active=True,
                source="sec_edgar",
                source_id=cik,
                asof=now,
                ingested_at=now,
                updated_at=now,
            )
            listing_stmt = listing_stmt.on_conflict_do_nothing()
            await session.execute(listing_stmt)

            count += 1

        if count % 1000 == 0:
            print(f"  Processed {count} instruments...")
            await session.commit()

    await session.commit()
    print(f"Inserted {count} instruments")


async def create_default_watchlist(session):
    """Create default watchlist if not exists."""
    stmt = select(Watchlist).where(Watchlist.is_default == True)
    result = await session.execute(stmt)

    if not result.scalar_one_or_none():
        watchlist = Watchlist(name="Default", is_default=True)
        session.add(watchlist)
        await session.commit()
        print("Created default watchlist")


async def main():
    """Main seed function."""
    print("Starting database seed...")

    async with async_session_maker() as session:
        # Load SEC tickers
        tickers_data = await load_sec_tickers()

        # Seed instruments
        await seed_instruments(session, tickers_data)

        # Create default watchlist
        await create_default_watchlist(session)

    print("Seed completed!")


if __name__ == "__main__":
    asyncio.run(main())
