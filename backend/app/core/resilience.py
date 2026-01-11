"""Resilience patterns: rate limiting, circuit breaker, retry."""
import asyncio
import random
import time
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import TypeVar

from app.core.errors import RateLimitError

T = TypeVar("T")

# Metrics window: 5 minutes
METRICS_WINDOW_SECONDS = 300


@dataclass
class TokenBucket:
    """Token bucket rate limiter."""

    capacity: float
    refill_rate: float  # tokens per second
    tokens: float = field(default=0.0)
    last_refill: float = field(default_factory=time.time)

    def __post_init__(self) -> None:
        self.tokens = self.capacity

    def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def acquire(self, tokens: float = 1.0) -> bool:
        """Try to acquire tokens. Returns True if successful."""
        self._refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    def wait_time(self, tokens: float = 1.0) -> float:
        """Time to wait before tokens are available."""
        self._refill()
        if self.tokens >= tokens:
            return 0.0
        needed = tokens - self.tokens
        return needed / self.refill_rate


class RateLimiter:
    """Per-source rate limiter using token buckets."""

    def __init__(self) -> None:
        self._buckets: dict[str, TokenBucket] = {}

    def register(self, source: str, requests_per_minute: float) -> None:
        """Register a rate limit for a source."""
        self._buckets[source] = TokenBucket(
            capacity=requests_per_minute,
            refill_rate=requests_per_minute / 60.0,
        )

    def acquire(self, source: str) -> bool:
        """Try to acquire a token for the source."""
        if source not in self._buckets:
            return True
        return self._buckets[source].acquire()

    def wait_time(self, source: str) -> float:
        """Get wait time until a token is available."""
        if source not in self._buckets:
            return 0.0
        return self._buckets[source].wait_time()

    async def acquire_or_wait(self, source: str, max_wait: float = 30.0) -> None:
        """Acquire a token, waiting if necessary."""
        wait = self.wait_time(source)
        if wait > max_wait:
            raise RateLimitError(source, retry_after=int(wait))
        if wait > 0:
            await asyncio.sleep(wait)
        if not self.acquire(source):
            raise RateLimitError(source)


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    """Simple circuit breaker pattern."""

    failure_threshold: int = 5
    recovery_timeout: float = 30.0
    half_open_max_calls: int = 3

    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: float = 0.0
    half_open_calls: int = 0

    def is_available(self) -> bool:
        """Check if circuit allows requests."""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
                return True
            return False

        # HALF_OPEN
        return self.half_open_calls < self.half_open_max_calls

    def record_success(self) -> None:
        """Record a successful call."""
        if self.state == CircuitState.HALF_OPEN:
            self.half_open_calls += 1
            if self.half_open_calls >= self.half_open_max_calls:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    def record_failure(self) -> None:
        """Record a failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
        elif self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN


async def retry_with_backoff(
    fn: Callable[[], Awaitable[T]],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    jitter: float = 0.1,
) -> T:
    """Retry an async function with exponential backoff and jitter."""
    last_error: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except Exception as e:
            last_error = e
            if attempt == max_retries:
                break

            # Calculate delay with exponential backoff
            delay = min(base_delay * (2**attempt), max_delay)
            # Add jitter
            delay = delay * (1 + random.uniform(-jitter, jitter))
            await asyncio.sleep(delay)

    raise last_error  # type: ignore


# Global rate limiter instance
rate_limiter = RateLimiter()


@dataclass
class RequestRecord:
    """Record of a single request for metrics."""

    timestamp: float
    latency_ms: float
    success: bool


@dataclass
class SourceMetrics:
    """Metrics for a data source over a rolling window."""

    source: str
    circuit_breaker: CircuitBreaker = field(default_factory=CircuitBreaker)
    requests: deque[RequestRecord] = field(default_factory=lambda: deque(maxlen=1000))
    enabled: bool = True

    def record_request(self, latency_ms: float, success: bool) -> None:
        """Record a request."""
        now = time.time()
        self.requests.append(RequestRecord(timestamp=now, latency_ms=latency_ms, success=success))
        if success:
            self.circuit_breaker.record_success()
        else:
            self.circuit_breaker.record_failure()

    def _prune_old_records(self) -> list[RequestRecord]:
        """Get records within the metrics window."""
        cutoff = time.time() - METRICS_WINDOW_SECONDS
        return [r for r in self.requests if r.timestamp >= cutoff]

    def get_stats(self) -> dict:
        """Get current stats for this source."""
        records = self._prune_old_records()
        total = len(records)
        failures = sum(1 for r in records if not r.success)
        latencies = sorted([r.latency_ms for r in records if r.success])

        p95_latency = 0.0
        if latencies:
            idx = int(len(latencies) * 0.95)
            p95_latency = latencies[min(idx, len(latencies) - 1)]

        return {
            "source": self.source,
            "enabled": self.enabled,
            "circuit_state": self.circuit_breaker.state.value,
            "is_available": self.circuit_breaker.is_available(),
            "requests_last_5m": total,
            "failures_last_5m": failures,
            "failure_rate": (failures / total * 100) if total > 0 else 0.0,
            "p95_latency_ms": round(p95_latency, 2),
        }


class SourceRegistry:
    """Registry for all data sources with their circuit breakers and metrics."""

    def __init__(self) -> None:
        self._sources: dict[str, SourceMetrics] = {}

    def register(
        self,
        source: str,
        enabled: bool = True,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ) -> None:
        """Register a data source."""
        self._sources[source] = SourceMetrics(
            source=source,
            circuit_breaker=CircuitBreaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
            ),
            enabled=enabled,
        )

    def get(self, source: str) -> SourceMetrics | None:
        """Get metrics for a source."""
        return self._sources.get(source)

    def is_available(self, source: str) -> bool:
        """Check if a source is enabled and circuit is not open."""
        metrics = self._sources.get(source)
        if not metrics:
            return True
        return metrics.enabled and metrics.circuit_breaker.is_available()

    def record_request(self, source: str, latency_ms: float, success: bool) -> None:
        """Record a request result for a source."""
        metrics = self._sources.get(source)
        if metrics:
            metrics.record_request(latency_ms, success)

    def get_all_stats(self) -> list[dict]:
        """Get stats for all registered sources."""
        return [m.get_stats() for m in self._sources.values()]

    def get_health_summary(self) -> dict:
        """Get overall health summary."""
        stats = self.get_all_stats()
        degraded = [s for s in stats if s["circuit_state"] != "closed" or not s["enabled"]]
        return {
            "status": "healthy" if not degraded else "degraded",
            "sources": stats,
            "degraded_sources": [s["source"] for s in degraded],
        }


# Global source registry instance
source_registry = SourceRegistry()
