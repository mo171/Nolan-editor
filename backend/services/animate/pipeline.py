"""
Animatic Pipeline
==================
Builds an audio-video storybook experience per chapter:

  For each scene:
  1. Reuse the existing comic book panel image (no new image generation)
  2. Run a "Script Extractor" LLM to pick only the key narration lines + dialogue
     (never floods the viewer with all text — cinematic highlight only)
  3. Generate TTS audio per segment, with per-scene caching
     (if audio already exists on disk, reuse it — never regenerate)
  4. Return structured data for the AnimaticPlayer frontend (Ken Burns + subtitles)
"""

import os
import uuid
import hashlib
import logging
import asyncio
import json
from typing import List, Dict, Optional
from pathlib import Path

from lib.supabase import supabase
from services.audio.tts_service import TTSService, VOICE_REGISTRY
from services.audio.music_service import MusicService
from openai import AsyncOpenAI

logger = logging.getLogger("nolan.animate.pipeline")

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR          = Path(__file__).parent.parent.parent.parent
ANIMATIC_DATA_DIR = BASE_DIR / "frontend" / "public" / "animatics"
AUDIO_DIR         = BASE_DIR / "frontend" / "public" / "audio" / "animatic"
COMIC_DIR         = BASE_DIR / "frontend" / "public" / "comics"

def _ensure_dirs():
    ANIMATIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    COMIC_DIR.mkdir(parents=True, exist_ok=True)

# ─── OpenAI client (for script extraction LLM) ────────────────────────────────
_llm_client: AsyncOpenAI | None = None


def _resolve_model() -> str:
    from services.llm.client import resolve_model
    return resolve_model()

def _get_llm_client() -> AsyncOpenAI:
    global _llm_client
    if _llm_client is None:
        from services.llm.client import get_async_openai
        _llm_client = get_async_openai()
    return _llm_client

# ─── Script Extractor ─────────────────────────────────────────────────────────

_SCRIPT_PROMPT = """\
You are a cinematic script editor for an audiobook-style story presentation.

Your job: read a scene and extract the 2-4 most emotionally impactful lines to READ ALOUD.
These will be displayed as subtitles while the scene image is shown.

RULES:
1. Pick ONLY the key lines — the ones that carry the most narrative weight, tension, or emotion.
2. Never pick every sentence. Be selective. Less is more.
3. Classify each line as either "narration" (story prose) or "dialogue" (character speech).
4. For dialogue, include the speaker's name.
5. Each line should be SHORT — max 25 words for narration, max 15 words for dialogue.
   Trim/rephrase if needed to fit.
6. Return ONLY valid JSON — no markdown, no explanation.

Return this exact structure:
{
  "segments": [
    {"type": "narration", "speaker": null, "text": "..."},
    {"type": "dialogue",  "speaker": "Character Name", "text": "..."}
  ]
}
"""

async def extract_scene_script(scene_text: str) -> List[Dict]:
    """
    Uses LLM to pick only the key narration + dialogue lines from a scene.
    Returns a list of segment dicts: [{type, speaker, text}, ...]
    Falls back to a simple excerpt if LLM fails.
    """
    if not scene_text or not scene_text.strip():
        return []

    try:
        llm = _get_llm_client()
        resp = await llm.chat.completions.create(
            model=_resolve_model(),
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SCRIPT_PROMPT},
                {"role": "user",   "content": f"SCENE:\n{scene_text[:3000]}"},
            ],
            temperature=0.4,
            max_tokens=600,
        )
        data = json.loads(resp.choices[0].message.content)
        segments = data.get("segments", [])
        if isinstance(segments, list) and segments:
            return segments
    except Exception as e:
        logger.warning(f"[AnimatePipeline] Script extraction failed: {e}")

    # Fallback: just take the first 2 sentences as narration
    sentences = [s.strip() for s in scene_text.replace("\n", " ").split(".") if s.strip()]
    fallback = sentences[:2]
    return [
        {"type": "narration", "speaker": None, "text": s[:120]}
        for s in fallback if s
    ]


