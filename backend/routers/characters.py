"""
Characters Router
===================
Exposes character data from both Supabase and Neo4j for the UI.
"""

from fastapi import APIRouter, HTTPException
from lib.supabase import supabase
from services.graph.graph_service import get_character_timeline

router = APIRouter(prefix="/api", tags=["characters"])

@router.get("/projects/{project_id}/characters")
async def get_project_characters(project_id: str):
    """Get all characters for a project (user-defined + auto-extracted)."""
    try:
        # User defined characters
        res1 = supabase.table("project_characters").select("*").eq("project_id", project_id).execute()
        # NLP extracted characters
        res2 = supabase.table("characters").select("*").eq("project_id", project_id).execute()
        
        return {
            "project_characters": res1.data or [],
            "extracted_characters": res2.data or []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/characters/{name}/timeline")
async def get_character_arc(project_id: str, name: str):
    """Fetches the scene timeline for a character from Neo4j."""
    timeline = await get_character_timeline(project_id, name)
    return {"timeline_scenes": timeline}
