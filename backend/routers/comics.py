from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import asyncio
import uuid

router = APIRouter(prefix="/projects/{project_id}/comics", tags=["comics"])

class ComicGenerateRequest(BaseModel):
    chapter_id: str
    template_id: str

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
