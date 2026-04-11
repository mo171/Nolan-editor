"""
Characters Router
===================
Exposes character data from both Supabase (user-defined + NLP-extracted)
and Neo4j (scene timeline arcs) for the editor sidebar.

Two character tables exist intentionally:
  - project_characters: User-defined at the setup wizard (rich: role, description, traits)
  - characters:         Auto-extracted by spaCy NLP after scenes are written (arc_summary, mentions, etc.)
"""

from fastapi import APIRouter, HTTPException
from lib.supabase import supabase
from services.graph.graph_service import get_character_timeline

router = APIRouter(prefix="/api", tags=["characters"])


@router.get("/projects/{project_id}/characters")
async def get_project_characters(project_id: str):
    """
    Get all characters for a project — both user-defined and NLP-extracted.
    Returns them in two separate lists so the UI can render labeled sections.
    """
    try:
        # User-defined characters (created at Project Setup Wizard)
        res_user = supabase.table("project_characters").select(
            "id, name, role, description, traits, user_defined, created_at"
        ).eq("project_id", project_id).order("created_at").execute()

        project_chars = res_user.data or []
        user_char_names = {c["name"].lower(): c for c in project_chars}

        # Auto-extracted characters (populated by spaCy NLP pipeline after scenes are saved)
        res_extracted = supabase.table("characters").select(
            "id, name, aliases, arc_summary, last_known_location, last_known_emotion, "
            "total_mentions, first_seen_scene_id"
        ).eq("project_id", project_id).order("total_mentions", desc=True).execute()

        extracted_chars_all = res_extracted.data or []
        
        # Merge arc info into project_characters and filter out duplicates
        extracted_chars = []
        for ext_c in extracted_chars_all:
            lower_name = ext_c["name"].lower()
            if lower_name in user_char_names:
                # Merge the live arc data into the project character
                pc = user_char_names[lower_name]
                pc["arc_summary"] = ext_c.get("arc_summary")
                pc["last_known_location"] = ext_c.get("last_known_location")
                pc["last_known_emotion"] = ext_c.get("last_known_emotion")
                pc["total_mentions"] = ext_c.get("total_mentions")
            else:
                extracted_chars.append(ext_c)

        return {
            "project_characters": project_chars,
            "extracted_characters": extracted_chars,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/characters/{character_name}/timeline")
async def get_character_arc(project_id: str, character_name: str):
    """
    Fetches the chronological scene-timeline for a character from Neo4j.
    Returns a list of scene_ids in appearance order.
    Used by the editor Timeline panel to render dot-connected event nodes.
    """
    try:
        scene_ids = await get_character_timeline(project_id, character_name)

        if not scene_ids:
            return {"character": character_name, "timeline_scenes": []}

        # Fetch scene titles from Supabase to give the timeline meaningful labels
        scenes_res = supabase.table("scenes").select(
            "id, title, position, chapter_id"
        ).in_("id", scene_ids).execute()

        scenes_map = {s["id"]: s for s in (scenes_res.data or [])}

        # Return in Neo4j-provided order (preserves narrative sequence)
        timeline = [
            scenes_map[sid]
            for sid in scene_ids
            if sid in scenes_map
        ]

        return {"character": character_name, "timeline_scenes": timeline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
