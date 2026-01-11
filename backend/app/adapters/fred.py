"""FRED (Federal Reserve Economic Data) adapter.

Free tier: 1000 calls/day (conservative limit: 60/min)
API docs: https://fred.stlouisfed.org/docs/api/fred/
"""
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any

from app.adapters.base import BaseAdapter, InstrumentCandidate, InstrumentProfile, Bar
from app.core.config import settings
from app.core.errors import SourceError
from app.core.resilience import rate_limiter


@dataclass
class MacroObservation:
    """A single observation from a FRED series."""

    date: date
    value: float | None
    series_id: str


@dataclass
class MacroSeries:
    """A FRED economic data series."""

    series_id: str
    title: str
    units: str
    frequency: str
    observations: list[MacroObservation] = field(default_factory=list)


# Common FRED series IDs
FRED_SERIES = {
    # Inflation
    "CPI": "CPIAUCSL",  # Consumer Price Index
    "CPIYOY": "CPIAUCSL",  # CPI Year-over-Year (calculated)
    "PCE": "PCEPI",  # Personal Consumption Expenditures Price Index

    # Growth
    "GDP": "GDP",  # Gross Domestic Product
    "GDPC1": "GDPC1",  # Real GDP

    # Employment
    "UNRATE": "UNRATE",  # Unemployment Rate
    "PAYEMS": "PAYEMS",  # Total Nonfarm Payrolls
    "ICSA": "ICSA",  # Initial Jobless Claims

    # Interest Rates
    "FEDFUNDS": "FEDFUNDS",  # Federal Funds Rate
    "DFF": "DFF",  # Effective Federal Funds Rate (daily)

    # Treasury Yields
    "DGS1MO": "DGS1MO",  # 1-Month Treasury
    "DGS3MO": "DGS3MO",  # 3-Month Treasury
    "DGS6MO": "DGS6MO",  # 6-Month Treasury
    "DGS1": "DGS1",  # 1-Year Treasury
    "DGS2": "DGS2",  # 2-Year Treasury
    "DGS5": "DGS5",  # 5-Year Treasury
    "DGS10": "DGS10",  # 10-Year Treasury
    "DGS30": "DGS30",  # 30-Year Treasury

    # Spreads
    "T10Y2Y": "T10Y2Y",  # 10Y-2Y Spread
    "T10Y3M": "T10Y3M",  # 10Y-3M Spread

    # Money Supply
    "M2SL": "M2SL",  # M2 Money Stock

    # Housing
    "CSUSHPINSA": "CSUSHPINSA",  # Case-Shiller Home Price Index
    "HOUST": "HOUST",  # Housing Starts

    # Consumer
    "UMCSENT": "UMCSENT",  # Consumer Sentiment
    "RSAFS": "RSAFS",  # Retail Sales
}

# Series metadata for display
SERIES_INFO = {
    "CPIAUCSL": {"title": "Consumer Price Index", "units": "Index 1982-1984=100", "frequency": "Monthly"},
    "GDP": {"title": "Gross Domestic Product", "units": "Billions of Dollars", "frequency": "Quarterly"},
    "GDPC1": {"title": "Real GDP", "units": "Billions of Chained 2017 Dollars", "frequency": "Quarterly"},
    "UNRATE": {"title": "Unemployment Rate", "units": "Percent", "frequency": "Monthly"},
    "FEDFUNDS": {"title": "Federal Funds Rate", "units": "Percent", "frequency": "Monthly"},
    "DGS10": {"title": "10-Year Treasury Yield", "units": "Percent", "frequency": "Daily"},
    "DGS2": {"title": "2-Year Treasury Yield", "units": "Percent", "frequency": "Daily"},
    "T10Y2Y": {"title": "10Y-2Y Treasury Spread", "units": "Percent", "frequency": "Daily"},
}


