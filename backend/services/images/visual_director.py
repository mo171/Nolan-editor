"""
Visual Director Agent
=====================
Two-layer pipeline for scene-faithful comic art image generation.

Layer 1 — Scene Parser Agent:
  Extracts a structured visual understanding from scene text.
  - Meticulously captures every visual detail the author HAS written.
  - Intelligently infers/predicts what the author hasn't stated (lighting,
    camera angle, color palette) from narrative context so nothing is vague.
  - Marks inferred fields with ★ prefix for auditability.

Layer 2 — Visual Director Agent:
  Assembles the final cinematic prompt from the structured scene understanding
  with locked Character Visual Profiles injected for cross-scene consistency.
  All output is in cinematic comic art style.

Entry points:
  generate_scene_image(scene_text, characters, art_style) → bytes
  generate_gpt_image(prompt) → bytes       ← for direct prompt use
  build_visual_profile(character) → str    ← for profile caching
"""

import os
import base64
import logging
import json
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("nolan.images.visual_director")

# ─── Model config ─────────────────────────────────────────────────────────────────
IMAGE_MODEL   = os.getenv("IMAGE_MODEL",   "dall-e-3")
IMAGE_QUALITY = os.getenv("IMAGE_QUALITY", "standard")   # dall-e-3: standard | hd
IMAGE_SIZE    = os.getenv("IMAGE_SIZE",    "1024x1024")
LLM_MODEL     = os.getenv("LLM_MODEL",     "openai/gpt-4o-mini")


# ─── Client singletons ────────────────────────────────────────────────────────

_image_client: AsyncOpenAI | None = None
_llm_client:   AsyncOpenAI | None = None


def _get_image_client() -> AsyncOpenAI:
    """Direct OpenAI client for GPT Image — NOT through OpenRouter."""
    global _image_client
    if _image_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "[VisualDirector] OPENAI_API_KEY is not set. "
                "GPT Image requires a direct OpenAI key, not OpenRouter."
            )
        _image_client = AsyncOpenAI(api_key=api_key)
    return _image_client


def _get_llm_client() -> AsyncOpenAI:
    """OpenRouter client for LLM scene-parsing calls."""
    global _llm_client
    if _llm_client is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("[VisualDirector] OPENROUTER_API_KEY is not set.")
        _llm_client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "https://nolan-editor.com",
                "X-Title": "Nolan AI Studio",
            },
        )
    return _llm_client


# ─── System prompts ───────────────────────────────────────────────────────────

_SCENE_PARSER_PROMPT = """\
You are a Visual Scene Parser for a cinematic comic art generator.

Your job is to extract a structured visual understanding from a piece of story \
text so it can be faithfully rendered as a stunning comic art panel.

═══════════════════════════════════════════════════════════
EXTRACTION RULES — follow exactly
═══════════════════════════════════════════════════════════

1. FAITHFUL EXTRACTION: Extract EVERY visual detail the author has explicitly \
written — characters, environment, objects, clothing, expressions, colors, \
weather, time of day. Do NOT summarize. Do NOT omit.

2. SMART INFERENCE: For any element the author has NOT written about, infer a \
sensible, cinematically evocative default from the surrounding context (genre, \
setting, mood, other details). Prefix inferred values with ★ so downstream \
systems know they were predicted, not stated.

3. CHARACTER PRECISION: For each character, extract their physical appearance, \
clothing, expression, and body language EXACTLY as written. If not described, \
infer from their emotional state and the scene's tension. Never leave blank.

4. ENVIRONMENT DEPTH: Be highly specific about location — not just "forest" \
but "ancient oak forest with gnarled roots, emerald-green light filtering \
through dense canopy, ground covered in wet leaves after rain, mist pooling \
between tree trunks". Extract every texured detail the author provided.

5. CAMERA PRECISION: Identify the most dramatically appropriate shot for this \
moment (extreme wide shot, medium shot, close-up, over-the-shoulder, bird's \
eye, worm's eye). Choose based on the emotional weight of the scene.

6. COLOR PALETTE: Infer the dominant color palette from the mood and setting \
if the author hasn't specified — e.g. warm amber for hopeful scenes, cold \
blue-gray for tension, deep crimson for violence.

═══════════════════════════════════════════════════════════
Return ONLY a valid JSON object in this exact structure:
═══════════════════════════════════════════════════════════
{
  "characters": [
    {
      "name": "character name as written",
      "appearance": "exact physical description or ★inferred from context",
      "clothing": "exact clothing or ★inferred",
      "expression": "exact facial expression or ★inferred from emotion",
      "pose": "exact body language / pose or ★inferred"
    }
  ],
  "environment": "highly detailed environment — architecture, geography, weather, props, textures",
  "mood": "dominant emotional atmosphere of the scene",
  "lighting": "specific lighting conditions — quality, direction, source (★inferred if absent)",
  "camera_angle": "dramatic shot type for this moment (★inferred if absent)",
  "time_of_day": "time + sky conditions (★inferred if absent)",
  "key_action": "the single most visually dramatic action happening right now",
  "color_palette": "2-3 dominant color tones (★inferred from mood if absent)",
  "style_notes": "any art style cues, genre markers, or visual tone from the text"
}
\
"""

