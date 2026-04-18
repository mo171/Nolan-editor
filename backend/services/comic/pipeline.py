"""
Script-to-Comic Pipeline
==========================
Converts story scenes into rendered comic panels via GPT Image.
Replaces the former Stability AI implementation.

Pipeline per scene:
  1. process_scene(text)     — LLM extracts structured scene data (JSON)
  2. generate_scene_image()  — Visual Director → GPT Image (bytes)
  3. save locally + upsert to Supabase comic_panels table
"""

import os
import uuid
import json
import logging
import asyncio
from openai import AsyncOpenAI
from lib.supabase import supabase
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

logger = logging.getLogger("nolan.comic.pipeline")

# ─── OpenRouter client (scene structuring LLM calls) ─────────────────────────
# Fixed: added required HTTP-Referer + X-Title headers for OpenRouter auth.
client = AsyncOpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://nolan-editor.com",
        "X-Title": "Nolan AI Studio",
    },
)

# ─── Local storage for comic panels ──────────────────────────────────────────
BASE_DIR  = Path(__file__).parent.parent.parent.parent
COMIC_DIR = BASE_DIR / "frontend" / "public" / "comics"

def ensure_comic_dir():
    COMIC_DIR.mkdir(parents=True, exist_ok=True)


# ─── Step 1: Scene Structuring ────────────────────────────────────────────────

async def process_scene(text: str) -> dict:
    """
    Convert raw scene text into structured JSON for a comic panel.
    Faithfully extracts visual and narrative elements from the author's prose.
    """
    system_prompt = """
You are an expert comic book director. Extract the exact visual and structural \
elements from the provided scene text for a single dramatic comic panel.

CRITICAL RULES:
1. DIALOGUE: Extract ONLY the 1-2 most impactful lines. Do not include minor background chatter.
2. FAITHFUL REPRESENTATION: Capture the scene EXACTLY as described — environment, setting, \
atmosphere, character appearances, and actions. Do NOT sanitize, soften, or rewrite any visual \
details. Preserve the author's intended mood and visual style completely.
3. ENVIRONMENT & SETTING: Be highly specific — include architectural details, weather, lighting, \
time period, and any environmental elements that define the scene.
4. CHARACTER DETAILS: Include specific physical descriptions, clothing, expressions, and poses \
of each character as described or strongly implied by the text.
5. POSITIONING: Spread out speech_bubbles coordinates (x: 10-90, y: 10-90). Avoid the center. \
If two bubbles, place them on opposite sides (e.g., x=20/y=20 and x=80/y=30).

Return a JSON object strictly matching this format:
{
    "characters": ["name1", "name2"],
    "character_details": "detailed visual description of each character's appearance, clothing, expression",
    "emotion": "dominant emotion",
    "location": "highly detailed setting description with architecture, environment, atmosphere",
    "time": "time of day and lighting conditions",
    "action": "precise description of physical action and body language",
    "caption_top": "narrator style text describing the start",
    "caption_bottom": "narrator style text describing the end or result",
    "speech_bubbles": [
        {"text": "dialogue line", "x": 20, "y": 20}
    ]
}
"""
    try:
        model = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
        response = await client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": text},
            ],
            temperature=0.7,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"[Comic] Error structuring scene: {e}")
        return {
            "characters": [], "emotion": "neutral", "location": "unknown",
            "time": "day", "action": "", "caption_top": "...", "caption_bottom": "...",
            "speech_bubbles": [], "character_details": ""
        }


# ─── Step 2: Image Generation (GPT Image via Visual Director) ─────────────────

