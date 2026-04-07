"""
Chapters Router
================
Full CRUD for chapters. Position-based ordering supported.
Cascade deletes scenes via DB constraint (ON DELETE CASCADE).
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import logging

from lib.supabase import supabase
from lib.redis_client import cache

router = APIRouter(prefix="/api/chapters", tags=["chapters"])
logger = logging.getLogger("nolan.chapters")


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ChapterCreate(BaseModel):
    project_id: str
    title: str
    position: Optional[int] = None      # auto-appended if None


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    position: Optional[int] = None


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_chapter(payload: ChapterCreate):
    try:
        # Auto-determine position if not provided
        position = payload.position
        if position is None:
            res = supabase.table("chapters").select("position").eq(
                "project_id", payload.project_id
            ).order("position", desc=True).limit(1).execute()
            position = (res.data[0]["position"] + 1) if res.data else 0

        result = supabase.table("chapters").insert({
            "project_id": payload.project_id,
            "title": payload.title,
            "position": position,
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create chapter")

        chapter = result.data[0]
        chapter_id = chapter["id"]

        # Auto-create first scene so chapter is never empty in editor
        supabase.table("scenes").insert({
            "chapter_id": chapter_id,
            "title": "Scene 1",
            "content": "<p>Begin writing...</p>",
            "plain_text": "Begin writing...",
            "position": 0,
        }).execute()

        # Invalidate project meta cache (chapter list changed)
        await cache.invalidate_project_meta(payload.project_id)

        logger.info(f"[Chapters] Created chapter={chapter_id} in project={payload.project_id}")
        return chapter

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Chapters] Create error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{chapter_id}")
async def update_chapter(chapter_id: str, payload: ChapterUpdate):
    try:
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="Nothing to update")

        result = supabase.table("chapters").update(updates).eq("id", chapter_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Chapter not found")

        chapter = result.data[0]

        # Invalidate project meta cache
        proj_res = supabase.table("chapters").select("project_id").eq("id", chapter_id).single().execute()
        if proj_res.data:
            await cache.invalidate_project_meta(proj_res.data["project_id"])

        return chapter

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Chapters] Update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(chapter_id: str):
    """
    Deletes chapter. All scenes cascade-deleted via DB constraint.
    """
    try:
        # Get project_id for cache invalidation before deletion
        ch_res = supabase.table("chapters").select("project_id").eq("id", chapter_id).single().execute()
        project_id = ch_res.data["project_id"] if ch_res.data else None

        supabase.table("chapters").delete().eq("id", chapter_id).execute()

        if project_id:
            await cache.invalidate_project_meta(project_id)

        logger.info(f"[Chapters] Deleted chapter={chapter_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Chapters] Delete error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
