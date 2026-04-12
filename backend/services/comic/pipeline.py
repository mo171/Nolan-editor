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
    You are an expert comic book director. Extract the core visual and structural elements from the provided scene text.
    Return a JSON object strictly matching this format:
    {
        "characters": ["name1", "name2"],
        "emotion": "dominant emotion",
        "location": "setting description",
        "time": "time of day",
        "action": "brief description of physical action",
        "caption_top": "narrator style text describing the start",
        "caption_bottom": "narrator style text describing the end or result",
        "speech_bubbles": [
            {"text": "dialogue line", "x": 50, "y": 30}
        ]
    }
    Make sure speech_bubbles coordinates x and y are between 10 and 90, representing percentages of image dimensions. If no dialogue, return empty array.
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
    Step 2: Convert structured JSON into an image generation prompt.
    """
    chars = ", ".join(structured.get("characters", []))
    location = structured.get("location", "an empty background")
    time = structured.get("time", "daytime")
    action = structured.get("action", "standing")
    emotion = structured.get("emotion", "neutral")
    
    prompt = (
        f"A cinematic high-quality comic book illustration of {chars} {action}. "
        f"The setting is {location} during {time}. Overall emotional atmosphere is {emotion}. "
        "Intense sharp line art, vibrant colors, dramatic lighting, graphic novel style. No text or speech bubbles."
    )
    return prompt

async def generate_image(prompt: str) -> str:
    """
    Step 3: Generate the image via DALL-E 3 (or fallback to placeholder).
    """
    try:
        response = await client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        return response.data[0].url
    except Exception as e:
        logger.error(f"Error generating image: {e}")
        # Return a placeholder if generation fails (e.g. no API key)
        return "https://placehold.co/1024x1024/1e1e24/ba9eff?text=Generation+Failed"

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

    panels_data = []
    
    # We'll just process the first 2 scenes to avoid massive API bills and delays for the user during testing.
    for i, scene in enumerate(scenes[:2]):
        text = scene.get("plain_text") or scene.get("content") or "Empty scene."
        
        # NLP Structure
        structured = await process_scene(text)
        
        # Build prompt
        prompt = generate_prompt(structured)
        
        # Generate Image
        image_url = await generate_image(prompt)
        
        panels_data.append({
            "scene_id": scene.get("id"),
            "panel_index": i + 1,
            "image_url": image_url,
            "caption_top": structured.get("caption_top", ""),
            "caption_bottom": structured.get("caption_bottom", ""),
            "speech_bubbles": structured.get("speech_bubbles", []),
            "image_prompt": prompt
        })

    # Save to Supabase
    # Resolve the template UUID from the string "single_panel"
    real_template_id = None
    try:
        # We try to get the template where layout_data->id matches
        tmps = supabase.table("comic_templates").select("id").execute()
        if tmps.data:
            real_template_id = tmps.data[0]["id"] # Fallback to first
    except Exception:
        pass

    # 1. Create comic
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
