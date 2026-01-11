"""Base adapter interface and types."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Any
from uuid import UUID

import httpx

from app.core.config import settings
from app.core.errors import SourceError, SourceTimeoutError
from app.core.resilience import CircuitBreaker, rate_limiter, retry_with_backoff


class SourceStatus(str, Enum):
    """Source health status."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class SourceHealth:
    """Health status for a data source."""

    status: SourceStatus
    last_success: datetime | None = None
    last_failure: datetime | None = None
    error: str | None = None
    rate_limit_remaining: int | None = None
    rate_limit_reset: datetime | None = None
    avg_latency_ms: float | None = None


@dataclass
class InstrumentCandidate:
    """Search result candidate."""

    ticker: str
    name: str
    exchange: str | None = None
    security_type: str = "equity"
    source_id: str | None = None


@dataclass
class InstrumentProfile:
    """Instrument profile from source."""

    ticker: str
    name: str
    exchange: str | None = None
    security_type: str = "equity"
    sector: str | None = None
    industry: str | None = None
    cik: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class Bar:
    """OHLCV bar."""

    date: date
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float = 0.0
    adj_close: float | None = None
    volume: int | None = None


@dataclass
class FundamentalsData:
    """Raw fundamentals from source."""

    # Valuation
    market_cap: int | None = None
    enterprise_value: int | None = None
    pe_trailing: float | None = None
    pe_forward: float | None = None
    peg_ratio: float | None = None
    price_to_book: float | None = None
    price_to_sales: float | None = None
    ev_to_ebitda: float | None = None

    # Income
    revenue: int | None = None
    gross_profit: int | None = None
    operating_income: int | None = None
    net_income: int | None = None
    ebitda: int | None = None
    eps: float | None = None

    # Margins
    gross_margin: float | None = None
    operating_margin: float | None = None
    profit_margin: float | None = None

    # Returns
    roe: float | None = None
    roa: float | None = None

    # Leverage
    debt_to_equity: float | None = None
    current_ratio: float | None = None

    # Dividend
    dividend_yield: float | None = None

    # Extra
    extra: dict[str, Any] = field(default_factory=dict)
    quality_flags: list[str] = field(default_factory=list)


@dataclass
class Filing:
    """SEC filing from source."""

    accession_number: str
    form_type: str
    filing_date: date
    accepted_date: datetime | None = None
    cik: str = ""
    primary_document: str | None = None
    primary_doc_url: str | None = None
    title: str | None = None
    description: str | None = None


@dataclass
class NewsItem:
    """News article from source."""

    title: str
    url: str
    published_at: datetime
    source_name: str | None = None
    summary: str | None = None
    image_url: str | None = None


class BaseAdapter(ABC):
    """Base class for all data source adapters."""

    def __init__(self) -> None:
        self._circuit_breaker = CircuitBreaker()
        self._last_success: datetime | None = None
        self._last_failure: datetime | None = None
        self._latencies: list[float] = []

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Unique identifier for this source."""
        pass

    @property
    def timeout(self) -> float:
        """Request timeout in seconds."""
        return 30.0

    async def _request(
        self,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """Make HTTP request with resilience patterns."""
        # Check circuit breaker
        if not self._circuit_breaker.is_available():
            raise SourceError(
                self.source_name,
                f"Circuit breaker open for {self.source_name}",
                retryable=True,
            )

        # Rate limiting
        await rate_limiter.acquire_or_wait(self.source_name)

        # Make request with retry
        async def do_request() -> httpx.Response:
            start = datetime.now()
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.request(method, url, **kwargs)
                    response.raise_for_status()

                    # Record success
                    self._circuit_breaker.record_success()
                    self._last_success = datetime.now()
                    latency = (datetime.now() - start).total_seconds() * 1000
                    self._latencies = (self._latencies + [latency])[-100:]

                    return response

            except httpx.TimeoutException:
                self._circuit_breaker.record_failure()
                self._last_failure = datetime.now()
                raise SourceTimeoutError(self.source_name)

            except httpx.HTTPStatusError as e:
                self._circuit_breaker.record_failure()
                self._last_failure = datetime.now()
                raise SourceError(
                    self.source_name,
                    f"HTTP {e.response.status_code}: {str(e)}",
                    retryable=e.response.status_code >= 500,
                )

            except Exception as e:
                self._circuit_breaker.record_failure()
                self._last_failure = datetime.now()
                raise SourceError(self.source_name, str(e))

        return await retry_with_backoff(do_request, max_retries=2)

    async def health_check(self) -> SourceHealth:
        """Check if source is healthy."""
        avg_latency = None
        if self._latencies:
            avg_latency = sum(self._latencies) / len(self._latencies)

        if not self._circuit_breaker.is_available():
            return SourceHealth(
                status=SourceStatus.UNHEALTHY,
                last_success=self._last_success,
                last_failure=self._last_failure,
                error="Circuit breaker open",
                avg_latency_ms=avg_latency,
            )

        if self._last_failure and (
            not self._last_success or self._last_failure > self._last_success
        ):
            return SourceHealth(
                status=SourceStatus.DEGRADED,
                last_success=self._last_success,
                last_failure=self._last_failure,
                avg_latency_ms=avg_latency,
            )

        return SourceHealth(
            status=SourceStatus.HEALTHY,
            last_success=self._last_success,
            last_failure=self._last_failure,
            avg_latency_ms=avg_latency,
        )

    @abstractmethod
    async def search_instruments(
        self, query: str, limit: int = 10
    ) -> list[InstrumentCandidate]:
        """Search for instruments matching query."""
        pass

    @abstractmethod
    async def get_profile(self, identifier: str) -> InstrumentProfile | None:
        """Get instrument profile/metadata."""
        pass

    @abstractmethod
    async def get_daily_bars(
        self, ticker: str, start: date, end: date
    ) -> list[Bar]:
        """Get daily OHLCV bars."""
        pass

    async def get_fundamentals(self, ticker: str) -> FundamentalsData | None:
        """Get latest fundamentals snapshot. Optional."""
        return None

    async def get_filings(
        self, cik: str, form_types: list[str], limit: int = 20
    ) -> list[Filing]:
        """Get SEC filings. Optional."""
        return []

    async def get_news(
        self, ticker: str, start: date, end: date
    ) -> list[NewsItem]:
        """Get news items. Optional."""
        return []
