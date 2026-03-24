import hashlib
import json
import os

import redis.asyncio as aioredis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = 300  # seconds (5 minutes)

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            REDIS_URL, encoding="utf-8", decode_responses=True
        )
    return _redis_client


def make_cache_key(content: str, scope: str) -> str:
    """SHA-256 of (scope, content) → deterministic cache key."""
    digest = hashlib.sha256(f"{scope}:{content}".encode()).hexdigest()
    return f"sisa:scan:{digest}"


async def get_cached(key: str) -> dict | None:
    r = await get_redis()
    data = await r.get(key)
    return json.loads(data) if data else None


async def set_cached(key: str, value: dict, ttl: int = CACHE_TTL) -> None:
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value))


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
