"""Redis connection and caching utilities."""
import json
from collections.abc import AsyncGenerator
from typing import Any

import redis.asyncio as redis

from app.core.config import settings

# Redis connection pool
redis_pool = redis.ConnectionPool.from_url(settings.redis_url, decode_responses=True)


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    """Dependency for getting Redis connection."""
    client = redis.Redis(connection_pool=redis_pool)
    try:
        yield client
    finally:
        await client.aclose()


class CacheManager:
    """Cache operations with versioning support."""

    def __init__(self, client: redis.Redis):
        self.client = client
        self.version = settings.cache_version

    def _key(self, prefix: str, *args: Any) -> str:
        """Build versioned cache key."""
        parts = [prefix] + [str(a) for a in args] + [self.version]
        return ":".join(parts)

    async def get(self, prefix: str, *args: Any) -> Any | None:
        """Get cached value."""
        key = self._key(prefix, *args)
        data = await self.client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set(self, prefix: str, *args: Any, value: Any, ttl: int) -> None:
        """Set cached value with TTL."""
        key = self._key(prefix, *args)
        await self.client.setex(key, ttl, json.dumps(value, default=str))

    async def delete(self, prefix: str, *args: Any) -> None:
        """Delete cached value."""
        key = self._key(prefix, *args)
        await self.client.delete(key)

    async def get_ttl(self, prefix: str, *args: Any) -> int:
        """Get remaining TTL for key."""
        key = self._key(prefix, *args)
        return await self.client.ttl(key)
