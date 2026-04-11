-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Projects ──────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    genre TEXT,

    -- Project Setup Wizard fields (collected at creation)
    premise TEXT,                        -- "A hare challenges a lion..."
    desired_ending TEXT,                 -- "The hare wins through wit"
    themes TEXT[],                       -- ['redemption', 'power', 'survival']
    llm_temperature FLOAT DEFAULT 0.7,  -- controls ghost text creativity (0.0–1.0)

    -- DNA fingerprint (extracted from reference story upload)
    dna_fingerprint JSONB,              -- {avg_sentence_len, vocab_diversity, ...}
    dna_source_file TEXT,               -- filename of uploaded reference story
    has_custom_dna BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Project Characters (pre-defined at setup) ────────────────────────────
CREATE TABLE project_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,                          -- 'protagonist' | 'antagonist' | 'supporting'
    description TEXT,
    traits TEXT[],                      -- ['brave', 'cunning', 'vengeful']
    user_defined BOOLEAN DEFAULT TRUE,  -- false = auto-extracted by spaCy
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Chapters ─────────────────────────────────────────────────────────────
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Scenes (core content unit) ───────────────────────────────────────────
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,                        -- Tiptap HTML
    plain_text TEXT,                     -- Stripped, for NLP
    word_count INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    nlp_processed BOOLEAN DEFAULT FALSE,
    bert_processed BOOLEAN DEFAULT FALSE,
    last_processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NLP Results per Scene ────────────────────────────────────────────────
CREATE TABLE scene_nlp_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE UNIQUE,
    entities JSONB,                      -- [{text, label, start, end, coref_to}]
    svo_triples JSONB,                  -- [["Arthur", "picked up", "sword"]]
    sentiment_score FLOAT,
    sentiment_label TEXT,
    emotion_tags TEXT[],
    dominant_emotion TEXT,
    emotion_breakdown JSONB,
    detected_characters TEXT[],
    detected_locations TEXT[],
    arc_change_detected BOOLEAN DEFAULT FALSE,
    arc_change_detail JSONB,           -- {character, change_description, suggestion}
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Auto-extracted Characters (from spaCy) ───────────────────────────────
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    aliases TEXT[],
    arc_summary TEXT,
    last_known_location TEXT,
    last_known_emotion TEXT,
    total_mentions INTEGER DEFAULT 0,
    first_seen_scene_id UUID REFERENCES scenes(id),
    UNIQUE(project_id, name)
);

-- ─── pgvector: Scene Embeddings (for RAG) ────────────────────────────────
CREATE TABLE scene_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(384),             -- all-MiniLM-L6-v2 produces 384-dim
    metadata JSONB,                    -- {chapter_pos, scene_pos, characters, emotion, is_dna_source}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── pgvector: DNA Source Embeddings (reference story) ───────────────────
-- Same table, metadata.is_dna_source = true distinguishes them
-- Allows boosting DNA chunks during retrieval

-- ─── RPC Function: semantic search ───────────────────────────────────────
CREATE OR REPLACE FUNCTION search_scene_embeddings (
    query_embedding vector(384),
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