async def generate_image(
    structured: dict,
    project_characters: list | None = None,
) -> str:
    """
    Generates a comic panel using the Visual Director Agent → GPT Image.

    Args:
        structured:          Output of process_scene()
        project_characters:  Optional list of project_characters dicts for visual profiles.
                             If provided, character appearances are locked for consistency.

    Returns:
        Public URL string (/comics/filename.png) or a placeholder on failure.
    """
    from services.images.visual_director import (
        build_visual_profile,
        build_cinematic_prompt,
        generate_gpt_image,
    )

    try:
        ensure_comic_dir()

        # Build character visual profiles from project data for consistency
        profiles: dict = {}
        if project_characters:
            for pc in project_characters:
                if pc.get("name"):
                    profiles[pc["name"]] = build_visual_profile(pc)

        # Convert structured panel data into scene_understanding format
        # that the Visual Director expects
        scene_characters = []
        char_names = structured.get("characters", [])
        char_details = structured.get("character_details", "")

        for name in char_names:
            scene_characters.append({
                "name":       name,
                "appearance": char_details if len(char_names) == 1 else f"{name}: {char_details}",
                "expression": "",
                "pose":       structured.get("action", ""),
            })

        scene_understanding = {
            "characters":   scene_characters,
            "environment":  structured.get("location", ""),
            "mood":         structured.get("emotion", "neutral"),
            "lighting":     structured.get("time", ""),
            "camera_angle": "",   # Visual Director will infer
            "time_of_day":  structured.get("time", ""),
            "key_action":   structured.get("action", ""),
            "color_palette": "",
            "style_notes":  "",
        }

        art_style = "cinematic graphic novel, bold expressive ink lines, dramatic chiaroscuro lighting, rich color grading, 8K comic art"

        prompt = await build_cinematic_prompt(scene_understanding, profiles, art_style)
        if not prompt:
            prompt = (
                "Cinematic graphic novel comic art panel. "
                "Dramatic scene. Bold ink lines, rich color, moody lighting. "
                "No text, no speech bubbles, no captions, no watermarks."
            )

        logger.info(f"[Comic] Generating panel | prompt[:120]: {prompt[:120]}...")

        img_bytes = await generate_gpt_image(prompt)

        # Save locally
        filename = f"panel_{uuid.uuid4().hex[:12]}.png"
        filepath = COMIC_DIR / filename
        with open(filepath, "wb") as f:
            f.write(img_bytes)

        return f"/comics/{filename}"

    except Exception as e:
        logger.error(f"[Comic] Image generation failed: {e}")
        return "https://placehold.co/1024x1024/1e1e24/ba9eff.png?text=Generation+Failed"


# ─── Master Pipeline ──────────────────────────────────────────────────────────

