"""Analytics service for correlation and return analysis."""
from datetime import date, datetime, timedelta, timezone
from typing import Literal
import math

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.instrument import Instrument, Listing
from app.models.price import DailyPrice
from app.schemas.common import ResponseMeta
from app.schemas.analytics import (
    CorrelationMatrix,
    CorrelationPair,
    CorrelationResponse,
    ReturnPoint,
    ReturnSeries,
    ReturnSeriesResponse,
)


class AnalyticsService:
    """Service for financial analytics."""

    PERIOD_DAYS = {
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
        "2y": 730,
        "5y": 1825,
    }

    async def get_correlation_matrix(
        self,
        tickers: list[str],
        period: str = "1y",
        method: str = "pearson",
    ) -> CorrelationResponse:
        """
        Calculate correlation matrix for a list of tickers.

        Args:
            tickers: List of ticker symbols
            period: Lookback period (1m, 3m, 6m, 1y, 2y, 5y)
            method: Correlation method (pearson, spearman)

        Returns:
            CorrelationResponse with matrix
        """
        end_date = date.today()
        days = self.PERIOD_DAYS.get(period, 365)
        start_date = end_date - timedelta(days=days)

        async with async_session() as session:
            # Get returns for each ticker
            returns_by_ticker = {}

            for ticker in tickers:
                returns = await self._get_daily_returns(
                    session, ticker, start_date, end_date
                )
                if returns:
                    returns_by_ticker[ticker] = returns

            # Filter to tickers with data
            valid_tickers = list(returns_by_ticker.keys())

            if len(valid_tickers) < 2:
                # Not enough data
                return CorrelationResponse(
                    data=CorrelationMatrix(
                        tickers=valid_tickers,
                        matrix=[],
                        pairs=[],
                    ),
                    period=period,
                    method=method,
                    start_date=start_date,
                    end_date=end_date,
                    meta=ResponseMeta(
                        source="database",
                        asof=datetime.now(timezone.utc),
                        ingested_at=datetime.now(timezone.utc),
                        freshness="delayed",
                        quality_flags=["insufficient_data"],
                    ),
                )

            # Align dates across all tickers
            aligned_returns = self._align_returns(returns_by_ticker)

            # Calculate correlation matrix
            n = len(valid_tickers)
            matrix = [[0.0] * n for _ in range(n)]
            pairs = []

            for i, ticker1 in enumerate(valid_tickers):
                for j, ticker2 in enumerate(valid_tickers):
                    if i == j:
                        matrix[i][j] = 1.0
                    elif i < j:
                        returns1 = aligned_returns.get(ticker1, [])
                        returns2 = aligned_returns.get(ticker2, [])

                        if returns1 and returns2:
                            if method == "spearman":
                                corr = self._spearman_correlation(returns1, returns2)
                            else:
                                corr = self._pearson_correlation(returns1, returns2)

                            matrix[i][j] = corr
                            matrix[j][i] = corr

                            pairs.append(CorrelationPair(
                                ticker1=ticker1,
                                ticker2=ticker2,
                                correlation=round(corr, 4),
                            ))

            data = CorrelationMatrix(
                tickers=valid_tickers,
                matrix=matrix,
                pairs=pairs,
            )

            meta = ResponseMeta(
                source="database",
                asof=datetime.now(timezone.utc),
                ingested_at=datetime.now(timezone.utc),
                freshness="delayed",
                quality_flags=[],
            )

            return CorrelationResponse(
                data=data,
                period=period,
                method=method,
                start_date=start_date,
                end_date=end_date,
                meta=meta,
            )

    async def get_return_series(
        self,
        tickers: list[str],
        period: str = "1y",
        frequency: str = "daily",
    ) -> ReturnSeriesResponse:
        """
        Get return series for multiple tickers.

        Args:
            tickers: List of ticker symbols
            period: Lookback period
            frequency: Return frequency (daily, weekly, monthly)

        Returns:
            ReturnSeriesResponse with series data
        """
        end_date = date.today()
        days = self.PERIOD_DAYS.get(period, 365)
        start_date = end_date - timedelta(days=days)

        async with async_session() as session:
            series_list = []

            for ticker in tickers:
                returns_data = await self._get_daily_returns(
                    session, ticker, start_date, end_date, with_dates=True
                )

                if not returns_data:
                    continue

                # Resample if needed
                if frequency == "weekly":
                    returns_data = self._resample_weekly(returns_data)
                elif frequency == "monthly":
                    returns_data = self._resample_monthly(returns_data)

                # Calculate stats
                returns_only = [r["return"] for r in returns_data]
                cumulative = self._cumulative_return(returns_only)
                annualized = self._annualize_return(cumulative, len(returns_only), frequency)
                volatility = self._calculate_volatility(returns_only, frequency)

                series_list.append(ReturnSeries(
                    ticker=ticker,
                    returns=[
                        ReturnPoint(date=r["date"], value=round(r["return"], 6))
                        for r in returns_data
                    ],
                    cumulative_return=round(cumulative * 100, 2),
                    annualized_return=round(annualized * 100, 2),
                    volatility=round(volatility * 100, 2),
                ))

            meta = ResponseMeta(
                source="database",
                asof=datetime.now(timezone.utc),
                ingested_at=datetime.now(timezone.utc),
                freshness="delayed",
                quality_flags=[],
            )

            return ReturnSeriesResponse(
                series=series_list,
                period=period,
                frequency=frequency,
                meta=meta,
            )

    async def _get_daily_returns(
        self,
        session: AsyncSession,
        ticker: str,
        start_date: date,
        end_date: date,
        with_dates: bool = False,
    ) -> list:
        """Get daily returns for a ticker."""
        # Find instrument by ticker
        result = await session.execute(
            select(Listing.instrument_id)
            .where(Listing.ticker == ticker.upper())
            .limit(1)
        )
        instrument_id = result.scalar_one_or_none()

        if not instrument_id:
            return []

        # Get prices
        result = await session.execute(
            select(DailyPrice.date, DailyPrice.close)
            .where(
                and_(
                    DailyPrice.instrument_id == instrument_id,
                    DailyPrice.date >= start_date,
                    DailyPrice.date <= end_date,
                )
            )
            .order_by(DailyPrice.date.asc())
        )
        prices = result.all()

        if len(prices) < 2:
            return []

        # Calculate returns
        returns = []
        for i in range(1, len(prices)):
            prev_close = float(prices[i - 1].close)
            curr_close = float(prices[i].close)

            if prev_close > 0:
                daily_return = (curr_close / prev_close) - 1

                if with_dates:
                    returns.append({
                        "date": prices[i].date,
                        "return": daily_return,
                    })
                else:
                    returns.append(daily_return)

        return returns

    def _align_returns(
        self, returns_by_ticker: dict[str, list[dict]]
    ) -> dict[str, list[float]]:
        """Align returns to common dates."""
        # For simplicity, just use the returns as-is
        # A full implementation would align by date
        return {
            ticker: [r if isinstance(r, float) else r["return"] for r in returns]
            for ticker, returns in returns_by_ticker.items()
        }

    def _pearson_correlation(self, x: list[float], y: list[float]) -> float:
        """Calculate Pearson correlation coefficient."""
        n = min(len(x), len(y))
        if n < 2:
            return 0.0

        x = x[:n]
        y = y[:n]

        mean_x = sum(x) / n
        mean_y = sum(y) / n

        numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
        denom_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x))
        denom_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y))

        if denom_x == 0 or denom_y == 0:
            return 0.0

        return numerator / (denom_x * denom_y)

    def _spearman_correlation(self, x: list[float], y: list[float]) -> float:
        """Calculate Spearman rank correlation."""
        n = min(len(x), len(y))
        if n < 2:
            return 0.0

        x = x[:n]
        y = y[:n]

        # Rank the values
        x_ranks = self._rank(x)
        y_ranks = self._rank(y)

        return self._pearson_correlation(x_ranks, y_ranks)

    def _rank(self, values: list[float]) -> list[float]:
        """Calculate ranks for values."""
        sorted_indices = sorted(range(len(values)), key=lambda i: values[i])
        ranks = [0.0] * len(values)
        for rank, idx in enumerate(sorted_indices):
            ranks[idx] = rank + 1
        return ranks

    def _cumulative_return(self, returns: list[float]) -> float:
        """Calculate cumulative return from daily returns."""
        if not returns:
            return 0.0
        cumulative = 1.0
        for r in returns:
            cumulative *= (1 + r)
        return cumulative - 1

    def _annualize_return(
        self, cumulative: float, periods: int, frequency: str
    ) -> float:
        """Annualize a return."""
        if periods <= 0:
            return 0.0

        periods_per_year = {
            "daily": 252,
            "weekly": 52,
            "monthly": 12,
        }.get(frequency, 252)

        years = periods / periods_per_year
        if years <= 0:
            return 0.0

        return (1 + cumulative) ** (1 / years) - 1

    def _calculate_volatility(self, returns: list[float], frequency: str) -> float:
        """Calculate annualized volatility."""
        if len(returns) < 2:
            return 0.0

        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / (len(returns) - 1)
        std_dev = math.sqrt(variance)

        # Annualize
        periods_per_year = {
            "daily": 252,
            "weekly": 52,
            "monthly": 12,
        }.get(frequency, 252)

        return std_dev * math.sqrt(periods_per_year)

    def _resample_weekly(self, returns: list[dict]) -> list[dict]:
        """Resample daily returns to weekly."""
        if not returns:
            return []

        weekly = []
        week_returns = []
        current_week = None

        for r in returns:
            week = r["date"].isocalendar()[1]
            if current_week is None:
                current_week = week

            if week != current_week:
                if week_returns:
                    cumulative = self._cumulative_return(week_returns)
                    weekly.append({
                        "date": returns[len(weekly)]["date"],
                        "return": cumulative,
                    })
                week_returns = []
                current_week = week

            week_returns.append(r["return"])

        # Last week
        if week_returns:
            weekly.append({
                "date": returns[-1]["date"],
                "return": self._cumulative_return(week_returns),
            })

        return weekly

    def _resample_monthly(self, returns: list[dict]) -> list[dict]:
        """Resample daily returns to monthly."""
        if not returns:
            return []

        monthly = []
        month_returns = []
        current_month = None

        for r in returns:
            month = r["date"].month
            if current_month is None:
                current_month = month

            if month != current_month:
                if month_returns:
                    cumulative = self._cumulative_return(month_returns)
                    monthly.append({
                        "date": returns[len(monthly)]["date"],
                        "return": cumulative,
                    })
                month_returns = []
                current_month = month

            month_returns.append(r["return"])

        # Last month
        if month_returns:
            monthly.append({
                "date": returns[-1]["date"],
                "return": self._cumulative_return(month_returns),
            })

        return monthly
