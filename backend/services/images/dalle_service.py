import os
import requests
import logging
from openai import OpenAI, AsyncOpenAI
from pathlib import Path
from lib.supabase import supabase

logger = logging.getLogger("nolan.images.dalle")

# Initialize OpenAI client with key from .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Local storage path for avatars
# Relative to Nolan-editor/backend, we want Nolan-editor/frontend/public/avatars
BASE_DIR = Path(__file__).parent.parent.parent.parent
AVATAR_DIR = BASE_DIR / "frontend" / "public" / "avatars"

def ensure_avatar_dir():
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)


async def _generate_visual_summary(
    char_name: str,
    description: str,
    visual_description: str,
    age: str,
    clothing: str,
    traits: list,
) -> str:
    """
    Uses GPT-4o-mini to produce a tight 1-2 sentence AI visual summary
    shown in the sidebar CharacterCard after avatar generation.
    """
    try:
        prompt_parts = [f"Character name: {char_name}"]
        if description:
            prompt_parts.append(f"Story role: {description}")
        if visual_description:
            prompt_parts.append(f"Appearance notes: {visual_description}")
        if age:
            prompt_parts.append(f"Age: {age}")
        if clothing:
            prompt_parts.append(f"Clothing: {clothing}")
        if traits:
            prompt_parts.append(f"Traits: {', '.join(traits)}")

        user_msg = "\n".join(prompt_parts)
        resp = await async_client.chat.completions.create(
            model="gpt-4o-mini",
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
                {"role": "user", "content": user_msg},
            ],
            temperature=0.6,
            max_tokens=80,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"[DALL-E] Visual summary generation failed: {e}")
        return ""


async def generate_character_image(
    project_id: str,
    char_name: str,
    description: str = "",
    traits: list = None,
    visual_description: str = "",
    age: str = "",
    clothing: str = "",
    art_style: str = "",
):
    """
    Generates a high-fidelity cinematic portrait using DALL-E 3 (hd quality).
    Merges story-bible description, NLP traits, and user-supplied visual details
    into one rich prompt for the most accurate character avatar possible.
    Saves locally, updates Supabase, and returns the public URL.
    """
    try:
        if not os.getenv("OPENAI_API_KEY"):
            logger.error("[DALL-E] Missing OPENAI_API_KEY in .env")
            return None

        ensure_avatar_dir()

        # ── 1. Build the richest possible prompt ─────────────────────────────
        trait_str = ", ".join(traits) if traits else "enigmatic"
        style = art_style or "cinematic 2026-era narrative concept art, moody dramatic lighting"

        prompt_parts = [
            f"A character portrait of '{char_name}'.",
        ]
        if description:
            prompt_parts.append(f"Story role and background: {description}.")
        if visual_description:
            prompt_parts.append(f"Physical appearance: {visual_description}.")
        if age:
            prompt_parts.append(f"Age: {age}.")
        if clothing:
            prompt_parts.append(f"Wearing: {clothing}.")
        prompt_parts.append(f"Personality traits: {trait_str}.")
        prompt_parts.append(
            f"Art direction: {style}, rich detailed textures, "
            f"professional character design, 8K resolution. "
            f"No text, no speech bubbles, no watermarks in the image."
        )

        prompt = " ".join(prompt_parts)
        logger.info(f"[DALL-E] Generating portrait for '{char_name}' | prompt: {prompt[:140]}...")

        # ── 2. Generate visual summary in parallel with DALL-E ───────────────
        import asyncio
        summary_task = asyncio.create_task(
            _generate_visual_summary(char_name, description, visual_description, age, clothing, traits or [])
        )

        # ── 3. Call DALL-E 3 (hd) ────────────────────────────────────────────
        response = await async_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="hd",
            n=1,
        )

        image_url = response.data[0].url
        ai_visual_summary = await summary_task

        # ── 4. Download + save locally ─────────────────────────────────────
        img_data = requests.get(image_url, timeout=30).content

        safe_name = "".join([c if c.isalnum() else "_" for c in char_name.lower()])
        filename = f"{project_id}_{safe_name}.png"
        filepath = AVATAR_DIR / filename

        with open(filepath, "wb") as f:
            f.write(img_data)

        public_url = f"/avatars/{filename}"

        # ── 5. Update Supabase (both tables + ai_visual_summary) ─────────────
        pc_update = {"image_url": public_url}
        if ai_visual_summary:
            pc_update["ai_visual_summary"] = ai_visual_summary

        supabase.table("project_characters").update(pc_update).eq(
            "project_id", project_id
        ).eq("name", char_name).execute()

        # Also update extracted characters table (case-insensitive)
        supabase.table("characters").update({"image_url": public_url}).eq(
            "project_id", project_id
        ).ilike("name", char_name).execute()

        logger.info(f"[DALL-E] Portrait saved for '{char_name}' → {public_url}")
        return public_url, ai_visual_summary

    except Exception as e:
        logger.error(f"[DALL-E] Failed to generate image for '{char_name}': {e}")
        return None, None
