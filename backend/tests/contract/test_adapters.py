"""Contract tests for data source adapters.

These tests verify that external APIs return expected data structures.
Run with: pytest tests/contract -v
"""
import pytest
from datetime import date, timedelta


@pytest.mark.asyncio
class TestStooqContract:
    """Contract tests for Stooq adapter."""

    @pytest.mark.skip(reason="Requires network access")
    async def test_stooq_returns_valid_bars(self):
        """Verify Stooq returns valid bar data."""
        from app.adapters.stooq import StooqAdapter

        adapter = StooqAdapter()
        end = date.today()
        start = end - timedelta(days=30)

        bars = await adapter.get_daily_bars("AAPL", start, end)

        # Should return some bars
        assert len(bars) > 0

        # Each bar should have required fields
        for bar in bars:
            assert bar.date is not None
            assert bar.close > 0
            assert isinstance(bar.close, float)


@pytest.mark.asyncio
class TestSECEdgarContract:
    """Contract tests for SEC EDGAR adapter."""

    @pytest.mark.skip(reason="Requires network access")
    async def test_sec_returns_valid_filings(self):
        """Verify SEC returns valid filing data."""
        from app.adapters.sec_edgar import SECEdgarAdapter

        adapter = SECEdgarAdapter()

        # Apple's CIK
        filings = await adapter.get_filings("0000320193", ["10-K", "10-Q"], limit=5)

        # Should return some filings
        assert len(filings) > 0

        # Each filing should have required fields
        for filing in filings:
            assert filing.accession_number
            assert filing.form_type in ["10-K", "10-Q"]
            assert filing.filing_date is not None

    @pytest.mark.skip(reason="Requires network access")
    async def test_sec_company_tickers_format(self):
        """Verify SEC company tickers file format."""
        from app.adapters.sec_edgar import SECEdgarAdapter

        adapter = SECEdgarAdapter()
        tickers = await adapter.get_company_tickers()

        # Should have many companies
        assert len(tickers) > 1000

        # AAPL should be present
        assert "AAPL" in tickers
        assert "cik" in tickers["AAPL"]
        assert "title" in tickers["AAPL"]


@pytest.mark.asyncio
class TestYahooContract:
    """Contract tests for Yahoo Finance adapter."""

    @pytest.mark.skip(reason="Requires network access")
    async def test_yahoo_returns_fundamentals(self):
        """Verify Yahoo returns fundamental data."""
        from app.adapters.yahoo import YahooFinanceAdapter

        adapter = YahooFinanceAdapter()
        fundies = await adapter.get_fundamentals("AAPL")

        assert fundies is not None
        assert fundies.market_cap is not None
        assert fundies.market_cap > 0

    @pytest.mark.skip(reason="Requires network access")
    async def test_yahoo_search_returns_results(self):
        """Verify Yahoo search returns results."""
        from app.adapters.yahoo import YahooFinanceAdapter

        adapter = YahooFinanceAdapter()
        results = await adapter.search_instruments("Apple", limit=5)

        assert len(results) > 0
        assert any(r.ticker == "AAPL" for r in results)
