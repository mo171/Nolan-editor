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
    Full 10-Step NLP pipeline for one scene.
    Ensures sequential dependency integrity and clear audit trails.
    """
    logger.info(f"[Processor] Starting NLP for scene={scene_id}")

    # ── Step 1: INGESTION ───────────────────────────────────────────────────
    res = supabase.table("scenes").select(
        "id, title, content, plain_text, chapter_id"
    ).eq("id", scene_id).single().execute()

    if not res.data:
        logger.error(f"[Processor] Scene {scene_id} not found in DB")
        return {}

    scene = res.data
    title = scene.get("title")
    content = scene.get("content", "")
    plain_text = scene.get("plain_text") or strip_html(content)

    if not plain_text.strip():
        logger.info(f"[Processor] Scene {scene_id} is empty — skipping NLP")
        return {}

    # ── Step 2: ENTITY EXTRACTION ──────────────────────────────────────────
    extraction = extract_entities(plain_text)
    extraction_dict = result_to_dict(extraction)

    # ── Step 3: SENTIMENT & EMOTION (BERT) ───────────────────────────────────
    from services.bert.sentiment_analyzer import analyze_sentiment
    from services.bert.emotion_classifier import classify_emotion

    sentiment_res = analyze_sentiment(plain_text)
    sentiment_score = sentiment_res.get("score", 0.0)
    sentiment_label = sentiment_res.get("label", "neutral")

    emotion_res = classify_emotion(plain_text)
    dominant_emotion = emotion_res.get("dominant_emotion", "neutral")
    emotion_breakdown = emotion_res.get("breakdown", {})
    # Generate array of relevant emotion tags (score > 0.2)
    emotion_tags = [k for k, v in emotion_breakdown.items() if v > 0.2 and k != "neutral"]

    # ── Step 4: ARC VOLATILITY CHECK ─────────────────────────────────────────
    from services.bert.arc_detector import detect_arc_change
    arc_warnings = []
    word_count = len(plain_text.split())

    # Canonicalize character names against the Main Cast list (+ fetch traits)
    try:
        pc_res = supabase.table("project_characters").select("name, traits, description").eq("project_id", project_id).execute()
        pc_map = {c["name"].lower(): c for c in (pc_res.data or [])}
    except Exception:
        pc_map = {}

    normalized_chars = []
    for c_name in extraction.scene_characters:
        if not c_name.strip(): continue
        lower_name = c_name.lower()
        canon_name = pc_map.get(lower_name, {}).get("name") or (c_name.title() if c_name.islower() else c_name)
        if canon_name not in normalized_chars:
            normalized_chars.append(canon_name)
    
    # Sync extraction objects with canonical names for downstream Graph/WS use
    extraction.scene_characters = normalized_chars
    extraction_dict["detected_characters"] = normalized_chars

    # ── Step 5: ROW INITIALIZATION ───────────────────────────────────────────
    analysis_row = {
        "scene_id": scene_id,
        "entities": extraction_dict["entities"],
        "svo_triples": extraction_dict["svo_triples"],
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "emotion_tags": emotion_tags,
        "dominant_emotion": dominant_emotion,
        "emotion_breakdown": emotion_breakdown,
        "detected_characters": normalized_chars,
        "detected_locations": extraction.scene_locations,
        "arc_change_detected": False,  # Updated after character loop
        "arc_change_detail": None,      # Updated after character loop
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    # ── Step 6: METADATA UPDATE ─────────────────────────────────────────────
    supabase.table("scenes").update({
        "nlp_processed": True,
        "last_processed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", scene_id).execute()

    # ── Step 7: CORE PERSISTENCE & CHAR UPDATES ──────────────────────────────
    for char_name in normalized_chars:
        try:
            char_res = supabase.table("characters").select("id, total_mentions, last_known_emotion").eq(
                "project_id", project_id
            ).eq("name", char_name).limit(1).execute()

            traits = pc_map.get(char_name.lower(), {}).get("traits", [])

            if char_res.data:
                char_data = char_res.data[0]
                # Check for volatility AND persona consistency before updating state
                arc_res = detect_arc_change(
                    char_name=char_name, 
                    current_text=plain_text,
                    current_emotion=dominant_emotion, 
                    last_known_emotion=char_data.get("last_known_emotion"),
                    traits=traits,
                    word_count=word_count
                )
                if arc_res and arc_res.get("arc_change_detected"):
                    arc_warnings.append(arc_res)

                supabase.table("characters").update({
                    "total_mentions": (char_data.get("total_mentions") or 0) + 1,
                    "last_known_emotion": dominant_emotion,
                    "last_known_location": extraction.scene_locations[-1] if extraction.scene_locations else None,
                }).eq("id", char_data["id"]).execute()
            else:
                # First time seeing this (discovered) character - check if they match any traits if we had any
                arc_res = detect_arc_change(
                    char_name=char_name, 
                    current_text=plain_text,
                    current_emotion=dominant_emotion, 
                    traits=traits,
                    word_count=word_count
                )
                if arc_res and arc_res.get("arc_change_detected"):
                    arc_warnings.append(arc_res)

                res = supabase.table("characters").insert({
                    "project_id": project_id,
                    "name": char_name,
                    "first_seen_scene_id": scene_id,
                    "total_mentions": 1,
                    "last_known_emotion": dominant_emotion,
                    "last_known_location": extraction.scene_locations[-1] if extraction.scene_locations else None,
                    "user_defined": False,
                }).execute()

                # ── Auto-Generate AI Avatar for Discovered Character ──
                if res.data:
                    from services.images.dalle_service import generate_character_image
                    from lib.worker import fire_and_forget
                    fire_and_forget(
                        generate_character_image(project_id, char_name, description="Newly discovered character"),
                        task_name=f"dalle_gen_{project_id}_{char_name}"
                    )
        except Exception as e:
            logger.warning(f"[Processor] Character update failed for '{char_name}': {e}")

    # Patch analysis_row with results from character sweep
    analysis_row["arc_change_detected"] = len(arc_warnings) > 0
    analysis_row["arc_change_detail"] = arc_warnings[0] if arc_warnings else None

    # Final DB Write + Cache update
    supabase.table("scene_nlp_analysis").upsert(analysis_row, on_conflict="scene_id").execute()
    await cache.set_scene_analysis(scene_id, analysis_row)
    await cache.invalidate_characters(project_id)

    # ── Step 8: GRAPH UPSERT ───────────────────────────────────────────────
    from services.graph.graph_service import update_graph
    
    # Human-readable title or 3-word summary fallback
    clean_title = title
    if not clean_title or len(clean_title) < 3 or clean_title.startswith("sc-"):
        # Auto-generate 3-word summary from first sentence
        words = plain_text.strip().split()
        clean_title = " ".join(words[:3]) + "..." if len(words) > 3 else " ".join(words)
    
    await update_graph(project_id, scene_id, extraction, dominant_emotion=dominant_emotion, scene_title=clean_title)

    # ── Step 9: VECTOR INDEXING (RAG) ───────────────────────────────────────
    from services.rag.indexer import index_scene
    await index_scene(scene_id, project_id, plain_text, analysis_row)

    # ── Step 10: BROADCAST ──────────────────────────────────────────────────
    from lib.ws_manager import manager
    await manager.push_analysis_ready(project_id, scene_id, {
        "entities": extraction_dict["entities"],
        "detected_characters": normalized_chars,
        "detected_locations": extraction.scene_locations,
        "svo_triples": extraction_dict["svo_triples"],
        "sentiment_label": sentiment_label,
        "dominant_emotion": dominant_emotion,
        "arc_change_detected": analysis_row["arc_change_detected"],
        "arc_warnings": arc_warnings
    })

    logger.info(f"[Processor] Done scene={scene_id} | chars={len(normalized_chars)} | SVOs={len(extraction.svo_triples)}")
    return analysis_row