class AnimatePipeline:
    def __init__(self):
        self.tts   = TTSService()
        self.music = MusicService()
        _ensure_dirs()

    async def auto_cast_voices(self, project_id: str) -> Dict[str, str]:
        """Assigns the best AI voice to each character using LLM casting."""
        try:
            res = supabase.table("project_characters").select(
                "name, description, traits"
            ).eq("project_id", project_id).execute()
            characters = res.data or []

            if not characters:
                return {"Narrator": "en-US-JennyNeural"}

            char_summaries = [
                f"{c['name']}: {c.get('description', 'neutral')}, traits: {c.get('traits', [])}"
                for c in characters
            ]

            llm = _get_llm_client()
            resp = await llm.chat.completions.create(
                model=_resolve_model(),
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a voice casting director. "
                            "Assign the best edge-tts voice ID to each character. "
                            f"Available voices: {json.dumps(VOICE_REGISTRY)}. "
                            "Return ONLY a JSON object: {\"CharacterName\": \"voice-id\"}."
                        ),
                    },
                    {"role": "user", "content": f"Characters: {json.dumps(char_summaries)}"},
                ],
            )
            cast = json.loads(resp.choices[0].message.content)
            cast.setdefault("Narrator", "en-US-JennyNeural")
            return cast

        except Exception as e:
            logger.error(f"[AutoCast] Failed: {e}")
            return {"Narrator": "en-US-JennyNeural", "Default": "en-US-GuyNeural"}

    def _audio_cache_path(self, scene_id: str, segment_index: int) -> Path:
        """Deterministic audio file path per scene+segment — for caching."""
        return AUDIO_DIR / f"scene_{scene_id[:8]}_seg{segment_index}.mp3"

    async def _get_or_generate_audio(
        self,
        text: str,
        scene_id: str,
        segment_index: int,
        voice: str,
        rate: str = "-5%",
    ) -> str | None:
        """
        Returns audio_url for the segment.
        If the file already exists on disk, skips TTS and reuses it.
        """
        audio_path = self._audio_cache_path(scene_id, segment_index)
        audio_url  = f"/audio/animatic/{audio_path.name}"

        if audio_path.exists():
            logger.info(f"[Animatic] Reusing cached audio: {audio_path.name}")
            return audio_url

        success = await self.tts.generate_audio(
            text, str(audio_path), voice=voice, pitch="+0Hz", rate=rate
        )
        if success:
            logger.info(f"[Animatic] Generated audio: {audio_path.name}")
            return audio_url

        logger.warning(f"[Animatic] TTS failed for segment {segment_index} of scene {scene_id}")
        return None

    async def prepare_animatic(
        self,
        project_id: str,
        scene_ids: List[str],
        character_voices: Dict[str, str] = None,
    ) -> Dict:
        """
        Builds the animatic result:
        - Reuses existing comic panel images (one per scene)
        - Extracts smart script (key narration + dialogue only) via LLM
        - Generates/reuses TTS audio per segment
        - Returns structured data for the AnimaticPlayer
        """
        _ensure_dirs()

        # 1. Auto-cast voices if not provided
        if not character_voices:
            character_voices = await self.auto_cast_voices(project_id)

        # 2. Fetch all existing comic panels in one query
        comic_panel_map: Dict[str, str] = {}
        try:
            panels_res = supabase.table("comic_panels").select(
                "scene_id, image_url"
            ).in_("scene_id", scene_ids).execute()

            for panel in (panels_res.data or []):
                sid = panel.get("scene_id")
                url = panel.get("image_url")
                if sid and url and sid not in comic_panel_map:
                    comic_panel_map[sid] = url

            logger.info(f"[Animatic] {len(comic_panel_map)} comic panels available")
        except Exception as e:
            logger.warning(f"[Animatic] Could not fetch comic panels: {e}")

        animatic_panels = []

        # 3. Process each scene
        for scene_id in scene_ids:
            try:
                res = supabase.table("scenes").select(
                    "plain_text, content, title"
                ).eq("id", scene_id).single().execute()
                scene = res.data
                if not scene:
                    continue

                text = scene.get("plain_text") or scene.get("content") or ""
                if not text.strip():
                    continue

                # ── Image: reuse comic panel ──────────────────────────────
                image_url = comic_panel_map.get(
                    scene_id,
                    "https://placehold.co/1024x1024/1e1e24/ba9eff.png"
                )

                # ── Script: LLM extracts key lines ────────────────────────
                script_segments = await extract_scene_script(text)

                # ── Audio: generate or reuse per segment ──────────────────
                segments = []
                for idx, seg in enumerate(script_segments):
                    seg_text  = seg.get("text", "").strip()
                    seg_type  = seg.get("type", "narration")
                    speaker   = seg.get("speaker") or "Narrator"

                    if not seg_text:
                        continue

                    # Pick voice: narrator for narration, character voice for dialogue
                    if seg_type == "dialogue":
                        voice = character_voices.get(speaker, character_voices.get("Narrator", "en-US-JennyNeural"))
                        rate  = "+0%"
                    else:
                        voice = character_voices.get("Narrator", "en-US-JennyNeural")
                        rate  = "-5%"   # slightly slower for narration

                    audio_url = await self._get_or_generate_audio(
                        seg_text, scene_id, idx, voice, rate
                    )

                    segments.append({
                        "id":        str(uuid.uuid4()),
                        "type":      seg_type,
                        "speaker":   speaker if seg_type == "dialogue" else None,
                        "text":      seg_text,
                        "audio_url": audio_url,
                    })

                animatic_panels.append({
                    "scene_id":  scene_id,
                    "shot_type": "Scene",
                    "image_url": image_url,
                    "segments":  segments,
                })

                img_src = "comic" if scene_id in comic_panel_map else "placeholder"
                logger.info(
                    f"[Animatic] Scene {scene_id[:8]} | image={img_src} "
                    f"| {len(segments)} segments"
                )

            except Exception as e:
                logger.error(f"[Animatic] Failed scene={scene_id}: {e}")
                continue

        result = {
            "project_id":       project_id,
            "panels":           animatic_panels,
            "character_voices": character_voices,
            "background_music": self.music.get_track_for_mood("Dramatic"),
            "metadata": {
                "cinematic":           True,
                "aspect_ratio":        "1:1",
                "total_shots":         len(animatic_panels),
                "reused_comic_images": len(comic_panel_map),
            },
        }

        logger.info(
            f"[Animatic] Done | {len(animatic_panels)} panels | "
            f"{len(comic_panel_map)} comic images reused"
        )
        return result


# Global instance
pipeline = AnimatePipeline()

