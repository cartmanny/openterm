"""Custom exception types for OpenTerm."""
from typing import Any


class OpenTermError(Exception):
    """Base exception for OpenTerm."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        source: str | None = None,
        retryable: bool = False,
        retry_after: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.source = source
        self.retryable = retryable
        self.retry_after = retry_after
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        """Convert to API error response."""
        result = {
            "code": self.code,
            "message": self.message,
        }
        if self.source:
            result["source"] = self.source
        result["retryable"] = self.retryable
        if self.retry_after:
            result["retry_after_seconds"] = self.retry_after
        if self.details:
            result["details"] = self.details
        return result


class NotFoundError(OpenTermError):
    """Resource not found."""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} '{identifier}' not found",
            status_code=404,
        )


class ValidationError(OpenTermError):
    """Invalid request parameters."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=400,
            details=details,
        )


class RateLimitError(OpenTermError):
    """Rate limit exceeded."""

    def __init__(self, source: str, retry_after: int = 60):
        super().__init__(
            code="RATE_LIMITED",
            message=f"Rate limit exceeded for {source}",
            status_code=429,
            source=source,
            retryable=True,
            retry_after=retry_after,
        )


class SourceError(OpenTermError):
    """External data source error."""

    def __init__(self, source: str, message: str, retryable: bool = True):
        super().__init__(
            code="SOURCE_ERROR",
            message=message,
            status_code=502,
            source=source,
            retryable=retryable,
        )


class SourceTimeoutError(OpenTermError):
    """External data source timeout."""

    def __init__(self, source: str):
        super().__init__(
            code="SOURCE_TIMEOUT",
            message=f"Timeout waiting for {source}",
            status_code=504,
            source=source,
            retryable=True,
        )
