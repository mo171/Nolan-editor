-- ─── Nolan AI Studio — Migration: Extended Project Metadata ───────────────────
-- Run this once against your Supabase instance via the SQL editor.
-- All statements use ADD COLUMN IF NOT EXISTS — completely safe to re-run.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS tone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS setting_description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS story_foundation TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conflict_types TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tension_tags TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inciting_incident TEXT;
