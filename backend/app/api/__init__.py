"""API routes and dependencies."""
from app.api.deps import get_db, get_cache
from app.api.router import api_router

__all__ = ["get_db", "get_cache", "api_router"]
