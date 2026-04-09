"""
Projects Router
================
Handles all project CRUD operations plus the setup wizard payload.
Redis cache is used for hot reads — invalidated on any mutation.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import logging

from lib.supabase import supabase
from lib.redis_client import cache


router = APIRouter(prefix="/api/projects", tags=["projects"])
logger = logging.getLogger("nolan.projects")

# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class CharacterInput(BaseModel):
    name: str
    role: Optional[str] = None          # protagonist | antagonist | supporting
    description: Optional[str] = None
    traits: Optional[list[str]] = []


class ProjectCreate(BaseModel):
    user_id: str                         # comes from Supabase auth JWT (you'll inject later)
    title: str
    genre: Optional[str] = None
    premise: Optional[str] = None
    desired_ending: Optional[str] = None
    themes: Optional[list[str]] = []
    llm_temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    characters: Optional[list[CharacterInput]] = []


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    premise: Optional[str] = None
    desired_ending: Optional[str] = None
    themes: Optional[list[str]] = None
    llm_temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate):
    """
    Create a project with the setup wizard payload.
    Also creates pre-defined characters if provided.
    """
    try:
        # Insert project
        project_data = {
            "user_id": payload.user_id,
            "title": payload.title,
            "genre": payload.genre,
            "premise": payload.premise,
            "desired_ending": payload.desired_ending,
            "themes": payload.themes,
            "llm_temperature": payload.llm_temperature,
        }
        result = supabase.table("projects").insert(project_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create project")

        project = result.data[0]
        project_id = project["id"]

        # Insert pre-defined characters if any
        if payload.characters:
            char_rows = [
                {
                    "project_id": project_id,
                    "name": c.name,
                    "role": c.role,
                    "description": c.description,
                    "traits": c.traits,
                    "user_defined": True,
                }
                for c in payload.characters
            ]
            supabase.table("project_characters").insert(char_rows).execute()

        # Create default first chapter + scene so the editor is never empty
        ch_result = supabase.table("chapters").insert({
            "project_id": project_id,
            "title": "Chapter 1",
            "position": 0,
        }).execute()

        if ch_result.data:
            chapter_id = ch_result.data[0]["id"]
            supabase.table("scenes").insert({
                "chapter_id": chapter_id,
                "title": "Scene 1",
                "content": "<p>Begin writing...</p>",
                "plain_text": "Begin writing...",
                "position": 0,
            }).execute()

        logger.info(f"[Projects] Created project={project_id} title='{payload.title}'")
        return project

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Projects] Create error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get project metadata + chapters summary. Redis-cached."""
    # Cache hit
    cached = await cache.get_project_meta(project_id)
    if cached:
        return cached

    try:
        # Fetch project
        proj_res = supabase.table("projects").select("*").eq("id", project_id).single().execute()
        if not proj_res.data:
            raise HTTPException(status_code=404, detail="Project not found")

        project = proj_res.data

        # Fetch chapters + scenes
        ch_res = supabase.table("chapters").select(
            "id, title, position, scenes(id, title, position, word_count)"
        ).eq("project_id", project_id).order("position").execute()

        result = {**project, "chapters": ch_res.data or []}

        # Cache it
        await cache.set_project_meta(project_id, result)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Projects] Get error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate):
    """Update project fields (theme, temperature, premise, etc)."""
    try:
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="Nothing to update")

        result = supabase.table("projects").update(updates).eq("id", project_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Project not found")

        # Invalidate cache
        await cache.invalidate_project_meta(project_id)

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Projects] Update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/dna")
async def get_dna(project_id: str):
    """Get the DNA fingerprint. Redis-cached (30 min TTL)."""
    cached = await cache.get_dna(project_id)
    if cached:
        return {"project_id": project_id, "dna": cached, "source": "cache"}

    try:
        result = supabase.table("projects").select(
            "dna_fingerprint, has_custom_dna, dna_source_file"
        ).eq("id", project_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Project not found")

        dna = result.data.get("dna_fingerprint")

        if dna:
            await cache.set_dna(project_id, dna)

        return {
            "project_id": project_id,
            "dna": dna,
            "has_custom_dna": result.data.get("has_custom_dna", False),
            "dna_source_file": result.data.get("dna_source_file"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Projects] DNA fetch error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
