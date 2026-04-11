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
        narrative_chunks = await retrieve(cursor_text, project_id, mode="narrative", match_count=4)
        dna_chunks       = await retrieve(cursor_text, project_id, mode="dna",       match_count=2)
    except Exception as e:
        logger.error(f"[WS] RAG retrieval failed: {e}")
        narrative_chunks, dna_chunks = [], []

    # ── 2. Get Project Meta (cached) ────────────────────────────────────────
    from lib.redis_client import cache
    project_setup  = await cache.get_project_meta(project_id) or {}
    dna_fingerprint = await cache.get_dna(project_id) or {}
    scene_analysis  = await cache.get_scene_analysis(scene_id) or {}

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
