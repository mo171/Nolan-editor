"""
Async Background Task Worker
==============================
v1: Simple asyncio fire-and-forget tasks.
v2 path: Replace with Celery + Redis for distributed processing.

Design rules:
  - NLP tasks must NEVER block the HTTP response
  - Failures are logged but NOT propagated to the client
  - Each task is idempotent (safe to re-run on crash/retry)
"""

import asyncio
import logging

logger = logging.getLogger("nolan.worker")


async def _safe_run(coro, task_name: str):
    """Wraps a coroutine with error handling so crashes don't kill the event loop."""
    try:
        await coro
    except Exception as e:
        logger.error(f"[Worker] Task '{task_name}' failed: {e}", exc_info=True)


def fire_and_forget(coro, task_name: str = "unnamed"):
    """
    Schedule a coroutine as a background task.
    Errors are caught and logged — never propagated.

    Usage:
        fire_and_forget(process_scene(scene_id, project_id), "nlp_scene")
    """
    asyncio.create_task(_safe_run(coro, task_name))


async def process_scene_pipeline(scene_id: str, project_id: str):
    """
    Full pipeline for one saved scene. Called by fire_and_forget.
    """
    logger.info(f"[Worker] Starting pipeline: scene={scene_id}")

    try:
        from services.nlp.scene_processor import run_scene_nlp
        await run_scene_nlp(scene_id, project_id)
        logger.info(f"[Worker] Pipeline complete: scene={scene_id}")

    except Exception as e:
        logger.error(f"[Worker] Pipeline error scene={scene_id}: {e}", exc_info=True)
