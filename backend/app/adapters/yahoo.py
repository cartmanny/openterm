"""Yahoo Finance adapter for fundamentals and price data."""
from datetime import date, datetime, timezone
from typing import Any

from app.adapters.base import (
    Bar,
    BaseAdapter,
    FundamentalsData,
    InstrumentCandidate,
    InstrumentProfile,
)
from app.core.config import settings
from app.core.resilience import rate_limiter


class YahooFinanceAdapter(BaseAdapter):
    """Adapter for Yahoo Finance data.

    Yahoo Finance provides fundamentals, quotes, and historical prices.

    Endpoints:
    - Quote: /v7/finance/quote?symbols={ticker}
    - History: /v8/finance/chart/{ticker}
    - Fundamentals: /v10/finance/quoteSummary/{ticker}?modules=...

    Limitations:
    - Rate limiting (aggressive, ~100/hour safe)
    - May require cookies/crumb for some endpoints
    - API changes without notice
    - Terms prohibit scraping (personal/educational use only)
    """

    BASE_URL = "https://query1.finance.yahoo.com"

    def __init__(self) -> None:
        super().__init__()
        # Yahoo uses requests per hour
        rate_limiter.register(self.source_name, settings.yahoo_rph / 60.0)

    @property
    def source_name(self) -> str:
        return "yahoo_finance"

    async def search_instruments(
        self, query: str, limit: int = 10
    ) -> list[InstrumentCandidate]:
        """Search for instruments using Yahoo autosuggest."""
        url = f"https://query2.finance.yahoo.com/v1/finance/search"
        params = {
            "q": query,
            "quotesCount": limit,
            "newsCount": 0,
        }

        response = await self._request("GET", url, params=params)
        data = response.json()

        candidates = []
        for quote in data.get("quotes", []):
            if quote.get("quoteType") in ("EQUITY", "ETF"):
                candidates.append(
                    InstrumentCandidate(
                        ticker=quote.get("symbol", ""),
                        name=quote.get("shortname") or quote.get("longname", ""),
                        exchange=quote.get("exchange"),
                        security_type=quote.get("quoteType", "equity").lower(),
                        source_id=quote.get("symbol"),
                    )
                )

        return candidates[:limit]

    async def get_profile(self, ticker: str) -> InstrumentProfile | None:
        """Get instrument profile from Yahoo."""
        url = f"{self.BASE_URL}/v10/finance/quoteSummary/{ticker}"
        params = {"modules": "assetProfile,summaryDetail"}

        try:
            response = await self._request("GET", url, params=params)
            data = response.json()

            result = data.get("quoteSummary", {}).get("result", [])
            if not result:
                return None

            profile = result[0].get("assetProfile", {})
            summary = result[0].get("summaryDetail", {})

            return InstrumentProfile(
                ticker=ticker,
                name=profile.get("longName") or ticker,
                security_type="equity",
                sector=profile.get("sector"),
                industry=profile.get("industry"),
                extra={
                    "website": profile.get("website"),
                    "description": profile.get("longBusinessSummary"),
                },
            )
        except Exception:
            return None

    async def get_daily_bars(
        self, ticker: str, start: date, end: date
    ) -> list[Bar]:
        """Fetch daily OHLCV bars from Yahoo Finance."""
        # Convert dates to Unix timestamps
        period1 = int(datetime.combine(start, datetime.min.time()).timestamp())
        period2 = int(datetime.combine(end, datetime.max.time()).timestamp())

        url = f"{self.BASE_URL}/v8/finance/chart/{ticker}"
        params = {
            "period1": period1,
            "period2": period2,
            "interval": "1d",
            "events": "div,split",
        }

        response = await self._request("GET", url, params=params)
        data = response.json()

        return self._parse_chart_response(data)

    def _parse_chart_response(self, data: dict[str, Any]) -> list[Bar]:
        """Parse Yahoo chart API response."""
        bars: list[Bar] = []

        chart = data.get("chart", {})
        result = chart.get("result", [])

        if not result:
            return bars

        result = result[0]
        timestamps = result.get("timestamp", [])
        indicators = result.get("indicators", {})
        quote = indicators.get("quote", [{}])[0]
        adjclose = indicators.get("adjclose", [{}])[0]

        opens = quote.get("open", [])
        highs = quote.get("high", [])
        lows = quote.get("low", [])
        closes = quote.get("close", [])
        volumes = quote.get("volume", [])
        adj_closes = adjclose.get("adjclose", [])

        for i, ts in enumerate(timestamps):
            if ts is None:
                continue

            # Convert timestamp to date
            bar_date = datetime.fromtimestamp(ts, tz=timezone.utc).date()

            # Get values safely
            close = closes[i] if i < len(closes) else None
            if close is None:
                continue

            bar = Bar(
                date=bar_date,
                open=opens[i] if i < len(opens) else None,
                high=highs[i] if i < len(highs) else None,
                low=lows[i] if i < len(lows) else None,
                close=close,
                adj_close=adj_closes[i] if i < len(adj_closes) else close,
                volume=volumes[i] if i < len(volumes) else None,
            )
            bars.append(bar)

        # Sort by date ascending
        bars.sort(key=lambda b: b.date)
        return bars

    async def get_fundamentals(self, ticker: str) -> FundamentalsData | None:
        """Fetch fundamentals from Yahoo Finance."""
        url = f"{self.BASE_URL}/v10/finance/quoteSummary/{ticker}"
        params = {
            "modules": ",".join([
                "summaryDetail",
                "financialData",
                "defaultKeyStatistics",
            ])
        }

        try:
            response = await self._request("GET", url, params=params)
            data = response.json()

            result = data.get("quoteSummary", {}).get("result", [])
            if not result:
                return None

            return self._parse_fundamentals(result[0])

        except Exception:
            return None

    def _parse_fundamentals(self, data: dict[str, Any]) -> FundamentalsData:
        """Parse Yahoo fundamentals response."""
        summary = data.get("summaryDetail", {})
        financials = data.get("financialData", {})
        stats = data.get("defaultKeyStatistics", {})

        quality_flags = []

        def get_raw(obj: dict, key: str) -> Any:
            """Extract raw value from Yahoo's nested format."""
            val = obj.get(key, {})
            if isinstance(val, dict):
                return val.get("raw")
            return val

        fundamentals = FundamentalsData(
            # Valuation
            market_cap=get_raw(summary, "marketCap"),
            enterprise_value=get_raw(stats, "enterpriseValue"),
            pe_trailing=get_raw(summary, "trailingPE"),
            pe_forward=get_raw(summary, "forwardPE"),
            peg_ratio=get_raw(stats, "pegRatio"),
            price_to_book=get_raw(stats, "priceToBook"),
            ev_to_ebitda=get_raw(stats, "enterpriseToEbitda"),

            # Income
            revenue=get_raw(financials, "totalRevenue"),
            gross_profit=get_raw(financials, "grossProfits"),
            operating_income=get_raw(financials, "operatingCashflow"),
            net_income=None,  # Not directly available
            ebitda=get_raw(financials, "ebitda"),
            eps=get_raw(stats, "trailingEps"),

            # Margins
            gross_margin=get_raw(financials, "grossMargins"),
            operating_margin=get_raw(financials, "operatingMargins"),
            profit_margin=get_raw(financials, "profitMargins"),

            # Returns
            roe=get_raw(financials, "returnOnEquity"),
            roa=get_raw(financials, "returnOnAssets"),

            # Leverage
            debt_to_equity=get_raw(financials, "debtToEquity"),
            current_ratio=get_raw(financials, "currentRatio"),

            # Dividend
            dividend_yield=get_raw(summary, "dividendYield"),

            quality_flags=quality_flags,
        )

        # Check for missing critical fields
        if fundamentals.market_cap is None:
            quality_flags.append("missing_market_cap")
        if fundamentals.pe_trailing is None:
            quality_flags.append("missing_pe")

        return fundamentals
