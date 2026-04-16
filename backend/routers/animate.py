from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid
import logging

from services.animate.pipeline import pipeline
from lib.redis_client import cache # Assuming redis for session storage if needed

router = APIRouter(prefix="/api/animate", tags=["animate"])
logger = logging.getLogger("nolan.animate")

class AnimateRequest(BaseModel):
    project_id: str
    scene_ids: List[str]
    character_voices: Optional[Dict[str, str]] = None # {"John": "en-US-GuyNeural"}

@router.get("/voices")
async def get_voices():
    """Returns available high-fidelity voices for selection."""
    from services.audio.tts_service import VOICE_REGISTRY
    return VOICE_REGISTRY

@router.post("/generate")
async def generate_animatic(payload: AnimateRequest):
    """
    Triggers the generation of an animatic session.
    Returns the full structured data for the frontend player.
    """
    try:
        # For small numbers of scenes, we can generate synchronously or with background tasks
        # Here we do it "inline" for simplicity of getting the result back to the UI immediately
        # (Though in production, this should ideally be via WebSockets/Redis status).
        result = await pipeline.prepare_animatic(
            payload.project_id, 
            payload.scene_ids, 
            payload.character_voices
        )
        return result
    except Exception as e:
        logger.error(f"[Animate] Generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
