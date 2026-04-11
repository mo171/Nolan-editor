"""
Projects Router
================
Handles all project CRUD operations plus the setup wizard payload.
Redis cache is used for hot reads — invalidated on any mutation.
"""

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
import logging

from lib.supabase import supabase
from lib.redis_client import cache
from lib.worker import fire_and_forget


router = APIRouter(prefix="/api/projects", tags=["projects"])
logger = logging.getLogger("nolan.projects")

# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class CharacterInput(BaseModel):
    name: str
    role: Optional[str] = None          # protagonist | antagonist | supporting
    description: Optional[str] = None
    traits: Optional[list[str]] = []


class ProjectCreate(BaseModel):
    user_id: str
    title: str
    genre: Optional[str] = None
    premise: Optional[str] = None
    desired_ending: Optional[str] = None
    themes: Optional[list[str]] = []
    llm_temperature: float = Field(default=0.5, ge=0.0, le=1.0)
    characters: Optional[list[CharacterInput]] = []
    # Extended project context — used to ground the ghost text system prompt
    tone: Optional[str] = None                      # e.g. "dark, introspective"
    target_audience: Optional[str] = None           # e.g. "young adults"
    setting_description: Optional[str] = None       # world/location context
    story_foundation: Optional[str] = None          # deeper premise beyond one line
    conflict_types: Optional[list[str]] = []        # e.g. ["Man vs. Self"]
    tension_tags: Optional[list[str]] = []          # e.g. ["betrayal", "power struggle"]
    inciting_incident: Optional[str] = None         # the single event that starts the story


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    premise: Optional[str] = None
    desired_ending: Optional[str] = None
    themes: Optional[list[str]] = None
    llm_temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    tone: Optional[str] = None
    target_audience: Optional[str] = None
    setting_description: Optional[str] = None
    story_foundation: Optional[str] = None
    conflict_types: Optional[list[str]] = None
    tension_tags: Optional[list[str]] = None
    inciting_incident: Optional[str] = None


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_projects(user_id: str):
    """
    List all projects for a given user.
    Used by the dashboard to populate the project grid.
    Redis-cached per user (5 min TTL).
    """
    cache_key = f"user_projects:{user_id}"
    cached = await cache.get_json(cache_key)
    if cached:
        return cached

    try:
        result = supabase.table("projects").select(
            "id, title, genre, premise, themes, llm_temperature, "
            "has_custom_dna, dna_source_file, created_at, updated_at"
        ).eq("user_id", user_id).order("updated_at", desc=True).execute()

        projects = result.data or []
        await cache.set_json(cache_key, projects, ttl=300)  # 5 min TTL
        return projects

    except Exception as e:
        logger.error(f"[Projects] List error for user={user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
            # Extended context fields
            "tone": payload.tone,
            "target_audience": payload.target_audience,
            "setting_description": payload.setting_description,
            "story_foundation": payload.story_foundation,
            "conflict_types": payload.conflict_types,
            "tension_tags": payload.tension_tags,
            "inciting_incident": payload.inciting_incident,
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

            # Push initial characters to Neo4j Graph in the background
            from lib.worker import fire_and_forget
            from services.graph.graph_service import init_project_graph
            fire_and_forget(
                init_project_graph(project_id, payload.characters),
                task_name=f"neo4j_init_{project_id}"
            )

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
                "content": "",
                "plain_text": "",
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


# ─── DNA Upload ──────────────────────────────────────────────────────────────

async def _index_dna(project_id: str, text: str, filename: str):
    """
    Background task: embeds the DNA reference file into Supabase pgvector.
    Runs AFTER the HTTP response is returned — never blocks the upload endpoint.

    Strategy:
      1. Chunk the DNA text (same chunker pipeline as scene indexing)
      2. Embed chunks with the local all-MiniLM-L6-v2 model
      3. Upsert into scene_embeddings with source='dna' so the retriever
         can differentiate narrative context from stylistic context
      4. Update project: has_custom_dna=True, dna_source_file=filename
      5. Invalidate project meta & DNA caches
    """
    try:
        from services.rag.indexer import get_embedding_model
        from services.rag.chunker import chunk_scene

        if not text.strip():
            logger.warning(f"[DNA] Empty text for project={project_id}, skipping")
            return

        model = get_embedding_model()

        # DNA chunks don't belong to a specific scene, so scene_id is NULL
        chunks = chunk_scene(
            scene_id=None,
            project_id=project_id,
            plain_text=text,
            scene_metadata={"is_dna_source": True, "filename": filename}
        )

        if not chunks:
            return

        texts = [c["text"] for c in chunks]
        embeddings = model.encode(texts, show_progress_bar=False)

        rows = [
            {
                "project_id": project_id,
                "scene_id": None,           # DNA chunks don't belong to a specific scene
                "chunk_text": chunk["text"],
                "embedding": emb.tolist(),
                "metadata": {**chunk["metadata"], "embedding_type": "dna"},
            }
            for chunk, emb in zip(chunks, embeddings)
        ]

        # Wipe old DNA embeddings for this project, insert fresh
        supabase.table("scene_embeddings").delete().eq("project_id", project_id).eq("metadata->>is_dna_source", "true").execute()
        if rows:
            supabase.table("scene_embeddings").insert(rows).execute()

        # Mark project as having custom DNA
        supabase.table("projects").update({
            "has_custom_dna": True,
            "dna_source_file": filename,
        }).eq("id", project_id).execute()

        # Invalidate caches
        await cache.invalidate_project_meta(project_id)
        await cache.invalidate_dna(project_id)

        logger.info(f"[DNA] Indexed {len(rows)} chunks for project={project_id} from '{filename}'")

    except Exception as e:
        logger.error(f"[DNA] Indexing failed for project={project_id}: {e}", exc_info=True)


@router.post("/{project_id}/dna-upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_dna(project_id: str, file: UploadFile = File(...)):
    """
    Accepts a text or PDF reference file and kicks off background DNA indexing.

    Supported formats:
      - Plain text (.txt, .md) — read directly
      - PDF (.pdf) — text extracted via pypdf if available, else raw decode

    The HTTP response returns immediately (202 Accepted).
    The actual chunking + embedding runs in a background thread
    via fire_and_forget so the user is never blocked.
    """
    try:
        raw_bytes = await file.read()

        # ── Text extraction ──────────────────────────────────────────────────
        filename = file.filename or "dna_file"

        if filename.lower().endswith(".pdf"):
            try:
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(raw_bytes))
                text = "\n".join(
                    page.extract_text() or "" for page in reader.pages
                )
            except ImportError:
                # pypdf not installed — fall back to raw decode
                logger.warning("[DNA] pypdf not installed; falling back to raw text decode")
                text = raw_bytes.decode("utf-8", errors="ignore")
        else:
            text = raw_bytes.decode("utf-8", errors="ignore")

        if not text.strip():
            raise HTTPException(status_code=400, detail="File appears to be empty or unreadable")

        # ── Fire background indexing — do NOT await ───────────────────────────
        fire_and_forget(
            _index_dna(project_id, text, filename),
            task_name=f"dna_index_{project_id}"
        )

        logger.info(f"[DNA] Upload received for project={project_id} file='{filename}', indexing queued")
        return {"status": "queued", "filename": filename, "char_count": len(text)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DNA] Upload error for project={project_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str):
    """
    NUCLEAR DELETE: Purges every single trace of a project from all tables
    to bypass any potential foreign key constraint bottlenecks.
    """
    try:
        # 1. Fetch project to verify existence and get user_id
        proj_res = supabase.table("projects").select("user_id, title").eq("id", project_id).single().execute()
        if not proj_res.data:
            logger.warning(f"[Projects] Delete requested for non-existent project_id={project_id}")
            raise HTTPException(status_code=404, detail="Project not found")
        
        user_id = proj_res.data["user_id"]
        title = proj_res.data["title"]
        logger.info(f"[Projects] ☢️ Nuclear deletion started: '{title}' ({project_id})")

        # 2. PURGE ORDER (leaf nodes first to avoid FK constraints)
        
        # A. Purge Embeddings (pgvector)
        supabase.table("scene_embeddings").delete().eq("project_id", project_id).execute()
        
        # B. Purge NLP Analysis (requires scene_id lookups, but we can purge characters first)
        # character references scenes via first_seen_scene_id (the main bottleneck)
        supabase.table("characters").delete().eq("project_id", project_id).execute()
        supabase.table("project_characters").delete().eq("project_id", project_id).execute()
        
        # C. Purge Chapters & Scenes
        # Note: chapters link to scenes. We can delete chapters and let cascade handle scenes,
        # but being nuclear means we delete scenes first.
        chapters_res = supabase.table("chapters").select("id").eq("project_id", project_id).execute()
        ch_ids = [c["id"] for c in (chapters_res.data or [])]
        
        if ch_ids:
            # Delete analysis for all scenes in these chapters
            scenes_res = supabase.table("scenes").select("id").in_("chapter_id", ch_ids).execute()
            scene_ids = [s["id"] for s in (scenes_res.data or [])]
            if scene_ids:
                supabase.table("scene_nlp_analysis").delete().in_("scene_id", scene_ids).execute()
                supabase.table("scenes").delete().in_("id", scene_ids).execute()
            
            supabase.table("chapters").delete().eq("project_id", project_id).execute()

        # D. Final strike: The Project Row
        final_res = supabase.table("projects").delete().eq("id", project_id).execute()
        
        if not final_res.data:
             logger.error(f"[Projects] ❌ Failed to delete project row for {project_id}")
             raise HTTPException(status_code=500, detail="Database failure during final project purge")

        # 3. Aggressive Cache Invalidation
        await cache.invalidate_project_meta(project_id)
        await cache.invalidate_user_projects(user_id)
        await cache.invalidate_dna(project_id)
        await cache.invalidate_characters(project_id)
        # Deep wipe of user project list
        await cache.delete(f"user_projects:{user_id}")

        logger.info(f"[Projects] ☢️ ✅ Nuclear purge complete for '{title}'")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Projects] ☢️ ❌ Nuclear purge FAILED for {project_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Nuclear purge failed: {str(e)}")
