"""
Scenes Router
==============
Core content endpoint. PUT /content is the most critical route —
it saves the scene AND fires the NLP background pipeline.

Low latency design:
  - HTTP response returns immediately after DB save
  - NLP pipeline runs async in background (fire_and_forget)
  - GET /analysis serves from Redis cache (10min TTL)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import uuid
import logging

from lib.supabase import supabase
from lib.redis_client import cache
from lib.worker import fire_and_forget, process_scene_pipeline
from tools.html_stripper import strip_html, count_words

router = APIRouter(prefix="/api/scenes", tags=["scenes"])
logger = logging.getLogger("nolan.scenes")


# ─── Schemas ─────────────────────────────────────────────────────────────────

class SceneCreate(BaseModel):
    chapter_id: str
    title: str = "New Scene"
    position: Optional[int] = None


class SceneContentUpdate(BaseModel):
    content: str                         # Tiptap HTML
    project_id: str                      # needed to trigger NLP worker


class SceneTitleUpdate(BaseModel):
    title: str


class SceneImageRequest(BaseModel):
    """
    Request body for scene-based comic art generation.
    The scene text is re-read from Supabase (not re-sent) to ensure
    we use the latest saved version.
    """
    project_id: str
    art_style: Optional[str] = ""      # e.g. "noir", "watercolor manga"


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_scene(payload: SceneCreate):
    try:
        position = payload.position
        if position is None:
            res = supabase.table("scenes").select("position").eq(
                "chapter_id", payload.chapter_id
            ).order("position", desc=True).limit(1).execute()
            position = (res.data[0]["position"] + 1) if res.data else 0

        result = supabase.table("scenes").insert({
            "chapter_id": payload.chapter_id,
            "title": payload.title,
            "content": "<p>Begin writing...</p>",
            "plain_text": "Begin writing...",
            "position": position,
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create scene")

        logger.info(f"[Scenes] Created scene={result.data[0]['id']}")
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Scenes] Create error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{scene_id}")
async def get_scene(scene_id: str):
    try:
        result = supabase.table("scenes").select("*").eq("id", scene_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Scene not found")
        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{scene_id}/content")
async def save_scene_content(scene_id: str, payload: SceneContentUpdate):
    """
    THE CRITICAL ROUTE.
    1. Strip HTML → plain_text, count words
    2. Save to Supabase (async, returns fast)
    3. Fire background NLP pipeline
    4. Invalidate scene analysis cache
    Returns immediately — user is never blocked.
    """
    try:
        # Validate UUID to prevent DB syntax errors
        try:
            uuid.UUID(scene_id)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid scene ID format: {scene_id}")

        plain_text = strip_html(payload.content)
        word_count = count_words(payload.content)

        result = supabase.table("scenes").update({
            "content": payload.content,
            "plain_text": plain_text,
            "word_count": word_count,
            "nlp_processed": False,         # mark as pending re-processing
            "bert_processed": False,
        }).eq("id", scene_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Scene not found")

        # Invalidate stale NLP cache for this scene
        await cache.invalidate_scene(scene_id)

        # 🔥 Fire NLP pipeline — does NOT block the response
        # Debounce: only trigger the massive pipeline if we have over 5 words
        # to prevent burning API/CPU on every single word typed.
        if word_count > 5:
            fire_and_forget(
                process_scene_pipeline(scene_id, payload.project_id),
                task_name=f"nlp_scene_{scene_id}"
            )
        else:
            logger.info(f"[Scenes] Skipped NLP for scene={scene_id} — word_count ({word_count}) < 50")

        logger.info(f"[Scenes] Saved scene={scene_id} words={word_count}, NLP queued")

        return {
            "scene_id": scene_id,
            "word_count": word_count,
            "status": "saved",
            "nlp_status": "queued",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Scenes] Content save error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{scene_id}/title")
async def update_scene_title(scene_id: str, payload: SceneTitleUpdate):
    try:
        result = supabase.table("scenes").update(
            {"title": payload.title}
        ).eq("id", scene_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Scene not found")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{scene_id}/analysis")
async def get_scene_analysis(scene_id: str):
    """
    Returns NLP/BERT analysis results for a scene.
    Served from Redis cache when available (10 min TTL).
    """
    # Cache hit — fast path
    cached = await cache.get_scene_analysis(scene_id)
    if cached:
        return {**cached, "source": "cache"}

    try:
        result = supabase.table("scene_nlp_analysis").select("*").eq(
            "scene_id", scene_id
        ).single().execute()

        if not result.data:
            return {"scene_id": scene_id, "status": "pending", "message": "NLP not yet run"}

        analysis = result.data
        await cache.set_scene_analysis(scene_id, analysis)  # warm the cache

        return {**analysis, "source": "db"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Scenes] Analysis fetch error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scene(scene_id: str):
    try:
        await cache.invalidate_scene(scene_id)
        
        # Safety: Nullify character references to this specific scene
        supabase.table("characters")\
            .update({"first_seen_scene_id": None})\
            .eq("first_seen_scene_id", scene_id)\
            .execute()
            
        supabase.table("scenes").delete().eq("id", scene_id).execute()
        logger.info(f"[Scenes] Deleted scene={scene_id}")
    except Exception as e:
        logger.error(f"[Scenes] Delete error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{scene_id}/generate-image")
async def generate_scene_art(scene_id: str, payload: SceneImageRequest):
    """
    Generates a comic art panel representing the current state of a scene.
    Pulls the latest saved plain_text from Supabase, extracts visual 
    understanding, and calls GPT Image via the Visual Director pipeline.
    """
    try:
        # 1. Fetch the scene text
        scene_res = supabase.table("scenes").select("plain_text").eq("id", scene_id).single().execute()
        if not scene_res.data:
            raise HTTPException(status_code=404, detail="Scene not found")
        
        scene_text = scene_res.data.get("plain_text", "")
        if not scene_text or len(scene_text.split()) < 10:
            raise HTTPException(status_code=400, detail="Scene needs more text to visualize")

        # 2. Fetch project characters for visual consistency injection
        pc_res = supabase.table("project_characters").select(
            "name, role, description, traits, ai_visual_summary"
        ).eq("project_id", payload.project_id).execute()
        characters = pc_res.data or []

        # 3. Import and call Visual Director pipeline
        from services.images.visual_director import generate_scene_image
        from pathlib import Path
        import os
        
        logger.info(f"[Scenes] Requesting cinematic image for scene={scene_id}")
        img_bytes = await generate_scene_image(scene_text, characters, payload.art_style)

        if not img_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate image bytes")

        # 4. Save locally
        base_dir = Path(__file__).parent.parent.parent
        comic_dir = base_dir / "frontend" / "public" / "comics"
        comic_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"scene_{scene_id[:8]}_{uuid.uuid4().hex[:6]}.png"
        filepath = comic_dir / filename
        
        with open(filepath, "wb") as f:
            f.write(img_bytes)
            
        public_url = f"/comics/{filename}"
        
        # 5. Optionally link it to the scene (upsert to comic_panels table 
        # so it persists in the project data, not just local disk)
        supabase.table("comic_panels").upsert({
            "scene_id": scene_id,
            "project_id": payload.project_id,
            "image_url": public_url,
            "image_prompt": f"[GPT Image via Scene Trigger]"
        }, on_conflict="scene_id").execute()

        return {"url": public_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Scenes] Failed to generate scene art: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