async def generate_comic_for_chapter(
    project_id: str,
    chapter_id: str,
    template_id: str,
) -> dict:
    """
    Orchestrates reading scenes, running the LLM + GPT Image pipeline,
    and storing panels to the database.
    """
    # ── 1. Resolve chapter UUID ───────────────────────────────────────────────
    real_chapter_id = None
    try:
        uuid.UUID(chapter_id)
        real_chapter_id = chapter_id
    except ValueError:
        try:
            chap_res = supabase.table("chapters").select("id").eq("project_id", project_id).limit(1).execute()
            if chap_res.data:
                real_chapter_id = chap_res.data[0]["id"]
        except Exception:
            pass

    # ── 2. Fetch scenes ───────────────────────────────────────────────────────
    scenes = []
    if real_chapter_id:
        try:
            res = supabase.table("scenes").select("id, plain_text, content").eq(
                "chapter_id", real_chapter_id
            ).order("position").execute()
            scenes = res.data
        except Exception as e:
            logger.error(f"[Comic] DB error fetching scenes: {e}")

    if not scenes:
        scenes = [{"id": None, "plain_text": "A solitary hero faces a vast, empty landscape as the wind howls.", "content": ""}]

    # ── 3. Fetch project characters for visual profile injection ──────────────
    project_characters = []
    try:
        pc_res = supabase.table("project_characters").select(
            "name, role, description, traits, ai_visual_summary"
        ).eq("project_id", project_id).execute()
        project_characters = pc_res.data or []
    except Exception as e:
        logger.warning(f"[Comic] Could not fetch project characters: {e}")

    # ── 4. Cache check for existing panels ───────────────────────────────────
    existing_panels_cache = {}
    scene_ids = [s["id"] for s in scenes if s.get("id")]
    if scene_ids:
        try:
            ex_panels_res = supabase.table("comic_panels").select("*").in_("scene_id", scene_ids).execute()
            for p in (ex_panels_res.data or []):
                if p["scene_id"] and p.get("image_url"):
                    existing_panels_cache[p["scene_id"]] = p
        except Exception as e:
            logger.error(f"[Comic] Error fetching cached panels: {e}")

    # ── 5. Generate all panels ────────────────────────────────────────────────
    panels_data = []

    for i, scene in enumerate(scenes):
        scene_id = scene.get("id")

        # Reuse cached panel if available
        if scene_id and scene_id in existing_panels_cache:
            p_cached = existing_panels_cache[scene_id]
            logger.info(f"[Comic] Reusing cached panel for scene={scene_id}")
            panels_data.append({
                "scene_id":       scene_id,
                "panel_index":    i + 1,
                "image_url":      p_cached.get("image_url"),
                "caption_top":    p_cached.get("caption_top", ""),
                "caption_bottom": p_cached.get("caption_bottom", ""),
                "speech_bubbles": p_cached.get("speech_bubbles", []),
                "image_prompt":   p_cached.get("image_prompt", ""),
            })
            continue

        logger.info(f"[Comic] Generating new panel for scene={scene_id}")
        text = scene.get("plain_text") or scene.get("content") or "Empty scene."

        # Structure the scene
        structured = await process_scene(text)

        # Generate image with character profile injection
        image_url = await generate_image(structured, project_characters)

        panels_data.append({
            "scene_id":       scene_id,
            "panel_index":    i + 1,
            "image_url":      image_url,
            "caption_top":    structured.get("caption_top", ""),
            "caption_bottom": structured.get("caption_bottom", ""),
            "speech_bubbles": structured.get("speech_bubbles", []),
            "image_prompt":   f"[GPT Image] {text[:200]}",
        })

    # ── 6. Resolve template UUID ──────────────────────────────────────────────
    real_template_id = None
    try:
        tmps = supabase.table("comic_templates").select("id").execute()
        if tmps.data:
            real_template_id = tmps.data[0]["id"]
    except Exception:
        pass

    # ── 7. Clean up old comic structure ──────────────────────────────────────
    if real_chapter_id:
        try:
            old_comic_res = supabase.table("comics").select("id").eq("chapter_id", real_chapter_id).execute()
            if old_comic_res.data:
                for c in old_comic_res.data:
                    supabase.table("comics").delete().eq("id", c["id"]).execute()
        except Exception as e:
            logger.error(f"[Comic] Error cleaning up old comic: {e}")

    # ── 8. Persist to DB ──────────────────────────────────────────────────────
    comic_res = supabase.table("comics").insert({
        "project_id": project_id,
        "chapter_id": real_chapter_id,
        "template_id": real_template_id,
        "title": "Generated Comic Chapter",
    }).execute()
    comic_record = comic_res.data[0]

    page_res = supabase.table("comic_pages").insert({
        "comic_id": comic_record["id"],
        "page_number": 1,
    }).execute()
    page_record = page_res.data[0]

    db_panels = []
    for panel in panels_data:
        panel["page_id"] = page_record["id"]
        scene_id = panel["scene_id"]
        if scene_id:
            try:
                uuid.UUID(scene_id)
            except ValueError:
                panel["scene_id"] = None
        db_panels.append(panel)

    panels_res = supabase.table("comic_panels").insert(db_panels).execute()
    inserted_panels = panels_res.data

    return {
        "id":    comic_record["id"],
        "title": comic_record["title"],
        "pages": [
            {
                "id":          page_record["id"],
                "page_number": page_record["page_number"],
                "panels":      inserted_panels,
            }
        ],
    }
