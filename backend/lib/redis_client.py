"""
Redis Cache Client — Low Latency Layer
=======================================
Strategy:
  - Hot reads (DNA, character cards, NLP results) are cached in Redis
  - Eliminates repeated Supabase round-trips for the ghost text hot path
  - TTLs are tuned per data volatility

Cache Keys:
  project:{id}:meta          → project metadata         TTL: 5 min
  project:{id}:dna           → DNA fingerprint          TTL: 30 min (rarely changes)
  project:{id}:characters    → all character cards list TTL: 2 min
  character:{pid}:{name}     → single character card    TTL: 2 min
  scene:{id}:analysis        → NLP/BERT results         TTL: 10 min
  scene:{id}:content         → plain_text cache         TTL: 5 min
"""

import json
import os
import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv()

# ─── TTL constants (seconds) ────────────────────────────────────────────────
TTL_PROJECT_META = 300        # 5 min
TTL_DNA = 1800                # 30 min
TTL_CHARACTER_CARDS = 120     # 2 min
TTL_SCENE_ANALYSIS = 600      # 10 min
TTL_SCENE_CONTENT = 300       # 5 min


class RedisCache:
    """Async Redis wrapper with typed helper methods."""

    def __init__(self):
        self._client: aioredis.Redis | None = None

    async def connect(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client = aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        # Ping to verify connection
        await self._client.ping()

    async def disconnect(self):
        if self._client:
            await self._client.aclose()

    # ─── Core helpers ────────────────────────────────────────────────────────

    async def get_json(self, key: str) -> dict | list | None:
        """Get a JSON-serialized value. Returns None on cache miss."""
        if not self._client:
            return None
        try:
            raw = await self._client.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            return None

    async def set_json(self, key: str, value: dict | list, ttl: int = 300):
        """Store a JSON-serializable value with TTL."""
        if not self._client:
            return
        try:
            await self._client.setex(key, ttl, json.dumps(value))
        except Exception:
            pass  # Cache failures must never crash the app

    async def delete(self, key: str):
        if not self._client:
            return
        try:
            await self._client.delete(key)
        except Exception:
            pass

    async def delete_pattern(self, pattern: str):
        """Delete all keys matching a glob pattern. Use carefully."""
        if not self._client:
            return
        try:
            keys = await self._client.keys(pattern)
            if keys:
                await self._client.delete(*keys)
        except Exception:
            pass

    # ─── Typed helpers (used throughout the app) ─────────────────────────────

    async def get_project_meta(self, project_id: str) -> dict | None:
        return await self.get_json(f"project:{project_id}:meta")

    async def set_project_meta(self, project_id: str, data: dict):
        await self.set_json(f"project:{project_id}:meta", data, TTL_PROJECT_META)

    async def invalidate_project_meta(self, project_id: str):
        await self.delete(f"project:{project_id}:meta")

    async def get_dna(self, project_id: str) -> dict | None:
        return await self.get_json(f"project:{project_id}:dna")

    async def set_dna(self, project_id: str, dna: dict):
        await self.set_json(f"project:{project_id}:dna", dna, TTL_DNA)

    async def invalidate_dna(self, project_id: str):
        await self.delete(f"project:{project_id}:dna")

    async def invalidate_user_projects(self, user_id: str):
        """Invalidate the user's project list cache (call after create/delete)."""
        await self.delete(f"user_projects:{user_id}")

    async def get_character_card(self, project_id: str, name: str) -> dict | None:
        key = f"character:{project_id}:{name.lower()}"
        return await self.get_json(key)

    async def set_character_card(self, project_id: str, name: str, card: dict):
        key = f"character:{project_id}:{name.lower()}"
        await self.set_json(key, card, TTL_CHARACTER_CARDS)

    async def invalidate_characters(self, project_id: str):
        """Call after a scene NLP run updates character states."""
        await self.delete_pattern(f"character:{project_id}:*")

    async def get_scene_analysis(self, scene_id: str) -> dict | None:
        return await self.get_json(f"scene:{scene_id}:analysis")

    async def set_scene_analysis(self, scene_id: str, analysis: dict):
        await self.set_json(f"scene:{scene_id}:analysis", analysis, TTL_SCENE_ANALYSIS)

    async def invalidate_scene(self, scene_id: str):
        await self.delete(f"scene:{scene_id}:analysis")
        await self.delete(f"scene:{scene_id}:content")


# ─── Singleton ───────────────────────────────────────────────────────────────
cache = RedisCache()
