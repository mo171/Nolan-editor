-- ─── Nolan AI Studio — Migration 2: Fix Character Arc Tracking ─────────────
-- Run this once against your Supabase instance via the SQL editor.
-- This fixes the background worker crash when tracking character timelines.

-- Adds support for an array of scene IDs tracking when the character appears
ALTER TABLE characters ADD COLUMN IF NOT EXISTS scene_ids UUID[] DEFAULT '{}';

-- Adds support to count total appearances for filtering priority characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance_count INTEGER DEFAULT 0;
