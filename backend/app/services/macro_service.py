"""Macro economic data service."""
from datetime import date, datetime, timezone

from app.adapters.fred import FREDAdapter, MacroSeries
from app.core.config import settings
from app.core.errors import SourceError
from app.schemas.common import ResponseMeta
from app.schemas.macro import (
    MacroObservationSchema,
    MacroSeriesData,
    MacroSeriesResponse,
    YieldCurveData,
    YieldCurveResponse,
    YieldPoint,
    MacroSeriesInfo,
    MacroSearchResponse,
)


class MacroService:
    """Service for macro economic data operations."""

    def __init__(self) -> None:
        self.fred = FREDAdapter() if settings.fred_api_key else None

    def _check_fred_available(self) -> None:
        """Check if FRED is available."""
        if not settings.enable_fred:
            raise SourceError(
                "fred",
                "FRED integration is disabled. Set ENABLE_FRED=true to enable.",
                retryable=False,
            )
        if not self.fred:
            raise SourceError(
                "fred",
                "FRED_API_KEY not configured. Get one at: https://fred.stlouisfed.org/docs/api/api_key.html",
                retryable=False,
            )

    async def get_series(
        self,
        series_id: str,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int | None = None,
    ) -> MacroSeriesResponse:
        """
        Get a FRED macro economic data series.

        Args:
            series_id: FRED series ID or alias (e.g., "CPI", "GDP", "UNRATE")
            start_date: Start date for observations
            end_date: End date for observations
            limit: Maximum observations to return

        Returns:
            MacroSeriesResponse with data and metadata
        """
        self._check_fred_available()

        series = await self.fred.get_series(
            series_id=series_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )

        # Convert to schema
        observations = [
            MacroObservationSchema(
                date=obs.date,
                value=obs.value,
                series_id=obs.series_id,
            )
            for obs in series.observations
        ]

        data = MacroSeriesData(
            series_id=series.series_id,
            title=series.title,
            units=series.units,
            frequency=series.frequency,
            observations=observations,
        )

        # Determine asof from latest observation
        asof = None
        if observations:
            asof = datetime.combine(observations[-1].date, datetime.min.time(), tzinfo=timezone.utc)

        meta = ResponseMeta(
            source="fred",
            asof=asof,
            ingested_at=datetime.now(timezone.utc),
            freshness=self._get_freshness(series.frequency),
            quality_flags=[],
        )

        return MacroSeriesResponse(data=data, meta=meta)

    async def get_yield_curve(self) -> YieldCurveResponse:
        """
        Get current US Treasury yield curve.

        Returns yields for: 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y, 30Y
        Also calculates if curve is inverted (2Y > 10Y).
        """
        self._check_fred_available()

        curve_data = await self.fred.get_yield_curve()

        # Build yield points
        curve_points = {}
        for maturity, data in curve_data.items():
            curve_points[maturity] = YieldPoint(
                yield_value=data.get("yield"),
                date=data.get("date"),
            )

        # Calculate inversion
        y2 = curve_data.get("2Y", {}).get("yield")
        y10 = curve_data.get("10Y", {}).get("yield")

        is_inverted = False
        spread = None
        if y2 is not None and y10 is not None:
            spread = y10 - y2
            is_inverted = spread < 0

        data = YieldCurveData(
            curve=curve_points,
            is_inverted=is_inverted,
            spread_2y_10y=spread,
        )

        meta = ResponseMeta(
            source="fred",
            asof=datetime.now(timezone.utc),
            ingested_at=datetime.now(timezone.utc),
            freshness="eod",  # Treasury yields are EOD
            quality_flags=["inverted_curve"] if is_inverted else [],
        )

        return YieldCurveResponse(data=data, meta=meta)

    async def search_series(self, query: str, limit: int = 10) -> MacroSearchResponse:
        """
        Search for FRED series by keyword.

        Args:
            query: Search term
            limit: Maximum results

        Returns:
            MacroSearchResponse with matching series
        """
        self._check_fred_available()

        results = await self.fred.search_series(query, limit)

        series_list = [
            MacroSeriesInfo(
                series_id=r["series_id"],
                title=r["title"],
                units=r["units"],
                frequency=r["frequency"],
                popularity=r.get("popularity"),
            )
            for r in results
        ]

        meta = ResponseMeta(
            source="fred",
            asof=datetime.now(timezone.utc),
            ingested_at=datetime.now(timezone.utc),
            freshness="realtime",
            quality_flags=[],
        )

        return MacroSearchResponse(query=query, results=series_list, meta=meta)

    def _get_freshness(self, frequency: str) -> str:
        """Map FRED frequency to freshness indicator."""
        frequency_lower = frequency.lower()
        if "daily" in frequency_lower:
            return "eod"
        elif "weekly" in frequency_lower:
            return "weekly"
        elif "monthly" in frequency_lower:
            return "monthly"
        elif "quarterly" in frequency_lower:
            return "quarterly"
        elif "annual" in frequency_lower or "yearly" in frequency_lower:
            return "annual"
        return "delayed"
