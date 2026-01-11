"""Unit tests for command parsing (backend validation)."""
import pytest


class TestStooqParser:
    """Tests for Stooq CSV parsing."""

    def test_parse_valid_csv(self):
        """Test parsing valid Stooq CSV."""
        from app.adapters.stooq import StooqAdapter

        adapter = StooqAdapter()
        csv_data = """Date,Open,High,Low,Close,Volume
2024-01-15,182.16,184.26,180.93,183.63,65076800
2024-01-12,186.06,186.74,183.62,185.92,40477800"""

        bars = adapter._parse_csv(csv_data)

        assert len(bars) == 2
        assert bars[0].close == 183.63
        assert bars[0].volume == 65076800
        assert bars[1].close == 185.92

    def test_parse_empty_csv(self):
        """Test parsing empty CSV."""
        from app.adapters.stooq import StooqAdapter

        adapter = StooqAdapter()
        bars = adapter._parse_csv("")

        assert len(bars) == 0

    def test_parse_no_data_response(self):
        """Test parsing 'No data' response."""
        from app.adapters.stooq import StooqAdapter

        adapter = StooqAdapter()
        bars = adapter._parse_csv("No data")

        assert len(bars) == 0


class TestRateLimiter:
    """Tests for rate limiter."""

    def test_token_bucket_acquire(self):
        """Test token bucket acquisition."""
        from app.core.resilience import TokenBucket

        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Should be able to acquire up to capacity
        for _ in range(10):
            assert bucket.acquire() is True

        # Should fail after capacity exhausted
        assert bucket.acquire() is False

    def test_token_bucket_wait_time(self):
        """Test wait time calculation."""
        from app.core.resilience import TokenBucket

        bucket = TokenBucket(capacity=1, refill_rate=1.0)
        bucket.acquire()  # Use the token

        wait = bucket.wait_time()
        assert 0 < wait <= 1.0


class TestCircuitBreaker:
    """Tests for circuit breaker."""

    def test_circuit_starts_closed(self):
        """Test circuit starts in closed state."""
        from app.core.resilience import CircuitBreaker, CircuitState

        cb = CircuitBreaker(failure_threshold=3)
        assert cb.state == CircuitState.CLOSED
        assert cb.is_available() is True

    def test_circuit_opens_after_threshold(self):
        """Test circuit opens after failure threshold."""
        from app.core.resilience import CircuitBreaker, CircuitState

        cb = CircuitBreaker(failure_threshold=3)

        for _ in range(3):
            cb.record_failure()

        assert cb.state == CircuitState.OPEN
        assert cb.is_available() is False

    def test_circuit_success_resets_count(self):
        """Test success resets failure count."""
        from app.core.resilience import CircuitBreaker

        cb = CircuitBreaker(failure_threshold=3)

        cb.record_failure()
        cb.record_failure()
        cb.record_success()

        assert cb.failure_count == 0