_VISUAL_DIRECTOR_PROMPT = """\
You are the Visual Director AI for Nolan AI Studio.

Your task: convert a structured scene understanding into a single, rich, final \
image generation prompt for VIBRANT COMIC BOOK ART.

═══════════════════════════════════════════════════════════
RULES — no exceptions
═══════════════════════════════════════════════════════════

1. Output ONLY the final prompt string. No explanation. No JSON. No markdown.

2. Every prompt MUST open with the art style declaration:
   "Vibrant comic book illustration, clean expressive line art, anime-adjacent style, vivid colors,"

3. Inject character visual profiles EXACTLY as provided. Never paraphrase or \
modify character appearances — consistency depends on this.

4. Layer the prompt in this precise order:
   a) Art style + medium declaration
   b) Characters with their EXACT visual profiles, expression, and pose
   c) Key action / moment
   d) Environment — rich, specific
   e) Mood and color palette — let the scene tone guide color choices freely
   f) Camera composition

5. Be scene-specific. Capture EXACTLY what the scene describes — if it is a \
bright garden, use lush greens and warm sunlight; if it is a dark alley, use \
cool shadows. Do NOT force a style that contradicts the scene's natural mood.

6. Give the model creative liberty: describe WHAT to show (characters, setting, \
action) and let GPT Image decide HOW to render lighting, texture, and atmosphere \
based on context.

7. Close every prompt with:
   "No text, no speech bubbles, no captions, no watermarks. Clean illustration, \
expressive faces, richly detailed backgrounds."

8. Total prompt length: 100–200 words. Be concise and scene-faithful.
\
"""


# ─── Layer 1: Scene Parser ───────────────────────────────────────────────────

async def extract_scene_understanding(scene_text: str) -> dict:
    """
    Parses raw scene text into a structured visual understanding dict.
    Extracts what the author wrote, infers what they didn't.
    Returns empty dict on failure (caller should handle gracefully).
    """
    if not scene_text or not scene_text.strip():
        return {}

    try:
        llm = _get_llm_client()
        resp = await llm.chat.completions.create(
            model=LLM_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SCENE_PARSER_PROMPT},
                {"role": "user",   "content": f"SCENE TEXT:\n{scene_text[:3000]}"},
            ],
            temperature=0.35,   # Low temp for faithful extraction
            max_tokens=1200,
        )
        return json.loads(resp.choices[0].message.content)

    except Exception as e:
        logger.error(f"[VisualDirector] Scene parsing failed: {e}")
        return {}


# ─── Character Visual Profile ─────────────────────────────────────────────────

