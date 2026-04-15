"""
Script-to-Comic Pipeline.
Uses OpenAI to process chapters into structured panels and generates images via DALL-E 3.
"""
import os
import json
import logging
from openai import AsyncOpenAI
from lib.supabase import supabase

logger = logging.getLogger("nolan.comic.pipeline")

# Initialize async OpenAI client
# It will automatically pick up OPENAI_API_KEY from environment variables.
client = AsyncOpenAI()

async def process_scene(text: str) -> dict:
    """
    Step 1: Convert raw scene text into structured JSON.
    """
    system_prompt = """
    You are an expert comic book director. Your job is to faithfully extract the exact visual and structural elements from the provided scene text for a single dramatic comic panel.
    
    CRITICAL RULES:
    1. DIALOGUE: Extract ONLY the 1-2 most impactful lines of dialogue. Do not include background chatter or minor lines.
    2. FAITHFUL REPRESENTATION: Capture the scene EXACTLY as described — the environment, setting, atmosphere, character appearances, and actions. Do NOT sanitize, soften, abstract, or rewrite any visual details. Preserve the author's intended mood and visual style completely.
    3. ENVIRONMENT & SETTING: Be highly specific and descriptive about the location. Include architectural details, weather, lighting conditions, time period, and any environmental elements that define the scene.
    4. CHARACTER DETAILS: Include specific physical descriptions, clothing, expressions, and poses of each character as described or strongly implied by the text.
    5. POSITIONING: Spread out speech_bubbles coordinates (x: 10-90, y: 10-90). Avoid the center (50, 50). If there are two bubbles, place them on opposite sides (e.g., x=20/y=20 and x=80/y=30).
    
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
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.7
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Error structuring scene: {e}")
        # Fallback empty structure
        return {
            "characters": [], "emotion": "neutral", "location": "unknown",
            "time": "day", "action": "", "caption_top": "...", "caption_bottom": "...",
            "speech_bubbles": []
        }

def generate_prompt(structured: dict) -> str:
    """
    Step 2: Convert structured JSON into a rich, faithful image generation prompt.
    Captures exact scene environment, setting, and character details as described.
    """
    chars = ", ".join(structured.get("characters", [])) or "a lone figure"
    char_details = structured.get("character_details", "")
    location = structured.get("location", "an empty background")
    time = structured.get("time", "daytime")
    action = structured.get("action", "standing")
    emotion = structured.get("emotion", "neutral")
    
    # Build a rich, layered prompt that faithfully encodes the scene
    char_block = f"{chars}"
    if char_details:
        char_block += f" — {char_details}"
    
    prompt = (
        f"Comic book illustration panel. Characters: {char_block}. "
        f"Scene: {action}. "
        f"Environment: {location}. "
        f"Lighting & time: {time}. "
        f"Mood & atmosphere: {emotion}. "
        f"Style: cinematic graphic novel, sharp expressive ink lines, rich detailed backgrounds, "
        f"dramatic chiaroscuro lighting, vibrant color grading, 8K high-fidelity comic art. "
        f"No text, no speech bubbles, no captions in the image."
    )
    return prompt

async def generate_image(prompt: str) -> str:
    """
    Step 3: Generate the image via DALL-E 3 using the exact described prompt.
    No safety rewriting — the prompt is sent as-is to faithfully capture the
    scene environment, setting, and characters described by the user.
    """
    try:
        logger.info(f"[DALL-E] Generating image with prompt: {prompt[:120]}...")
        response = await client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="hd",
            n=1,
        )
        return response.data[0].url
    except Exception as e:
        logger.error(f"[DALL-E] Image generation failed: {e}")
        # Return a placeholder only on a hard failure (e.g. API key missing, network error)
        return "https://placehold.co/1024x1024/1e1e24/ba9eff.png?text=Generation+Failed"

import uuid

async def generate_comic_for_chapter(project_id: str, chapter_id: str, template_id: str) -> dict:
    """
    Master Pipeline: Orchestrates reading scenes, executing LLM/DALL-E, and storing to DB.
    """
    # 1. Provide a safe chapter_id. If "preview_chapter" or invalid, fetch the first real chapter.
    real_chapter_id = None
    try:
        uuid.UUID(chapter_id)
        real_chapter_id = chapter_id
    except ValueError:
        # Invalid UUID, try to fetch first chapter for project
        try:
            chap_res = supabase.table("chapters").select("id").eq("project_id", project_id).limit(1).execute()
            if chap_res.data:
                real_chapter_id = chap_res.data[0]["id"]
        except Exception:
            pass

    # 2. Fetch scenes for this chapter from supabase
    scenes = []
    if real_chapter_id:
        try:
            res = supabase.table("scenes").select("id, plain_text, content").eq("chapter_id", real_chapter_id).order("position").execute()
            scenes = res.data
        except Exception as e:
            logger.error(f"DB Error fetching scenes: {e}")

    if not scenes:
        # If still no scenes, use a dummy one but don't tie it to a real scene ID
        scenes = [{"id": None, "plain_text": "A solitary hero faces a vast, empty landscape as the wind howls.", "content": ""}]

    # 3. Create a cache dictionary of existing panels mapping scene_id -> panel data
    existing_panels_cache = {}
    scene_ids = [s["id"] for s in scenes if s.get("id")]
    if scene_ids:
        try:
            ex_panels_res = supabase.table("comic_panels").select("*").in_("scene_id", scene_ids).execute()
            for p in (ex_panels_res.data or []):
                # Pick the most recent if multiple exist, or just use the first found
                if p["scene_id"] and p.get("image_url"):
                    existing_panels_cache[p["scene_id"]] = p
        except Exception as e:
            logger.error(f"Error fetching existing comic panels: {e}")

    panels_data = []
    
    # Process all scenes to create a full comic flow
    for i, scene in enumerate(scenes):
        scene_id = scene.get("id")

        # Check the cache first!
        if scene_id and scene_id in existing_panels_cache:
            p_cached = existing_panels_cache[scene_id]
            logger.info(f"Reusing cached panel for scene={scene_id}")
            panels_data.append({
                "scene_id": scene_id,
                "panel_index": i + 1,
                "image_url": p_cached.get("image_url"),
                "caption_top": p_cached.get("caption_top", ""),
                "caption_bottom": p_cached.get("caption_bottom", ""),
                "speech_bubbles": p_cached.get("speech_bubbles", []),
                "image_prompt": p_cached.get("image_prompt", "")
            })
            continue

        # If not cached, go through the full generation pipeline
        logger.info(f"Generating new panel for scene={scene_id}")
        text = scene.get("plain_text") or scene.get("content") or "Empty scene."
        
        # NLP Structure
        structured = await process_scene(text)
        
        # Build prompt
        prompt = generate_prompt(structured)
        
        # Generate Image
        image_url = await generate_image(prompt)
        
        panels_data.append({
            "scene_id": scene_id,
            "panel_index": i + 1,
            "image_url": image_url,
            "caption_top": structured.get("caption_top", ""),
            "caption_bottom": structured.get("caption_bottom", ""),
            "speech_bubbles": structured.get("speech_bubbles", []),
            "image_prompt": prompt
        })

    # Resolve the template UUID from the string "single_panel"
    real_template_id = None
    try:
        tmps = supabase.table("comic_templates").select("id").execute()
        if tmps.data:
            real_template_id = tmps.data[0]["id"] # Fallback to first
    except Exception:
        pass

    # Clean up the old comic structure for this chapter if it exists
    # We do this after generating new images so we don't wipe out the DB until we're ready to commit.
    if real_chapter_id:
        try:
            old_comic_res = supabase.table("comics").select("id").eq("chapter_id", real_chapter_id).execute()
            if old_comic_res.data:
                for c in old_comic_res.data:
                    # Deleting the comic cascades to delete comic_pages and comic_panels
                    # This removes the old struct while keeping our cached arrays safe in memory
                    supabase.table("comics").delete().eq("id", c["id"]).execute()
        except Exception as e:
            logger.error(f"Error cleaning up old comic: {e}")

    # 1. Create fresh comic
    comic_res = supabase.table("comics").insert({
        "project_id": project_id,
        "chapter_id": real_chapter_id,
        "template_id": real_template_id,
        "title": "Generated Comic Chapter"
    }).execute()
    comic_record = comic_res.data[0]

    # 2. Create page
    page_res = supabase.table("comic_pages").insert({
        "comic_id": comic_record["id"],
        "page_number": 1
    }).execute()
    page_record = page_res.data[0]
    
    # 3. Create panels
    db_panels = []
    for panel in panels_data:
        panel["page_id"] = page_record["id"]
        # Ensure scene_id is valid UUID or None
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
        "id": comic_record["id"],
        "title": comic_record["title"],
        "pages": [
            {
                "id": page_record["id"],
                "page_number": page_record["page_number"],
                "panels": inserted_panels
            }
        ]
    }
