-- ─── Neural Analysis Stats (Tribe v2) ──────────────────────────────────────────
-- Stores Predicted fMRI brain responses mapped to narrative KPIs.

CREATE TABLE IF NOT EXISTS public.scene_neural_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE UNIQUE,
    
    -- Time-series data: [{ "t": 0.5, "v": 0.65 }, ...]
    arousal_data JSONB,    -- Amygdala + Insula (Tension/Excitement)
    visual_data JSONB,     -- Occipital Lobe (Mental Vividness)
    semantic_data JSONB,   -- Prefrontal Cortex (Complexity/Thought)
    reward_data JSONB,     -- Ventral Striatum (Hook/Novelty)
    
    -- Actionable Insights
    lulls JSONB,           -- [{ "start": 30.0, "end": 65.0, "reason": "Low visual stimulus" }]
    hook_score FLOAT,      -- Average reward in the first 60 seconds
    
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_scene_neural_stats_updated_at 
    BEFORE UPDATE ON public.scene_neural_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
