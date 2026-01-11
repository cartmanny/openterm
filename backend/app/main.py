"""FastAPI application entry point."""
import os
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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    # Startup
    # Register rate limiters for sources
    rate_limiter.register("stooq", settings.stooq_rpm)
    rate_limiter.register("yahoo_finance", settings.yahoo_rph / 60.0)
    rate_limiter.register("sec_edgar", settings.edgar_rps * 60)
    rate_limiter.register("fred", settings.fred_rpm)
    rate_limiter.register("finnhub", settings.finnhub_rpm)

    # Start WebSocket streamers
    await data_streamer.start()
    await crypto_streamer.start()
    await sector_streamer.start()
    await ticker_tape_streamer.start()

    yield

    # Shutdown
    await data_streamer.stop()
    await crypto_streamer.stop()
    await sector_streamer.stop()
    await ticker_tape_streamer.stop()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Bloomberg Terminal-style financial platform with free data sources",
    lifespan=lifespan,
)

# CORS middleware - allow frontend origins
allowed_origins = [
    "http://localhost:3000",  # Local development
]

# Add production frontend URL if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

# Add Vercel preview URLs pattern
vercel_url = os.getenv("VERCEL_URL")
if vercel_url:
    allowed_origins.append(f"https://{vercel_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
    }