class FREDAdapter(BaseAdapter):
    """FRED (Federal Reserve Economic Data) adapter."""

    BASE_URL = "https://api.stlouisfed.org/fred"

    def __init__(self) -> None:
        super().__init__()
        self._api_key = settings.fred_api_key

        # Register rate limit (conservative: 60/min when limit is 1000/day)
        rate_limiter.register("fred", 60)

    @property
    def source_name(self) -> str:
        return "fred"

    @property
    def timeout(self) -> float:
        return 15.0

    def _check_api_key(self) -> None:
        """Check if API key is configured."""
        if not self._api_key:
            raise SourceError(
                self.source_name,
                "FRED_API_KEY not configured. Get one at: https://fred.stlouisfed.org/docs/api/api_key.html",
                retryable=False,
            )

    async def get_series(
        self,
        series_id: str,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int | None = None,
    ) -> MacroSeries:
        """
        Fetch a FRED data series.

        Args:
            series_id: FRED series ID (e.g., "CPIAUCSL", "GDP", "DGS10")
            start_date: Start date for observations
            end_date: End date for observations
            limit: Maximum number of observations to return

        Returns:
            MacroSeries with observations
        """
        self._check_api_key()

        # Resolve alias to actual series ID
        actual_series_id = FRED_SERIES.get(series_id.upper(), series_id.upper())

        params: dict[str, Any] = {
            "series_id": actual_series_id,
            "api_key": self._api_key,
            "file_type": "json",
        }

        if start_date:
            params["observation_start"] = start_date.isoformat()
        if end_date:
            params["observation_end"] = end_date.isoformat()
        if limit:
            params["limit"] = limit
            params["sort_order"] = "desc"  # Get most recent first

        response = await self._request(
            "GET",
            f"{self.BASE_URL}/series/observations",
            params=params,
        )

        data = response.json()
        observations_raw = data.get("observations", [])

        # Parse observations
        observations = []
        for obs in observations_raw:
            value_str = obs.get("value", ".")
            value = None
            if value_str != ".":
                try:
                    value = float(value_str)
                except ValueError:
                    pass

            observations.append(MacroObservation(
                date=date.fromisoformat(obs["date"]),
                value=value,
                series_id=actual_series_id,
            ))

        # Sort by date ascending
        observations.sort(key=lambda x: x.date)

        # Get series metadata
        info = SERIES_INFO.get(actual_series_id, {})

        return MacroSeries(
            series_id=actual_series_id,
            title=info.get("title", actual_series_id),
            units=info.get("units", ""),
            frequency=info.get("frequency", ""),
            observations=observations,
        )

    async def get_series_info(self, series_id: str) -> dict[str, Any]:
        """Get metadata about a FRED series."""
        self._check_api_key()

        actual_series_id = FRED_SERIES.get(series_id.upper(), series_id.upper())

        params = {
            "series_id": actual_series_id,
            "api_key": self._api_key,
            "file_type": "json",
        }

        response = await self._request(
            "GET",
            f"{self.BASE_URL}/series",
            params=params,
        )

        data = response.json()
        series_list = data.get("seriess", [])

        if series_list:
            series = series_list[0]
            return {
                "series_id": series.get("id"),
                "title": series.get("title"),
                "units": series.get("units"),
                "frequency": series.get("frequency"),
                "seasonal_adjustment": series.get("seasonal_adjustment"),
                "last_updated": series.get("last_updated"),
            }

        return {}

    async def get_yield_curve(self, curve_date: date | None = None) -> dict[str, dict[str, Any]]:
        """
        Fetch US Treasury yield curve.

        Returns yields for: 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y, 30Y

        Args:
            curve_date: Specific date for the curve (default: latest)

        Returns:
            Dict mapping maturity to yield data
        """
        maturities = {
            "1M": "DGS1MO",
            "3M": "DGS3MO",
            "6M": "DGS6MO",
            "1Y": "DGS1",
            "2Y": "DGS2",
            "5Y": "DGS5",
            "10Y": "DGS10",
            "30Y": "DGS30",
        }

        curve: dict[str, dict[str, Any]] = {}
        target_date = curve_date or date.today()

        for maturity, series_id in maturities.items():
            try:
                series = await self.get_series(
                    series_id=series_id,
                    start_date=target_date - timedelta(days=7),  # Buffer for weekends/holidays
                    end_date=target_date,
                    limit=5,
                )

                # Get the most recent non-null observation
                valid_obs = [o for o in series.observations if o.value is not None]
                if valid_obs:
                    latest = valid_obs[-1]
                    curve[maturity] = {
                        "yield": latest.value,
                        "date": latest.date.isoformat(),
                    }
                else:
                    curve[maturity] = {"yield": None, "date": None}

            except Exception as e:
                curve[maturity] = {"yield": None, "date": None, "error": str(e)}

        return curve

    async def search_series(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        """
        Search for FRED series by keyword.

        Args:
            query: Search term
            limit: Maximum results

        Returns:
            List of matching series
        """
        self._check_api_key()

        params = {
            "search_text": query,
            "api_key": self._api_key,
            "file_type": "json",
            "limit": limit,
        }

        response = await self._request(
            "GET",
            f"{self.BASE_URL}/series/search",
            params=params,
        )

        data = response.json()
        series_list = data.get("seriess", [])

        return [
            {
                "series_id": s.get("id"),
                "title": s.get("title"),
                "units": s.get("units"),
                "frequency": s.get("frequency"),
                "popularity": s.get("popularity"),
            }
            for s in series_list
        ]

    # Implement abstract methods (not used for macro data, but required)
    async def search_instruments(
        self, query: str, limit: int = 10
    ) -> list[InstrumentCandidate]:
        """FRED doesn't have instruments in the traditional sense."""
        return []

    async def get_profile(self, identifier: str) -> InstrumentProfile | None:
        """FRED doesn't have instrument profiles."""
        return None

    async def get_daily_bars(
        self, ticker: str, start: date, end: date
    ) -> list[Bar]:
        """FRED doesn't have OHLCV bars."""
        return []
