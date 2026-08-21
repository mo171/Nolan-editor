"""
WebSocket Router
==================
Real-time channel between the editor and the AI backend.

Message protocol:
  FE → BE: ghost_request  {cursor_text, scene_id}
  FE → BE: chat_message   {message, history}
  BE → FE: ghost_token    {token}          ← streamed
  BE → FE: ghost_done     {}
  BE → FE: analysis_ready {scene_id, ...}  ← pushed after NLP
  BE → FE: arc_warning    {character, ...}
  BE → FE: error          {message}
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from lib.ws_manager import manager

router = APIRouter(tags=["websocket"])
logger = logging.getLogger("nolan.ws")


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(project_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ghost_request":
                await _handle_ghost_request(websocket, project_id, data)

            elif msg_type == "chat_message":
                await _handle_chat_message(websocket, project_id, data)

            elif msg_type == "ping":
                await manager.send(websocket, {"type": "pong"})

            else:
                await manager.push_error(websocket, f"Unknown message type: {msg_type}")

    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
    except Exception as e:
        logger.error(f"[WS] Unhandled error project={project_id}: {e}", exc_info=True)
        manager.disconnect(project_id, websocket)


# ─── Context loaders (cache-first, DB-backed) ────────────────────────────────
# Ghost text quality depends entirely on these three blobs. Reading them from
# Redis alone means a cold cache (fresh boot, expired TTL, Redis down) produces
# a prompt with no genre, no premise, no characters and no style — the model
# then invents its own world. Each loader falls back to Supabase and re-warms
# the cache so only the first request after a cache miss pays the DB round-trip.

# Columns the ghost prompt actually consumes (see prompt_builder.build_ghost_prompt_vars)
_PROMPT_COLUMNS = (
    "id, title, genre, premise, desired_ending, themes, llm_temperature, "
    "tone, target_audience, setting_description, story_foundation, "
    "conflict_types, tension_tags, inciting_incident"
)

# Dedicated key — deliberately NOT project:{id}:meta, because that key holds the
# full project+chapters payload served by GET /api/projects/{id}. Writing a
# partial row there would corrupt the editor's hydration response.
_PROMPT_SETUP_TTL = 300  # 5 min, matches TTL_PROJECT_META


async def _load_project_setup(project_id: str) -> dict:
    """Project boilerplate for the prompt. Cache → DB → warm cache."""
    from lib.redis_client import cache

    # The full meta blob is a superset of what we need — use it when it's hot.
    meta = await cache.get_project_meta(project_id)
    if meta:
        return meta

    setup = await cache.get_json(f"project:{project_id}:prompt_setup")
    if setup:
        return setup

    try:
        from lib.supabase import supabase
        res = supabase.table("projects").select(_PROMPT_COLUMNS).eq(
            "id", project_id
        ).single().execute()
        setup = res.data or {}
    except Exception as e:
        logger.error(f"[WS] Project setup DB fallback failed project={project_id}: {e}")
        return {}

    if setup:
        await cache.set_json(
            f"project:{project_id}:prompt_setup", setup, _PROMPT_SETUP_TTL
        )
        logger.info(f"[WS] Project setup loaded from DB (cache was cold) project={project_id}")
    return setup


async def _load_dna(project_id: str) -> dict:
    """Style DNA fingerprint. Cache → DB → warm cache."""
    from lib.redis_client import cache

    dna = await cache.get_dna(project_id)
    if dna:
        return dna

    try:
        from lib.supabase import supabase
        res = supabase.table("projects").select("dna_fingerprint").eq(
            "id", project_id
        ).single().execute()
        dna = (res.data or {}).get("dna_fingerprint") or {}
    except Exception as e:
        logger.error(f"[WS] DNA DB fallback failed project={project_id}: {e}")
        return {}

    if dna:
        await cache.set_dna(project_id, dna)
    return dna


async def _load_scene_analysis(scene_id: str) -> dict:
    """Latest NLP/BERT analysis for the scene. Cache → DB → warm cache."""
    from lib.redis_client import cache

    if not scene_id:
        return {}

    analysis = await cache.get_scene_analysis(scene_id)
    if analysis:
        return analysis

    try:
        from lib.supabase import supabase
        res = supabase.table("scene_nlp_analysis").select("*").eq(
            "scene_id", scene_id
        ).limit(1).execute()
        rows = res.data or []
        analysis = rows[0] if rows else {}
    except Exception as e:
        logger.error(f"[WS] Scene analysis DB fallback failed scene={scene_id}: {e}")
        return {}

    if analysis:
        await cache.set_scene_analysis(scene_id, analysis)
    return analysis


# ─── Handlers (stubs — filled in Phase 5) ────────────────────────────────────

async def _handle_ghost_request(websocket: WebSocket, project_id: str, data: dict):
    """
    Full dual-RAG ghost text pipeline.
      0. Minimum-text gate: skip if writer hasn't written enough yet
      1. RAG-1 (narrative) + RAG-2 (DNA) retrieval with similarity gating
      2. LangChain prompt build + OpenAI stream
      3. Token-by-token push to editor
    """
    cursor_text = data.get("cursor_text", "")
    scene_id    = data.get("scene_id", "")

    # ── 0. Minimum-text gate ────────────────────────────────────────────────
    # Ghost text needs *some* context, but we trigger much earlier now (7 words)
    # so suggestions are helpful as soon as the user finishes a short sentence constraint.
    word_count = len(cursor_text.split())
    if word_count < 7:
        logger.info(f"[WS] Ghost skipped — too short (words={word_count})")
        await manager.send(websocket, {"type": "ghost_skipped", "reason": "too_short"})
        return

    # ── 1. Retrieval (with similarity gating inside retriever) ─────────────
    from services.rag.retriever import retrieve
    try:
        narrative_chunks = await retrieve(cursor_text, project_id, mode="narrative", match_count=8)
        dna_chunks       = await retrieve(cursor_text, project_id, mode="dna",       match_count=3)
    except Exception as e:
        logger.error(f"[WS] RAG retrieval failed: {e}")
        narrative_chunks, dna_chunks = [], []

    # ── 2. Get Project Meta (cache → DB fallback) ───────────────────────────
    # A cold or unavailable Redis must NEVER silently strip the prompt of its
    # world facts. Without these, prompt_builder falls back to "Literary
    # Fiction" / "Not specified" and the model writes ungrounded prose that
    # ignores the user's genre, tone, premise, themes and temperature.
    project_setup   = await _load_project_setup(project_id)
    dna_fingerprint = await _load_dna(project_id)
    scene_analysis  = await _load_scene_analysis(scene_id)

    scene_emotion = scene_analysis.get("dominant_emotion", "neutral")
    # Use project's stored temperature, default to 0.5 (tighter outputs)
    temperature   = project_setup.get("llm_temperature", 0.5)

    # ── 3. Fetch Characters (with traits for richer boilerplate) ────────────
    from lib.supabase import supabase
    char_res   = supabase.table("project_characters").select(
        "name, role, description, traits"
    ).eq("project_id", project_id).execute()
    characters = char_res.data or []

    # ── 4. Build hierarchical prompt variables ──────────────────────────────
    from services.llm.prompt_builder import build_ghost_prompt_vars
    from services.llm.chain import stream_ghost_text

    prompt_vars = build_ghost_prompt_vars(
        project_setup=project_setup,        # now includes tone, setting_description, etc.
        dna_fingerprint=dna_fingerprint,
        narrative_chunks=narrative_chunks,
        dna_chunks=dna_chunks,
        characters=characters,
        scene_emotion=scene_emotion,
        cursor_text=cursor_text[-800:],     # bumped from 500 → 800 chars
    )

    # ── 5. Stream to Frontend ───────────────────────────────────────────────
    logger.info(
        f"[WS] Ghost request: project={project_id} scene={scene_id} "
        f"narrative_chunks={len(narrative_chunks)} dna_chunks={len(dna_chunks)} "
        f"temperature={temperature} → Streaming"
    )
    try:
        async for token in stream_ghost_text(prompt_vars, temperature=temperature):
            await manager.push_ghost_token(websocket, token)
    except Exception as e:
        logger.error(f"[WS] Ghost stream error: {e}")
        await manager.push_error(websocket, "Failed to generate ghost text.")
    finally:
        await manager.push_ghost_done(websocket)


async def _handle_chat_message(websocket: WebSocket, project_id: str, data: dict):
    """
    RAG-powered chatbot.
    Phase 5 fills this in with retriever + LangChain streaming.
    """
    message = data.get("message", "")

    # Placeholder until Phase 5
    await manager.send(websocket, {
        "type": "chat_token",
        "token": f"[Chatbot not yet active — you asked: '{message[:30]}']"
    })
    await manager.send(websocket, {"type": "chat_done"})

    logger.info(f"[WS] Chat message: project={project_id}")
