from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from services.llm.linter import run_linting_pipeline

router = APIRouter(prefix="/api/scenes", tags=["lint"])
logger = logging.getLogger("nolan.lint")

class LintRequest(BaseModel):
    project_id: str
    text: str

@router.post("/{scene_id}/lint")
async def lint_scene_text(scene_id: str, payload: LintRequest):
    """
    On-demand linting for grammatical, creative, and logic checks.
    Takes a small snippet of text from the active paragraph and returns suggestions.
    """
    try:
        if not payload.text or len(payload.text) < 5:
            return {"suggestions": []}
            
        suggestions = await run_linting_pipeline(payload.text, payload.project_id)
        return {"suggestions": suggestions}
        
    except Exception as e:
        logger.error(f"[LintRouter] Error formatting analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
