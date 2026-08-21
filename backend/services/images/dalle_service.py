"""
Character Portrait Generator
==============================
Generates cinematic comic art character portraits using GPT Image.
Replaces the former Stability AI implementation.

Flow:
  1. Fetch character data from Supabase (caller provides it)
  2. Build scene text: a "portrait scene" of just this character
  3. Generate visual summary (via OpenAI LLM) for the sidebar card
  4. Generate portrait image via Visual Director → GPT Image
  5. Save locally → update Supabase (both project_characters + characters)
"""

import os
import asyncio
import logging
from pathlib import Path

from lib.supabase import supabase
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

logger = logging.getLogger("nolan.images.portrait")

# ─── OpenAI client (for visual summary text generation) ──────────────────────
_summary_client: AsyncOpenAI | None = None

def _get_summary_client() -> AsyncOpenAI:
    global _summary_client
    if _summary_client is None:
        from services.llm.client import get_async_openai
        _summary_client = get_async_openai()
    return _summary_client

# ─── Local file storage ───────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent.parent.parent
AVATAR_DIR = BASE_DIR / "frontend" / "public" / "avatars"

def _ensure_avatar_dir():
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)


# ─── Visual summary (sidebar text card) ──────────────────────────────────────

async def _generate_visual_summary(
    char_name: str,
    description: str,
    visual_description: str,
    age: str,
    clothing: str,
    traits: list,
) -> str:
    """
    Produces a tight 1-2 sentence casting-note style visual description
    shown in the sidebar CharacterCard after portrait generation.
    """
    try:
        parts = [f"Character name: {char_name}"]
        if description:
            parts.append(f"Story role: {description}")
        if visual_description:
            parts.append(f"Appearance notes: {visual_description}")
        if age:
            parts.append(f"Age: {age}")
        if clothing:
            parts.append(f"Clothing: {clothing}")
        if traits:
            parts.append(f"Traits: {', '.join(traits)}")

        from services.llm.client import resolve_model
        model = resolve_model()
        resp = await _get_summary_client().chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a character designer's assistant. "
                        "Write a single vivid 1-2 sentence visual description of the character "
                        "that reads like a casting note. Focus on physical appearance, "
                        "clothing, and immediate impression. No fluff."
                    ),
                },
                {"role": "user", "content": "\n".join(parts)},
            ],
            temperature=0.6,
            max_tokens=80,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"[Portrait] Visual summary generation failed: {e}")
        return ""


# ─── Main portrait generator ──────────────────────────────────────────────────

async def generate_character_image(
    project_id: str,
    char_name: str,
    description: str = "",
    traits: list = None,
    visual_description: str = "",
    age: str = "",
    clothing: str = "",
    art_style: str = "",
) -> tuple[str | None, str | None]:
    """
    Generates a cinematic comic art character portrait via GPT Image.

    Uses the Visual Director's two-layer pipeline:
      - The "scene" is a character-study close-up framing
      - Character's visual profile is built from all provided metadata
      - GPT Image (gpt-image-1-mini, low quality) generates the image

    Returns (public_url, ai_visual_summary) or (None, None) on failure.
    """
    from services.images.visual_director import (
        build_visual_profile,
        build_cinematic_prompt,
        generate_gpt_image,
        extract_scene_understanding,
    )

    try:
        if not os.getenv("OPENAI_API_KEY"):
            logger.error("[Portrait] Missing OPENAI_API_KEY in .env")
            return None, None

        _ensure_avatar_dir()

        # ── 1. Build a "portrait scene" text for the Scene Parser ────────────
        # This gives the Scene Parser a rich context to extract from, even though
        # it's a character portrait not a full scene.
        traits_list = traits or []
        trait_str   = ", ".join(traits_list) if traits_list else "enigmatic"

        portrait_scene_parts = [
            f"A character portrait scene of {char_name}.",
        ]
        if age:
            portrait_scene_parts.append(f"{char_name} is {age} years old.")
        if visual_description:
            portrait_scene_parts.append(f"Physical appearance: {visual_description}.")
        if description:
            portrait_scene_parts.append(f"Story role: {description}.")
        if clothing:
            portrait_scene_parts.append(f"They are wearing {clothing}.")
        portrait_scene_parts.append(
            f"Personality: {trait_str}. "
            f"The portrait shows them in a dramatic close-up or medium shot, "
            f"their expression conveying their character essence. "
            f"The background is stylized but not distracting, keeping focus on the character."
        )
        portrait_text = " ".join(portrait_scene_parts)

        # ── 2. Build character visual profile ────────────────────────────────
        char_data = {
            "name":               char_name,
            "age":                age,
            "visual_description": visual_description,
            "description":        description,
            "clothing":           clothing,
            "traits":             traits_list,
        }
        profile = build_visual_profile(char_data)
        profiles = {char_name: profile}

        # ── 3. Generate on-demand visual summary + image in parallel ─────────
        summary_task = asyncio.create_task(
            _generate_visual_summary(
                char_name, description, visual_description,
                age, clothing, traits_list
            )
        )

        # Scene understanding for portrait (LLM enriches the portrait context)
        understanding = await extract_scene_understanding(portrait_text)

        # Assemble the cinematic prompt
        style = art_style or "vibrant comic book portrait, clean expressive line art, anime-adjacent style, vivid colors, richly detailed"
        prompt = await build_cinematic_prompt(understanding, profiles, style)

        if not prompt:
            # Fallback portrait prompt
            prompt = (
                f"Vibrant comic book illustration, clean expressive line art, anime-adjacent style, vivid colors. "
                f"Character portrait of {profile}. "
                f"Medium or close-up shot. Expressive face, clean detailed costume. "
                f"No text, no speech bubbles, no captions, no watermarks."
            )

        logger.info(f"[Portrait] Prompt assembled for '{char_name}' | {prompt[:120]}...")

        # ── 4. Generate image ─────────────────────────────────────────────────
        img_bytes = await generate_gpt_image(prompt)

        # Await the visual summary (should already be done)
        ai_visual_summary = await summary_task

        # ── 5. Save locally ───────────────────────────────────────────────────
        safe_name = "".join([c if c.isalnum() else "_" for c in char_name.lower()])
        filename  = f"{project_id}_{safe_name}.png"
        filepath  = AVATAR_DIR / filename

        with open(filepath, "wb") as f:
            f.write(img_bytes)

        public_url = f"/avatars/{filename}"
        logger.info(f"[Portrait] Saved portrait for '{char_name}' → {public_url}")

        # ── 6. Update Supabase ────────────────────────────────────────────────
        pc_update = {"image_url": public_url}
        if ai_visual_summary:
            pc_update["ai_visual_summary"] = ai_visual_summary

        supabase.table("project_characters").update(pc_update).eq(
            "project_id", project_id
        ).eq("name", char_name).execute()

        # Also update the NLP-extracted characters table
        supabase.table("characters").update({"image_url": public_url}).eq(
            "project_id", project_id
        ).ilike("name", char_name).execute()

        return public_url, ai_visual_summary

    except Exception as e:
        logger.error(f"[Portrait] Failed to generate image for '{char_name}': {e}")
        return None, None
