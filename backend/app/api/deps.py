"""API dependencies."""
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

from app.core.database import async_session_maker
from app.core.redis import CacheManager, get_redis_pool


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency."""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    """Get Redis connection dependency (lazy initialization)."""
    pool = get_redis_pool()
    client = redis.Redis(connection_pool=pool)
    try:
        yield client
    finally:
        await client.aclose()


async def get_cache(
    redis_client: Annotated[redis.Redis, Depends(get_redis)]
) -> CacheManager:
    """Get cache manager dependency."""
    return CacheManager(redis_client)


# Type aliases for cleaner dependency injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
Cache = Annotated[CacheManager, Depends(get_cache)]
