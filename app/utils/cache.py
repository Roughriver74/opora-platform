"""
Redis cache utility для OPORA Platform.
Graceful degradation: если Redis недоступен — работает без кэша.
"""
import json
import logging
from typing import Any, Optional

logger = logging.getLogger("opora.cache")

_redis_client = None


async def get_redis():
    """Возвращает Redis клиент или None если недоступен."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        from app.config import Settings
        if not Settings.REDIS_ENABLED:
            return None

        import redis.asyncio as aioredis
        client = aioredis.from_url(
            Settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        await client.ping()
        _redis_client = client
        logger.info("Redis connected successfully")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis unavailable, running without cache: {e}")
        return None


async def cache_get(key: str) -> Optional[Any]:
    """Получает значение из кэша. Возвращает None при промахе или ошибке."""
    try:
        redis = await get_redis()
        if redis is None:
            return None
        value = await redis.get(key)
        if value is None:
            return None
        return json.loads(value)
    except Exception as e:
        logger.warning(f"Cache get error for key={key}: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    """Сохраняет значение в кэш с TTL в секундах. Возвращает True при успехе."""
    try:
        redis = await get_redis()
        if redis is None:
            return False
        await redis.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.warning(f"Cache set error for key={key}: {e}")
        return False


async def cache_delete(key: str) -> bool:
    """Удаляет ключ из кэша."""
    try:
        redis = await get_redis()
        if redis is None:
            return False
        await redis.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Cache delete error for key={key}: {e}")
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """Удаляет все ключи по паттерну (например 'form_template:*').

    Возвращает количество удалённых ключей.
    """
    try:
        redis = await get_redis()
        if redis is None:
            return 0
        keys = await redis.keys(pattern)
        if keys:
            return await redis.delete(*keys)
        return 0
    except Exception as e:
        logger.warning(f"Cache delete pattern error for pattern={pattern}: {e}")
        return 0
