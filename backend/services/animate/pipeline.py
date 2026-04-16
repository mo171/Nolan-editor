import os
import uuid
import logging
import asyncio
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

from lib.supabase import supabase
from services.audio.tts_service import TTSService, VOICE_REGISTRY
from services.audio.music_service import MusicService
from openai import AsyncOpenAI
import httpx

logger = logging.getLogger("nolan.animate.pipeline")

# Local storage paths
BASE_DIR = Path(__file__).parent.parent.parent.parent
ANIMATIC_DATA_DIR = BASE_DIR / "frontend" / "public" / "animatics"
AUDIO_DIR = BASE_DIR / "frontend" / "public" / "audio" / "animatic"
COMIC_DIR = BASE_DIR / "frontend" / "public" / "comics"

def ensure_dirs():
    ANIMATIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    COMIC_DIR.mkdir(parents=True, exist_ok=True)

# Initialize async OpenAI client for LLM direction
client = AsyncOpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

class AnimatePipeline:
    def __init__(self):
        self.tts = TTSService()
        self.music = MusicService()
        ensure_dirs()

    async def auto_cast_voices(self, project_id: str) -> Dict[str, str]:
        """
        Analyzes characters in the project and assigns the best AI voice for each.
        """
        try:
            # Fetch characters from Supabase
            res = supabase.table("project_characters").select("*").eq("project_id", project_id).execute()
            characters = res.data or []
            
            if not characters:
                return {"Narrator": "en-US-JennyNeural"}

            # Prepare character descriptions for LLM
            char_summaries = [f"{c['name']}: {c.get('description', 'Neutral')}, traits: {c.get('traits', 'None')}" for c in characters]
            available_voices_desc = json.dumps(VOICE_REGISTRY, indent=2)

            system_prompt = f"""
            You are a casting director for a cinematic animatic.
            Based on the character descriptions, assign the best 'edge-tts' voice ID for each character.
            
            Available Voices:
            {available_voices_desc}
            
            Return ONLY a JSON object mapping character name to Voice ID.
            Example: {{"John": "en-US-GuyNeural", "Mary": "en-US-JennyNeural"}}
            """
            
            model = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
            response = await client.chat.completions.create(
                model=model,
                response_format={ "type": "json_object" },
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Project Characters: {json.dumps(char_summaries)}"}
                ]
            )
            
            cast = json.loads(response.choices[0].message.content)
            # Add Narrator default if missing
            if "Narrator" not in cast:
                cast["Narrator"] = "en-US-JennyNeural"
            return cast
            
        except Exception as e:
            logger.error(f"[AutoCast] Error: {e}")
            return {"Narrator": "en-US-JennyNeural", "Default": "en-US-GuyNeural"}

    async def deconstruct_scene_to_shots(self, text: str) -> List[Dict]:
        """
        Breaks a single scene into 2-3 cinematic shots for a half-animation feel.
        """
        system_prompt = """
        You are a cinematic director. Break the following scene text into 2-3 distinct "Shots".
        For each shot, provide:
        - visual_description: A detailed cinematic prompt for 16:9 widescreen.
        - shot_type: Establishing, Close-up, Wide, or Medium.
        - segments: A list of narration/dialogue lines occurring in this specific shot.
        
        DIALOGUE RULES: Every line of dialogue from the text MUST be accounted for in a shot. 
        If a line is spoken, include "speaker" and "text".
        
        Return a JSON array of shots.
        Format:
        [
          {
            "visual_description": "...",
            "shot_type": "...",
            "segments": [
               {"type": "narration", "text": "..."},
               {"type": "dialogue", "speaker": "...", "text": "..."}
            ]
          }
        ]
        """
        
        try:
            model = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
            response = await client.chat.completions.create(
                model=model,
                response_format={ "type": "json_object" },
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Scene Text: {text}"}
                ]
            )
            # OpenAI response_format with json_object requires 'json' to be in prompt, 
            # and it returns a single object. We need to wrap it.
            data = json.loads(response.choices[0].message.content)
            # If the LLM returned {"shots": [...]}, return the list
            if "shots" in data: return data["shots"]
            if isinstance(data, list): return data
            return [data] # fallback
        except Exception as e:
            logger.error(f"[Deconstruct] Error: {e}")
            return []

    async def generate_cinematic_image(self, prompt: str, seed: Optional[int] = None) -> str:
        """
        Generates a 16:9 cinematic image. Uses a seed to maintain consistency across shots.
        """
        api_key = os.getenv("STABILITY_API_KEY")
        if not api_key: return "https://placehold.co/1280x720/1e1e24/ba9eff.png"

        try:
            endpoint = "https://api.stability.ai/v2beta/stable-image/generate/core"
            
            data = {
                "prompt": prompt + ", cinematic 16:9 widescreen, highly detailed, professional lighting, consistent character art style",
                "output_format": "png",
                "aspect_ratio": "16:9"
            }
            
            if seed is not None:
                data["seed"] = seed
            
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {api_key}", "Accept": "image/*"},
                    files={"none": ""},
                    data=data,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    filename = f"cinematic_{uuid.uuid4().hex[:12]}.png"
                    filepath = COMIC_DIR / filename
                    with open(filepath, "wb") as f:
                        f.write(response.content)
                    return f"/comics/{filename}"
                else:
                    logger.error(f"[Stability] Error {response.status_code}: {response.text}")
                    return "https://placehold.co/1280x720/1e1e24/ba9eff.png"
        except Exception as e:
            logger.error(f"[Stability] Error: {e}")
            return "https://placehold.co/1280x720/1e1e24/ba9eff.png"

    async def prepare_animatic(self, project_id: str, scene_ids: List[str], character_voices: Dict[str, str] = None) -> Dict:
        """
        Major Upgrade: Cinematic 16:9, Multi-Shot, Auto-Casting, and Caching.
        """
        # 1. Check Cache First
        cache_id = f"animatic_{project_id}_{'_'.join(scene_ids[:3])}_{len(scene_ids)}"
        cache_file = ANIMATIC_DATA_DIR / f"{cache_id}.json"
        
        if cache_file.exists():
            logger.info(f"[Animatic] Returning cached version: {cache_id}")
            with open(cache_file, "r") as f:
                return json.load(f)

        logger.info(f"[Animatic] Generating new cinematic experience for project {project_id}")
        
        # 2. Auto-Casting
        if not character_voices:
            character_voices = await self.auto_cast_voices(project_id)
        
        animatic_panels = []
        overall_emotions = []

        # 3. Process Scenes into Cinematic Shots
        for scene_id in scene_ids:
            res = supabase.table("scenes").select("*").eq("id", scene_id).single().execute()
            scene = res.data
            if not scene: continue
            
            text = scene.get("plain_text") or scene.get("content") or "Empty scene."
            shots = await self.deconstruct_scene_to_shots(text)
            
            import random
            scene_seed = random.randint(0, 4294967295)
            
            for shot_idx, shot in enumerate(shots):
                logger.info(f"[Animatic] Generating shot {shot_idx+1}/{len(shots)} for scene {scene_id}")
                
                # Visual Generation with Scene-Level Consistency
                image_url = await self.generate_cinematic_image(shot["visual_description"], seed=scene_seed)
                
                # Audio Synthesis for Shot Segments
                segments = []
                for seg in shot.get("segments", []):
                    voice = character_voices.get(seg.get("speaker"), character_voices.get("Narrator", "en-US-JennyNeural"))
                    
                    audio_filename = f"cine_{uuid.uuid4().hex[:8]}.mp3"
                    audio_path = AUDIO_DIR / audio_filename
                    
                    # Pitch/Rate variations for personality
                    pitch = "+0Hz"
                    rate = "+0%"
                    if seg.get("type") == "narration": rate = "-5%" # Slower narrators feel more epic
                    
                    success = await self.tts.generate_audio(seg["text"], str(audio_path), voice=voice, pitch=pitch, rate=rate)
                    
                    if success:
                        segments.append({
                            "id": str(uuid.uuid4()),
                            "type": seg["type"],
                            "speaker": seg.get("speaker"),
                            "text": seg["text"],
                            "audio_url": f"/audio/animatic/{audio_filename}"
                        })
                    
                    await asyncio.sleep(0.3) # Avoid 403 blocks

                animatic_panels.append({
                    "scene_id": scene_id,
                    "shot_type": shot["shot_type"],
                    "image_url": image_url,
                    "segments": segments
                })
                
                overall_emotions.append(shot.get("shot_type", "Normal"))

        # 4. Final Music Polish
        dominant_mood = "Dramatic" # Default
        bg_music_url = self.music.get_track_for_mood(dominant_mood)

        result = {
            "project_id": project_id,
            "panels": animatic_panels,
            "character_voices": character_voices,
            "background_music": bg_music_url,
            "metadata": {
                "cinematic": True,
                "aspect_ratio": "16:9",
                "total_shots": len(animatic_panels)
            }
        }

        # 5. Save to Cache
        with open(cache_file, "w") as f:
            json.dump(result, f)
            
        return result

# Global instance
pipeline = AnimatePipeline()
