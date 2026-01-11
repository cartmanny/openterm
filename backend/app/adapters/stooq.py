"""Stooq adapter for historical price data."""
import csv
from datetime import date
from io import StringIO

from app.adapters.base import Bar, BaseAdapter, InstrumentCandidate, InstrumentProfile
from app.core.config import settings
from app.core.resilience import rate_limiter


class StooqAdapter(BaseAdapter):
    """Adapter for Stooq historical price data.

    Stooq provides free EOD historical data for US equities and ETFs.
    Data format: CSV with Date,Open,High,Low,Close,Volume columns.

    Endpoint: https://stooq.com/q/d/l/?s={ticker}.us&d1={start}&d2={end}&i=d

    Limitations:
    - EOD only (no intraday)
    - Rate limits unknown (conservative: 60/min)
    - Volume may be missing for some securities
    """

    BASE_URL = "https://stooq.com/q/d/l/"

    def __init__(self) -> None:
        super().__init__()
        rate_limiter.register(self.source_name, settings.stooq_rpm)

    @property
    def source_name(self) -> str:
        return "stooq"

    async def search_instruments(
        self, query: str, limit: int = 10
    ) -> list[InstrumentCandidate]:
        """Stooq doesn't have a search API. Return empty."""
        return []

    async def get_profile(self, identifier: str) -> InstrumentProfile | None:
        """Stooq doesn't have profile data. Return None."""
        return None

    async def get_daily_bars(
        self, ticker: str, start: date, end: date
    ) -> list[Bar]:
        """Fetch daily OHLCV bars from Stooq.

        Args:
            ticker: Stock ticker (e.g., "AAPL")
            start: Start date
            end: End date

        Returns:
            List of Bar objects sorted by date ascending
        """
        # Stooq format: ticker.us for US stocks
        stooq_ticker = f"{ticker.lower()}.us"

        # Date format: YYYYMMDD
        d1 = start.strftime("%Y%m%d")
        d2 = end.strftime("%Y%m%d")

        url = f"{self.BASE_URL}?s={stooq_ticker}&d1={d1}&d2={d2}&i=d"

        response = await self._request("GET", url)
        text = response.text

        return self._parse_csv(text)

    def _parse_csv(self, text: str) -> list[Bar]:
        """Parse Stooq CSV response into Bar objects."""
        bars: list[Bar] = []

        # Check for empty or error response
        if not text or "No data" in text or len(text) < 50:
            return bars

        reader = csv.DictReader(StringIO(text))

        for row in reader:
            try:
                # Stooq CSV columns: Date,Open,High,Low,Close,Volume
                bar_date = date.fromisoformat(row["Date"])

                bar = Bar(
                    date=bar_date,
                    open=self._parse_float(row.get("Open")),
                    high=self._parse_float(row.get("High")),
                    low=self._parse_float(row.get("Low")),
                    close=self._parse_float(row.get("Close")) or 0.0,
                    volume=self._parse_int(row.get("Volume")),
                )

                # Use close as adj_close (Stooq doesn't provide adjusted)
                bar.adj_close = bar.close

                bars.append(bar)

            except (KeyError, ValueError):
                # Skip malformed rows
                continue

        # Sort by date ascending
        bars.sort(key=lambda b: b.date)
        return bars

    def _parse_float(self, value: str | None) -> float | None:
        """Parse string to float, handling empty/invalid."""
        if not value or value.strip() == "":
            return None
        try:
            return float(value)
        except ValueError:
            return None

    def _parse_int(self, value: str | None) -> int | None:
        """Parse string to int, handling empty/invalid."""
        if not value or value.strip() == "":
            return None
        try:
            return int(float(value))
        except ValueError:
            return None
