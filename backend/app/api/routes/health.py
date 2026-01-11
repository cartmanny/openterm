"""Health check endpoints."""
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from app.adapters.stooq import StooqAdapter
from app.adapters.yahoo import YahooFinanceAdapter
from app.adapters.sec_edgar import SECEdgarAdapter
from app.core.config import settings
from app.core.resilience import source_registry

router = APIRouter()


def _initialize_source_registry() -> None:
    """Initialize source registry with configured sources."""
    if source_registry.get("stooq") is None:
        source_registry.register(
            "stooq",
            enabled=settings.enable_stooq,
            failure_threshold=5,
            recovery_timeout=60.0,
        )
    if source_registry.get("yahoo_finance") is None:
        source_registry.register(
            "yahoo_finance",
            enabled=settings.enable_yahoo,
            failure_threshold=3,  # Lower threshold - Yahoo is unstable
            recovery_timeout=120.0,  # Longer recovery - give it time
        )
    if source_registry.get("sec_edgar") is None:
        source_registry.register(
            "sec_edgar",
            enabled=settings.enable_edgar,
            failure_threshold=5,
            recovery_timeout=60.0,
        )


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """Basic health check - is the service running."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/sources")
async def health_sources() -> dict[str, Any]:
    """Detailed health check for all data sources.

    Returns circuit breaker state, request counts, failure rates, and latency.
    """
    _initialize_source_registry()

    # Get stats from the registry
    health = source_registry.get_health_summary()

    # Also do a quick connectivity check for each adapter
    adapters = []
    if settings.enable_stooq:
        adapters.append(StooqAdapter())
    if settings.enable_yahoo:
        adapters.append(YahooFinanceAdapter())
    if settings.enable_edgar:
        adapters.append(SECEdgarAdapter())

    connectivity = {}
    for adapter in adapters:
        adapter_health = await adapter.health_check()
        connectivity[adapter.source_name] = {
            "reachable": adapter_health.status.value == "healthy",
            "last_success": adapter_health.last_success.isoformat() if adapter_health.last_success else None,
            "last_failure": adapter_health.last_failure.isoformat() if adapter_health.last_failure else None,
        }
        if adapter_health.error:
            connectivity[adapter.source_name]["error"] = adapter_health.error

    # Merge registry stats with connectivity info
    for source_stat in health["sources"]:
        source_name = source_stat["source"]
        if source_name in connectivity:
            source_stat["connectivity"] = connectivity[source_name]

    return {
        "status": health["status"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "degraded_sources": health["degraded_sources"],
        "sources": health["sources"],
        "feature_flags": {
            "enable_stooq": settings.enable_stooq,
            "enable_yahoo": settings.enable_yahoo,
            "enable_edgar": settings.enable_edgar,
            "enable_fred": settings.enable_fred,
        },
    }


@router.get("/health/ready")
async def readiness_check() -> dict[str, Any]:
    """Readiness check - is the service ready to accept traffic.

    Checks that at least one price source is available.
    """
    _initialize_source_registry()

    # We need at least one price source working
    stooq_available = source_registry.is_available("stooq") if settings.enable_stooq else False
    yahoo_available = source_registry.is_available("yahoo_finance") if settings.enable_yahoo else False

    price_source_available = stooq_available or yahoo_available

    if not price_source_available:
        return {
            "status": "not_ready",
            "reason": "No price data source available",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