def build_visual_profile(character: dict) -> str:
    """
    Converts character DB data into a locked, frozen visual profile string.
    This string is injected verbatim into every image prompt that features
    this character, ensuring visual consistency across all generated images.

    Priority order: ai_visual_summary > description > role > traits
    """
    parts = []
    name = character.get("name", "Unknown Character")
    parts.append(name)

    age = character.get("age", "")
    if age:
        parts.append(f"({age} years old)")

    role = character.get("role", "")
    if role:
        parts.append(f"({role})")

    ai_viz = character.get("ai_visual_summary", "")
    visual = character.get("visual_description", "")
    desc   = character.get("description", "")
    
    # Prioritize user's explicit visual description if provided, fallback to AI summary
    if visual:
        parts.append(f"— {visual}")
    elif ai_viz:
        parts.append(f"— {ai_viz}")
    elif desc:
        # Trim to avoid over-stuffing the prompt
        parts.append(f"— {desc[:180]}")

    clothing = character.get("clothing", "")
    if clothing:
        parts.append(f"wearing {clothing}")

    traits = character.get("traits", [])
    if traits:
        if isinstance(traits, list):
            trait_str = ", ".join(traits[:3])
        else:
            trait_str = str(traits)
        parts.append(f"[traits: {trait_str}]")

    return " ".join(parts)


# ─── Layer 2: Visual Director ─────────────────────────────────────────────────

async def build_cinematic_prompt(
    scene_understanding: dict,
    character_profiles: dict,    # {char_name: visual_profile_string}
    art_style: str = "",
) -> str:
    """
    Visual Director Agent — assembles the final cinematic prompt string.
    Injects character visual profiles for cross-scene consistency.
    Falls back to manual assembly if LLM call fails.
    """
    if not scene_understanding:
        return ""

    # Build character injection block — profiles take priority over scene extraction
    char_blocks = []
    for char in scene_understanding.get("characters", []):
        name = char.get("name", "")
        # Use the stored visual profile (or build one from scene understanding)
        if name and name in character_profiles:
            profile = character_profiles[name]
        else:
            # On-the-fly profile from scene understanding
            parts = [name] if name else ["a figure"]
            if char.get("appearance"):
                parts.append(f"— {char['appearance']}")
            profile = " ".join(parts)

        expression = char.get("expression", "")
        pose       = char.get("pose", "")
        extras = []
        if expression:
            extras.append(expression)
        if pose:
            extras.append(pose)
        if extras:
            profile += f", {', '.join(extras)}"
        char_blocks.append(profile)

    # Compose the scene context payload for the Visual Director LLM
    scene_ctx = {
        "art_style":          art_style or "cinematic graphic novel, dark moody palette",
        "characters":         char_blocks,
        "key_action":         scene_understanding.get("key_action", ""),
        "environment":        scene_understanding.get("environment", ""),
        "lighting":           scene_understanding.get("lighting", ""),
        "time_of_day":        scene_understanding.get("time_of_day", ""),
        "mood":               scene_understanding.get("mood", ""),
        "camera_angle":       scene_understanding.get("camera_angle", "medium shot"),
        "color_palette":      scene_understanding.get("color_palette", ""),
        "style_notes":        scene_understanding.get("style_notes", ""),
    }

    try:
        llm = _get_llm_client()
        user_msg = json.dumps(scene_ctx, indent=2, ensure_ascii=False)
        resp = await llm.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": _VISUAL_DIRECTOR_PROMPT},
                {"role": "user",   "content": f"Generate the image prompt:\n{user_msg}"},
            ],
            temperature=0.5,
            max_tokens=600,
        )
        return resp.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"[VisualDirector] Prompt assembly LLM failed ({e}), using fallback")
        # ── Fallback: assemble manually ──────────────────────────────────────
        parts = ["Vibrant comic book illustration, clean expressive line art, anime-adjacent style, vivid colors,"]
        if char_blocks:
            parts.append(f"featuring {'; '.join(char_blocks)}.")
        if scene_understanding.get("key_action"):
            parts.append(scene_understanding["key_action"] + ".")
        if scene_understanding.get("environment"):
            parts.append(f"Setting: {scene_understanding['environment']}.")
        if scene_understanding.get("mood"):
            parts.append(f"Mood: {scene_understanding['mood']}.")
        if scene_understanding.get("camera_angle"):
            parts.append(f"Shot: {scene_understanding['camera_angle']}.")
        parts.append(
            "No text, no speech bubbles, no captions, no watermarks. "
            "Clean illustration, expressive faces, richly detailed backgrounds."
        )
        return " ".join(parts)


