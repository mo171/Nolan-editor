-- ─── Nolan AI Studio — Migration 5: Comic Engine ─────────────
-- Run this once against your Supabase instance via the SQL editor.

-- ─── Comic Templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comic_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some default templates
INSERT INTO comic_templates (name, description, layout_data) VALUES
('Classic Single Panel', 'A single large dramatic comic panel with a top and bottom caption.', 
 '{ "id": "single_panel", "panels": [{ "type": "image", "w": 100, "h": 70, "x": 0, "y": 15 }] }'::jsonb),
('Split Two-Panel', 'Two panels stacked vertically. Best for dialogue.', 
 '{ "id": "dual_panel_v", "panels": [{ "type": "image", "w": 100, "h": 45, "x": 0, "y": 0 }, { "type": "image", "w": 100, "h": 45, "x": 0, "y": 55 }] }'::jsonb);

-- ─── Comics ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    template_id UUID REFERENCES comic_templates(id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft', 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Comic Pages ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comic_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comic_id UUID REFERENCES comics(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    layout_data JSONB, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Comic Panels ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comic_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES comic_pages(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL, 
    panel_index INTEGER NOT NULL,
    image_url TEXT,
    caption_top TEXT,
    caption_bottom TEXT,
    speech_bubbles JSONB, 
    image_prompt TEXT,    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
