from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict
import logging

from services.analytics.neural_engine import NeuralEngine
from lib.supabase import supabase

router = APIRouter(prefix="/api/analytics", tags=["neural-analytics"])
logger = logging.getLogger("nolan.analytics.router")

neural_engine = NeuralEngine()

class NeuralSyncRequest(BaseModel):
    project_id: str
    scene_id: str
    text: str

@router.post("/sync")
async def sync_neural_stats(payload: NeuralSyncRequest):
    """
    Manually triggers a Tribe v2 analysis for a scene.
    Stores aggregated results in Supabase.
    """
    try:
        # 1. Run Analysis (Manual trigger as requested)
        results = await neural_engine.analyze_scene(payload.text)
        
        # 2. Persist to Supabase
        stats_data = {
            "scene_id": payload.scene_id,
            "arousal_data": results["arousal"],
            "visual_data": results["visual"],
            "semantic_data": results["semantic"],
            "reward_data": results["reward"],
            "lulls": results["lulls"],
            "hook_score": results["hook_score"],
            "updated_at": "now()"
        }

        # Upsert logic
        res = supabase.table("scene_neural_stats").upsert(stats_data, on_conflict="scene_id").execute()
        
        return {
            "status": "success",
            "scene_id": payload.scene_id,
            "stats": stats_data
        }

    except Exception as e:
        logger.error(f"[AnalyticsRouter] Error syncing neural stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scene/{scene_id}")
async def get_scene_neural_stats(scene_id: str):
    """Fetches previously analyzed stats for a scene."""
    try:
        res = supabase.table("scene_neural_stats").select("*").eq("scene_id", scene_id).single().execute()
        if not res.data:
            return {"status": "not_analyzed"}
        return res.data
    except Exception as e:
        logger.error(f"[AnalyticsRouter] Error fetching stats: {e}")
        return {"status": "error", "message": str(e)}
