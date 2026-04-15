-- Migration: Add image_url to characters
-- Description: Adds a column to persist AI-generated cinematic portrait paths for all character tables.

-- 1. Update project_characters (The Setup Wizard Story Bible characters)
ALTER TABLE project_characters 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Update characters (Auto-extracted character records from spaCy)
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;
