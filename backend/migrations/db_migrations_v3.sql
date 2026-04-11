-- ─── Nolan AI Studio — Migration 3: Fix Project Character Insertion ─────────────
-- Run this once against your Supabase instance via the SQL editor.
-- This fixes the bug where character creation failed due to the missing 'user_defined' column

ALTER TABLE characters ADD COLUMN IF NOT EXISTS user_defined BOOLEAN DEFAULT false;
