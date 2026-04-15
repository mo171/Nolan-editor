import os
import requests
import logging
from openai import OpenAI
from pathlib import Path
from lib.supabase import supabase

logger = logging.getLogger("nolan.images.dalle")

# Initialize OpenAI client with key from .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Local storage path for avatars
# Relative to Nolan-editor/backend, we want Nolan-editor/frontend/public/avatars
BASE_DIR = Path(__file__).parent.parent.parent.parent
AVATAR_DIR = BASE_DIR / "frontend" / "public" / "avatars"

def ensure_avatar_dir():
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)

async def generate_character_image(project_id: str, char_name: str, description: str = "", traits: list = None):
    """
    Generates a cinematic portrait using DALL-E 3 and saves it locally.
    Updates supabase with the relative public path.
    """
    try:
        if not os.getenv("OPENAI_API_KEY"):
            logger.error("[DALL-E] Missing OPENAI_API_KEY in .env")
            return None

        ensure_avatar_dir()
        
        # 1. Construct the Prompt
        trait_str = ", ".join(traits) if traits else "enigmatic"
        prompt = (
            f"Cinematic high-end character portrait of '{char_name}'. "
            f"Description: {description}. Personality traits: {trait_str}. "
            f"Style: 2026-era high-fidelity narrative concept art, moody cinematic lighting, "
            f"detailed textures, 8k, professional character design. No text in image."
        )

        logger.info(f"[DALL-E] Generating portrait for {char_name}...")
        
        # 2. Call OpenAI
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url
        
        # 3. Download the image
        img_data = requests.get(image_url).content
        
        # Generate a safe filename
        safe_name = "".join([c if c.isalnum() else "_" for c in char_name.lower()])
        filename = f"{project_id}_{safe_name}.png"
        filepath = AVATAR_DIR / filename
        
        with open(filepath, 'wb') as f:
            f.write(img_data)
            
        public_url = f"/avatars/{filename}"
        
        # 4. Update Supabase (in both tables to be safe)
        supabase.table("project_characters").update({"image_url": public_url}).eq("project_id", project_id).eq("name", char_name).execute()
        
        # Also update the extracted character table (case insensitive match)
        supabase.table("characters").update({"image_url": public_url}).eq("project_id", project_id).ilike("name", char_name).execute()

        logger.info(f"[DALL-E] Portrait saved for {char_name} at {public_url}")
        return public_url

    except Exception as e:
        logger.error(f"[DALL-E] Failed to generate image for {char_name}: {e}")
        return None
