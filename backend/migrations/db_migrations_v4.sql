-- ─── Nolan AI Studio — Migration 4: Upgrade Embedding Dimensions ─────────────
-- Run this once against your Supabase instance via the SQL editor.
-- This upgrades from all-MiniLM-L6-v2 (384d) to all-mpnet-base-v2 (768d)
-- for significantly better creative writing semantic understanding.

-- WARNING: This will DROP all existing embeddings. Re-index after migration.

-- 1. Drop the old embedding column
ALTER TABLE scene_embeddings DROP COLUMN IF EXISTS embedding;

-- 2. Add new 768-dimensional embedding column
ALTER TABLE scene_embeddings ADD COLUMN embedding vector(768);

-- 3. Update the RPC function signature
CREATE OR REPLACE FUNCTION search_scene_embeddings (
    query_embedding vector(768),  -- Updated from 384 to 768
    project_filter UUID,
    match_count INT DEFAULT 5,
    is_dna_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    chunk_text TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.id,
        se.chunk_text,
        se.metadata,
        1 - (se.embedding <=> query_embedding) AS similarity
    FROM scene_embeddings se
    WHERE se.project_id = project_filter
      AND (is_dna_only = FALSE OR (se.metadata->>'is_dna_source')::boolean = TRUE)
    ORDER BY se.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 4. After running this migration, trigger re-indexing of all scenes:
--    UPDATE scenes SET nlp_processed = FALSE WHERE nlp_processed = TRUE;
--    This will cause the background worker to re-embed everything with the new model.
