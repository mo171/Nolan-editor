from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import asyncio
import uuid

router = APIRouter(prefix="/projects/{project_id}/comics", tags=["comics"])

class ComicGenerateRequest(BaseModel):
    chapter_id: str
    template_id: str

class RegeneratePanelRequest(BaseModel):
    custom_prompt: Optional[str] = None          # Free-form user override description
    panel_context: Optional[dict] = None          # Original structured scene data (fallback)

@router.get("/templates")
async def get_templates(project_id: str):
    """Return available comic templates"""
    # Mocked for UI development, in prod fetch from Supabase
    return {
        "status": "success",
        "templates": [
            {
                "id": "single_panel",
                "name": "Classic Single Panel",
                "description": "A single large dramatic comic panel.",
                "thumbnail_url": "/templates/single.png"
            },
            {
                "id": "dual_panel_v",
                "name": "Split Two-Panel",
                "description": "Two panels stacked vertically. Best for dialogue.",
                "thumbnail_url": "/templates/split.png"
            }
        ]
    }

from services.comic.pipeline import generate_comic_for_chapter

@router.post("/generate")
async def generate_comic(project_id: str, request: ComicGenerateRequest):
    """
    Kicks off the pipeline: Scenes -> LLM -> Image -> DB.
    """
    try:
        # Note: If chapter_id is "all" or something, handle it accordingly.
        # This will query the DB, hit OpenAI, save the result, and return the DB record.
        comic_data = await generate_comic_for_chapter(project_id, request.chapter_id, request.template_id)
        
        return {
            "status": "success",
            "message": "Comic generated successfully.",
            "comic": comic_data
        }
    except Exception as e:
        # In case of DB or Pipeline fatal error, log and return. No worries if we fallback.
        import logging
        logging.getLogger("nolan.comic.router").error(f"Comic gen failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from services.comic.pdf_exporter import generate_comic_pdf

@router.post("/{comic_id}/export")
async def export_comic_pdf_endpoint(project_id: str, comic_id: str):
    """
    Assembles all panels into a multi-page PDF comic book and returns the download link.
    """
    try:
        pdf_url = await generate_comic_pdf(project_id, comic_id)
        return {
            "status": "success",
            "pdf_url": pdf_url
        }
    except Exception as e:
        import logging
        logging.getLogger("nolan.comic.router").error(f"PDF Export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export PDF: {str(e)}")

@router.put("/panels/{panel_id}")
async def update_panel(project_id: str, panel_id: str, payload: dict):
    """
    Used for the EDIT step (updating text, regenerating image).
    """
    return {
        "status": "success",
        "message": "Panel updated",
        "panel": payload
    }


from services.comic.pipeline import generate_image, process_scene
from lib.supabase import supabase
import os, uuid as _uuid
from pathlib import Path

@router.post("/panels/{panel_id}/regenerate")
async def regenerate_panel_image(project_id: str, panel_id: str, request: RegeneratePanelRequest):
    """
    Re-generates the image for a single panel.

    If `custom_prompt` is provided by the user it is used directly (bypassing
    the LLM scene-structurer) to give the user full creative control.
    Otherwise the stored panel context is re-run through the normal pipeline.
    """
    import logging
    logger = logging.getLogger("nolan.comic.router")

    try:
        # ── 1. Fetch project characters for visual consistency ─────────────────
        project_characters = []
        try:
            pc_res = supabase.table("project_characters").select(
                "name, role, description, traits, ai_visual_summary"
            ).eq("project_id", project_id).execute()
            project_characters = pc_res.data or []
        except Exception as e:
            logger.warning(f"[Regen] Could not fetch characters: {e}")

        new_image_url: str

        if request.custom_prompt and request.custom_prompt.strip():
            # ── 2a. Custom-prompt path ─────────────────────────────────────────
            # Directly drive the Visual Director with the user's own words.
            from services.images.visual_director import (
                build_visual_profile,
                build_cinematic_prompt,
                generate_gpt_image,
            )

            profiles = {}
            for pc in project_characters:
                if pc.get("name"):
                    profiles[pc["name"]] = build_visual_profile(pc)

            # Wrap the user's description in a minimal scene_understanding so
            # the Visual Director can enrich it with its standard pipeline.
            scene_understanding = {
                "characters":   [],
                "environment":  request.custom_prompt,
                "mood":         "dramatic",
                "lighting":     "cinematic",
                "camera_angle": "",
                "time_of_day":  "",
                "key_action":   request.custom_prompt,
                "color_palette": "",
                "style_notes":  "",
            }

            art_style = "cinematic graphic novel, bold expressive ink lines, dramatic chiaroscuro lighting, rich color grading, 8K comic art"
            prompt = await build_cinematic_prompt(scene_understanding, profiles, art_style)
            if not prompt:
                prompt = (
                    f"{request.custom_prompt}. "
                    "Cinematic graphic novel style, bold ink lines, rich colors, moody lighting. "
                    "No text, no speech bubbles, no captions, no watermarks."
                )

            logger.info(f"[Regen] Custom-prompt path | prompt[:120]: {prompt[:120]}...")
            img_bytes = await generate_gpt_image(prompt)

            # Save locally
            COMIC_DIR = Path(__file__).parent.parent.parent / "frontend" / "public" / "comics"
            COMIC_DIR.mkdir(parents=True, exist_ok=True)
            filename = f"panel_{_uuid.uuid4().hex[:12]}.png"
            with open(COMIC_DIR / filename, "wb") as f:
                f.write(img_bytes)
            new_image_url = f"/comics/{filename}"

        else:
            # ── 2b. Re-run the normal pipeline from scene context ──────────────
            context = request.panel_context or {}
            scene_text = context.get("scene_text") or context.get("key_action") or "A dramatic comic panel."
            structured  = await process_scene(scene_text)
            new_image_url = await generate_image(structured, project_characters)

        # ── 3. Update the panel record in Supabase (best-effort) ──────────────
        try:
            supabase.table("comic_panels").update(
                {"image_url": new_image_url}
            ).eq("id", panel_id).execute()
        except Exception as e:
            logger.warning(f"[Regen] DB update skipped (panel may be local-only): {e}")

        return {
            "status":    "success",
            "image_url": new_image_url,
            "panel_id":  panel_id,
        }

    except Exception as e:
        logger.error(f"[Regen] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
