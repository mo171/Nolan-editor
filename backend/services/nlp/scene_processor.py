"""
Scene Processor — Full NLP Orchestrator
=========================================
Called by lib/worker.py after every scene save.
Chains all NLP steps for a single scene:

  1. Fetch scene content from Supabase
  2. Strip HTML → plain_text
  3. spaCy entity extraction (NER + SVO)
  4. BERT sentiment + emotion (stubs until Phase 4)
  5. Arc detection (stub until Phase 4)
  6. Write results to scene_nlp_analysis table
  7. Update scene.nlp_processed + bert_processed flags
  8. Push entities to Neo4j (stub until Phase 6)
  9. Index chunks in Supabase pgvector (stub until Phase 3)
  10. WebSocket broadcast to frontend

This file is the INTEGRATION point — each service just gets called here.
"""

import logging
from datetime import datetime, timezone

from lib.supabase import supabase
from lib.redis_client import cache
from tools.html_stripper import strip_html
from services.nlp.entity_extractor import extract_entities, result_to_dict

logger = logging.getLogger("nolan.nlp.processor")


async def run_scene_nlp(scene_id: str, project_id: str) -> dict:
    """
    Full NLP pipeline for one scene.
    Returns the analysis result dict (also written to Supabase).
    """
    logger.info(f"[Processor] Starting NLP for scene={scene_id}")

    # ── Step 1: Fetch scene ───────────────────────────────────────────────────
    res = supabase.table("scenes").select(
        "id, content, plain_text, chapter_id"
    ).eq("id", scene_id).single().execute()

    if not res.data:
        logger.error(f"[Processor] Scene {scene_id} not found in DB")
        return {}

    scene = res.data
    content = scene.get("content", "")
    plain_text = scene.get("plain_text") or strip_html(content)

    if not plain_text.strip():
        logger.info(f"[Processor] Scene {scene_id} is empty — skipping NLP")
        return {}

    # ── Step 2: spaCy entity extraction ──────────────────────────────────────
    extraction = extract_entities(plain_text)
    extraction_dict = result_to_dict(extraction)

    # ── Step 3: BERT sentiment (stub — Phase 4 fills this in) ────────────────
    sentiment_score = 0.0
    sentiment_label = "neutral"
    dominant_emotion = "neutral"
    emotion_breakdown = {}
    # from services.bert.sentiment_analyzer import analyze_sentiment
    # sentiment = await analyze_sentiment(plain_text)

    # ── Step 4: BERT arc detection (stub — Phase 4) ───────────────────────────
    arc_change_detected = False
    arc_change_detail = None
    # from services.bert.arc_detector import detect_arc_change
    # arc = await detect_arc_change(project_id, scene_id, extraction.scene_characters, ...)

    # ── Step 5: Upsert scene_nlp_analysis ────────────────────────────────────
    analysis_row = {
        "scene_id": scene_id,
        "entities": extraction_dict["entities"],
        "svo_triples": extraction_dict["svo_triples"],
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "emotion_tags": [],
        "dominant_emotion": dominant_emotion,
        "emotion_breakdown": emotion_breakdown,
        "detected_characters": extraction.scene_characters,
        "detected_locations": extraction.scene_locations,
        "arc_change_detected": arc_change_detected,
        "arc_change_detail": arc_change_detail,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase.table("scene_nlp_analysis").upsert(
        analysis_row, on_conflict="scene_id"
    ).execute()

    # ── Step 6: Mark scene as processed ──────────────────────────────────────
    supabase.table("scenes").update({
        "nlp_processed": True,
        "last_processed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", scene_id).execute()

    # ── Step 7: Cache the fresh analysis result ───────────────────────────────
    await cache.set_scene_analysis(scene_id, analysis_row)
    await cache.invalidate_characters(project_id)  # character cards may have changed

    # ── Step 8: Neo4j graph update (stub — Phase 6) ───────────────────────────
    # from services.graph.graph_service import update_graph
    # await update_graph(project_id, scene_id, extraction)

    # ── Step 9: RAG indexing ──────────────────────────────────────────────────
    from services.rag.indexer import index_scene
    await index_scene(scene_id, project_id, plain_text, analysis_row)

    # ── Step 10: WebSocket broadcast ──────────────────────────────────────────
    from lib.ws_manager import manager
    await manager.push_analysis_ready(project_id, scene_id, {
        "entities": extraction_dict["entities"],
        "detected_characters": extraction.scene_characters,
        "detected_locations": extraction.scene_locations,
        "svo_triples": extraction_dict["svo_triples"],
        "sentiment_label": sentiment_label,
        "dominant_emotion": dominant_emotion,
        "arc_change_detected": arc_change_detected,
    })

    logger.info(
        f"[Processor] Done scene={scene_id} | "
        f"chars={len(extraction.scene_characters)} | "
        f"locs={len(extraction.scene_locations)} | "
        f"SVOs={len(extraction.svo_triples)}"
    )

    return analysis_row
