-- Migration: Visual Graph Positions Table
-- Description: Stores UI coordinates (x, y) for Knowledge Graph nodes to persist user layouts.

-- Helper function for updated_at (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS visual_graph_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL, -- This matches the ID of the node in Neo4j (Character name or Scene UUID)
    x FLOAT NOT NULL DEFAULT 0,
    y FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(project_id, node_id)
);

-- Index for fast lookup per project
CREATE INDEX IF NOT EXISTS idx_visual_graph_project ON visual_graph_positions(project_id);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_graph_positions_updated_at ON visual_graph_positions;
CREATE TRIGGER set_graph_positions_updated_at
BEFORE UPDATE ON visual_graph_positions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