# ─── Image caller ─────────────────────────────────────────────────────────

async def generate_gpt_image(
    prompt: str,
    size: str | None = None,
) -> bytes:
    """
    Calls DALL-E 3 and returns raw image bytes.

    DALL-E 3 API facts:
    - Supports response_format='b64_json' to return base64 directly.
    - Quality: 'standard' or 'hd'  (NOT 'low'/'medium'/'high' — those are gpt-image-1)
    - Always set response_format='b64_json' to avoid expiring URL links.
    """
    openai_client = _get_image_client()
    model    = IMAGE_MODEL
    quality  = IMAGE_QUALITY
    img_size = size or IMAGE_SIZE

    logger.info(
        f"[Image] Generating | model={model} quality={quality} size={img_size} "
        f"| prompt[:120]: {prompt[:120]}..."
    )

    try:
        response = await openai_client.images.generate(
            model=model,
            prompt=prompt,
            size=img_size,
            quality=quality,
            n=1,
            response_format="b64_json",   # DALL-E 3 supports this; returns base64 directly
        )

        b64_data = response.data[0].b64_json
        if not b64_data:
            raise ValueError("[Image] b64_json is empty — check model/API key")

        img_bytes = base64.b64decode(b64_data)
        logger.info(f"[Image] ✅ Generated {len(img_bytes):,} bytes")
        return img_bytes

    except Exception as e:
        logger.error(f"[Image] Generation failed: {e}")
        raise


# ─── Main entry point ─────────────────────────────────────────────────────────

async def generate_scene_image(
    scene_text: str,
    characters: list,            # list of character dicts from project_characters
    art_style: str = "",
) -> bytes:
    """
    Full two-layer pipeline:
      scene_text → Scene Understanding → Cinematic Prompt → GPT Image → bytes

    This is the primary function called by comic generation and portrait routes.

    Args:
        scene_text:  Raw scene prose (HTML stripped to plain text by caller)
        characters:  project_characters rows for this project (for visual profiles)
        art_style:   Optional override (e.g. "noir", "watercolor")

    Returns:
        Raw PNG/JPEG bytes ready to write to disk.
    """
    # Step 1 + 2: parse scene + build profiles concurrently
    understanding_task = asyncio.create_task(
        extract_scene_understanding(scene_text)
    )

    # Build visual profiles from project character data (sync, fast)
    profiles = {
        c["name"]: build_visual_profile(c)
        for c in characters
        if c.get("name")
    }

    understanding = await understanding_task

    if not understanding:
        logger.warning("[VisualDirector] Scene understanding empty — using minimal prompt")

    # Step 3: assemble cinematic prompt
    prompt = await build_cinematic_prompt(understanding, profiles, art_style)

    if not prompt:
        # Last-resort fallback prompt
        prompt = (
            "Vibrant comic book illustration, clean expressive line art, anime-adjacent style, vivid colors. "
            "An illustrated scene with expressive characters, richly detailed backgrounds, "
            "dynamic composition. "
            "No text, no speech bubbles, no watermarks."
        )
        logger.warning("[VisualDirector] Using last-resort fallback prompt")

    # Step 4: generate
    return await generate_gpt_image(prompt)
