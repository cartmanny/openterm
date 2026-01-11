"""Common schemas used across the API."""
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")


def calculate_staleness_bucket(asof: datetime | None, ingested_at: datetime | None) -> str:
    """Calculate staleness bucket based on data age."""
    if asof is None or ingested_at is None:
        return "unknown"

    now = datetime.now(timezone.utc)
    # Use ingested_at for staleness calculation
    if ingested_at.tzinfo is None:
        ingested_at = ingested_at.replace(tzinfo=timezone.utc)

    age = now - ingested_at
    age_seconds = age.total_seconds()

    if age_seconds < 3600:  # < 1 hour
        return "fresh"
    elif age_seconds < 86400:  # < 24 hours
        return "delayed"
    else:
        return "stale"


class ResponseMeta(BaseModel):
    """Universal metadata for all data responses."""

    source: str | None = None  # "yahoo", "stooq", "edgar", "fred", "database"
    asof: datetime | None = None  # When data represents (e.g., "2024-12-31" for Q4 earnings)
    ingested_at: datetime | None = None  # When we fetched it
    staleness_bucket: str | None = None  # "fresh" (<1hr), "delayed" (<24hr), "stale" (>24hr)
    cached: bool = False
    cache_age_seconds: int | None = None
    freshness: str | None = None  # realtime, delayed, eod, stale (legacy, use staleness_bucket)
    quality_flags: list[str] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:
        """Auto-calculate staleness_bucket after initialization."""
        if self.staleness_bucket is None and (self.asof or self.ingested_at):
            self.staleness_bucket = calculate_staleness_bucket(self.asof, self.ingested_at)


class DataResponse(BaseModel, Generic[T]):
    """Standard response wrapper with data and metadata."""

    data: T
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


class ErrorDetail(BaseModel):
    """Error response detail."""

    code: str
    message: str
    source: str | None = None
    retryable: bool = False
    retry_after_seconds: int | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: ErrorDetail


class PaginationParams(BaseModel):
    """Pagination parameters."""

    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PaginatedMeta(ResponseMeta):
    """Metadata for paginated responses."""

    total_count: int
    limit: int
    offset: int
