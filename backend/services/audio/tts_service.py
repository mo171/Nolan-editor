import asyncio
import os
import logging
from pathlib import Path

try:
    import edge_tts
except Exception:
    edge_tts = None

logger = logging.getLogger("nolan.audio.tts")

# Registry of available voices (shortlist for high-fidelity)
# Full list can be fetched via `edge-tts --list-voices`
VOICE_REGISTRY = {
    "en-US-GuyNeural": {"gender": "Male", "name": "Guy (US)"},
    "en-US-JennyNeural": {"gender": "Female", "name": "Jenny (US)"},
    "en-GB-SoniaNeural": {"gender": "Female", "name": "Sonia (UK)"},
    "en-GB-RyanNeural": {"gender": "Male", "name": "Ryan (UK)"},
    "en-AU-NatashaNeural": {"gender": "Female", "name": "Natasha (AU)"},
    "en-AU-WilliamNeural": {"gender": "Male", "name": "William (AU)"},
    # Indian voices as requested for specific contexts
    "en-IN-NeerjaNeural": {"gender": "Female", "name": "Neerja (IN)"},
    "en-IN-PrabhatNeural": {"gender": "Male", "name": "Prabhat (IN)"},
}

class TTSService:
    @staticmethod
    async def list_voices():
        """Returns the shortlist of high-fidelity voices."""
        return VOICE_REGISTRY

    @staticmethod
    async def generate_audio(text: str, output_path: str, voice: str = "en-US-GuyNeural", pitch: str = "+0Hz", rate: str = "+0%"):
        """
        Generates an MP3 file from text using edge-tts.
        Allows for styling via pitch and rate.
        """
        if edge_tts is None:
            logger.warning("[TTS] edge-tts is not installed. Skipping audio generation.")
            return False

        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Ensure directory exists
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                communicate = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate)
                await communicate.save(output_path)
                
                if os.path.exists(output_path):
                    logger.info(f"[TTS] Generated audio: {output_path}")
                    return True
                return False
            except Exception as e:
                logger.warning(f"[TTS] Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1) # Wait before retry
                else:
                    logger.error(f"[TTS] Final generation failure: {e}")
                    return False

# Dependency injection style helper
async def get_tts_service():
    return TTSService()
