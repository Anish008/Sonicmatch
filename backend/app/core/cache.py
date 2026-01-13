"""
Redis cache wrapper for session caching and performance optimization.
"""
import json
from typing import Any, Optional
import hashlib

import redis.asyncio as redis
import structlog

from app.config import settings
from app.core.exceptions import CacheException

logger = structlog.get_logger()


class RedisCache:
    """
    Async Redis cache wrapper.

    Provides caching for:
    - Recommendation sessions
    - Headphone catalog queries
    - Filtered headphone results
    - Rate limit counters
    """

    def __init__(self):
        """Initialize Redis connection pool."""
        self.redis: Optional[redis.Redis] = None
        self._initialized = False

    async def initialize(self):
        """Initialize Redis connection."""
        if self._initialized:
            return

        try:
            self.redis = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            # Test connection
            await self.redis.ping()
            self._initialized = True
            logger.info("redis_connected", url=settings.redis_url)

        except Exception as e:
            logger.error("redis_connection_error", error=str(e))
            # Don't raise - allow app to run without cache
            self._initialized = False

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            logger.info("redis_connection_closed")

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value (deserialized from JSON), or None if not found
        """
        if not self._initialized or not self.redis:
            return None

        try:
            value = await self.redis.get(key)
            if value:
                logger.debug("cache_hit", key=key)
                return json.loads(value)
            else:
                logger.debug("cache_miss", key=key)
                return None

        except Exception as e:
            logger.warning("cache_get_error", key=key, error=str(e))
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ):
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (None = no expiration)
        """
        if not self._initialized or not self.redis:
            return

        try:
            serialized = json.dumps(value, default=str)
            if ttl:
                await self.redis.setex(key, ttl, serialized)
            else:
                await self.redis.set(key, serialized)

            logger.debug("cache_set", key=key, ttl=ttl)

        except Exception as e:
            logger.warning("cache_set_error", key=key, error=str(e))

    async def delete(self, key: str):
        """
        Delete key from cache.

        Args:
            key: Cache key to delete
        """
        if not self._initialized or not self.redis:
            return

        try:
            await self.redis.delete(key)
            logger.debug("cache_delete", key=key)

        except Exception as e:
            logger.warning("cache_delete_error", key=key, error=str(e))

    async def delete_pattern(self, pattern: str):
        """
        Delete all keys matching pattern.

        Args:
            pattern: Key pattern (e.g., "headphones:*")
        """
        if not self._initialized or not self.redis:
            return

        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                await self.redis.delete(*keys)
                logger.debug("cache_delete_pattern", pattern=pattern, count=len(keys))

        except Exception as e:
            logger.warning("cache_delete_pattern_error", pattern=pattern, error=str(e))

    # ============================================
    # High-level cache methods for specific use cases
    # ============================================

    async def cache_session(self, session_id: str, data: dict):
        """
        Cache recommendation session.

        Args:
            session_id: Session UUID
            data: Session data to cache
        """
        key = f"session:{session_id}"
        await self.set(key, data, ttl=settings.cache_ttl_session)

    async def get_cached_session(self, session_id: str) -> Optional[dict]:
        """
        Get cached recommendation session.

        Args:
            session_id: Session UUID

        Returns:
            Cached session data or None
        """
        key = f"session:{session_id}"
        return await self.get(key)

    async def cache_headphones(self, headphones: list[dict], filters: dict):
        """
        Cache filtered headphone results.

        Args:
            headphones: List of headphone dicts
            filters: Filter parameters used
        """
        # Create cache key from filters
        filter_hash = self._hash_dict(filters)
        key = f"headphones:filter:{filter_hash}"
        await self.set(key, headphones, ttl=settings.cache_ttl_filters)

    async def get_cached_headphones(self, filters: dict) -> Optional[list[dict]]:
        """
        Get cached headphone results.

        Args:
            filters: Filter parameters

        Returns:
            Cached headphones or None
        """
        filter_hash = self._hash_dict(filters)
        key = f"headphones:filter:{filter_hash}"
        return await self.get(key)

    async def increment_rate_limit(
        self,
        identifier: str,
        endpoint: str,
        window_seconds: int = 60,
    ) -> int:
        """
        Increment rate limit counter.

        Args:
            identifier: IP address or user ID
            endpoint: API endpoint
            window_seconds: Rate limit window

        Returns:
            Current request count in window
        """
        if not self._initialized or not self.redis:
            return 0

        try:
            key = f"ratelimit:{identifier}:{endpoint}"
            count = await self.redis.incr(key)

            # Set expiry on first request
            if count == 1:
                await self.redis.expire(key, window_seconds)

            return count

        except Exception as e:
            logger.warning("rate_limit_error", error=str(e))
            return 0

    def _hash_dict(self, data: dict) -> str:
        """
        Create hash from dictionary for cache key.

        Args:
            data: Dictionary to hash

        Returns:
            MD5 hash string
        """
        # Sort keys for consistent hashing
        sorted_items = sorted(data.items())
        data_str = json.dumps(sorted_items, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()


# Global cache instance
cache = RedisCache()
