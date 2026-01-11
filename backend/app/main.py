"""FastAPI application entry point."""
import os
import sys
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import OpenTermError
from app.core.resilience import rate_limiter
from app.websocket import ws_router
from app.websocket.streamer import (
    data_streamer,
    crypto_streamer,
    sector_streamer,
    ticker_tape_streamer,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("=" * 50)
    logger.info("OpenTerm starting up...")
    logger.info(f"Database URL configured: {'Yes' if settings.database_url else 'No'}")
    logger.info(f"Redis URL configured: {'Yes' if settings.redis_url else 'No'}")
    logger.info(f"FRED API key configured: {'Yes' if settings.fred_api_key else 'No'}")
    logger.info(f"Finnhub API key configured: {'Yes' if settings.finnhub_api_key else 'No'}")
    logger.info("=" * 50)

    # Startup
    # Register rate limiters for sources
    rate_limiter.register("stooq", settings.stooq_rpm)
    rate_limiter.register("yahoo_finance", settings.yahoo_rph / 60.0)
    rate_limiter.register("sec_edgar", settings.edgar_rps * 60)
    rate_limiter.register("fred", settings.fred_rpm)
    rate_limiter.register("finnhub", settings.finnhub_rpm)
    logger.info("Rate limiters registered")

    # Start WebSocket streamers (non-blocking, failures shouldn't stop the app)
    try:
        await data_streamer.start()
        logger.info("Data streamer started")
    except Exception as e:
        logger.warning(f"Failed to start data_streamer: {e}")

    try:
        await crypto_streamer.start()
        logger.info("Crypto streamer started")
    except Exception as e:
        logger.warning(f"Failed to start crypto_streamer: {e}")

    try:
        await sector_streamer.start()
        logger.info("Sector streamer started")
    except Exception as e:
        logger.warning(f"Failed to start sector_streamer: {e}")

    try:
        await ticker_tape_streamer.start()
        logger.info("Ticker tape streamer started")
    except Exception as e:
        logger.warning(f"Failed to start ticker_tape_streamer: {e}")

    yield

    # Shutdown (ignore errors)
    try:
        await data_streamer.stop()
    except Exception:
        pass
    try:
        await crypto_streamer.stop()
    except Exception:
        pass
    try:
        await sector_streamer.stop()
    except Exception:
        pass
    try:
        await ticker_tape_streamer.stop()
    except Exception:
        pass


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Bloomberg Terminal-style financial platform with free data sources",
    lifespan=lifespan,
)

# CORS middleware - allow all origins for now (can restrict later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OpenTermError)
async def openterm_error_handler(request: Request, exc: OpenTermError) -> JSONResponse:
    """Handle OpenTerm custom exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.to_dict()},
        headers={"Retry-After": str(exc.retry_after)} if exc.retry_after else None,
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "retryable": False,
            }
        },
    )


# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Include WebSocket routes
app.include_router(ws_router, prefix="/ws")


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for Railway deployment."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.app_version,
        "service": settings.app_name,
        "config": {
            "database_configured": bool(settings.database_url and "localhost" not in settings.database_url),
            "redis_configured": bool(settings.redis_url and "localhost" not in settings.redis_url),
            "fred_key": bool(settings.fred_api_key),
            "finnhub_key": bool(settings.finnhub_api_key),
        }
    }
