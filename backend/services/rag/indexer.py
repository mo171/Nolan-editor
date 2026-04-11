"""
Scene Indexer — Supabase pgvector RAG
=======================================
Embeds chunks into 384-dimensional vectors using sentence-transformers.
Inserts into Supabase `scene_embeddings` table.

Uses `all-MiniLM-L6-v2` because it's fast, local (no API cost), 
and matches the `vector(384)` schema in db.sql.
"""

import logging
from typing import Dict, Any, List

from lib.supabase import supabase
from services.rag.chunker import chunk_scene

logger = logging.getLogger("nolan.rag.indexer")

# Singleton for embedding model
_embedding_model = None

def get_embedding_model():
    """
    Lazy-loads the embedding model.
    
    Model choice rationale:
    - all-MiniLM-L6-v2 (384d): Fast but weak for creative writing
    - all-mpnet-base-v2 (768d): BETTER - stronger semantic understanding
    - instructor-large (768d): BEST - instruction-tuned for domain-specific retrieval
    
    Current: all-mpnet-base-v2 for balance of quality + speed.
    Upgrade to instructor-large if quality is paramount.
    """
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Upgraded from all-MiniLM-L6-v2 for better creative writing understanding
            model_name = "sentence-transformers/all-mpnet-base-v2"
            logger.info(f"Loading {model_name}...")
            _embedding_model = SentenceTransformer(model_name)
            logger.info("✅ Embedding model loaded")
        except ImportError:
            logger.error("sentence-transformers not installed. Run: pip install sentence-transformers torch")
            raise
    return _embedding_model

async def index_scene(scene_id: str, project_id: str, plain_text: str, nlp_result: dict):
    """
    Main entry point for the worker.
    Creates embeddings for the scene chunks and upserts to pgvector.
    
    1. Removes old embeddings for this scene.
    2. Chunks the new text.
    3. Embeds chunks.
    4. Inserts into Supabase.
    """
    if not plain_text or not plain_text.strip():
        # Clear out old embeddings if scene was cleared
        supabase.table("scene_embeddings").delete().eq("scene_id", scene_id).execute()
        return

    try:
        model = get_embedding_model()
    except Exception as e:
        logger.error(f"[Indexer] Cannot index scene {scene_id} due to model error: {e}")
        return

    # Prepare scene metadata from NLP result
    scene_metadata = {
        "characters": nlp_result.get("detected_characters", []),
        "locations": nlp_result.get("detected_locations", []),
        "sentiment_label": nlp_result.get("sentiment_label", "neutral"),
        "dominant_emotion": nlp_result.get("dominant_emotion", "neutral")
    }

    # 1. Chunk text
    chunks: List[Dict[str, Any]] = chunk_scene(
        scene_id=scene_id,
        project_id=project_id,
        plain_text=plain_text,
        scene_metadata=scene_metadata
    )

    if not chunks:
        return

    # 2. Embed chunks 
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=False)

    # 3. Format strictly for Supabase
    rows_to_insert = []
    for chunk, emb in zip(chunks, embeddings):
        rows_to_insert.append({
            "project_id": project_id,
            "scene_id": scene_id,
            "chunk_text": chunk["text"],
            "embedding": emb.tolist(),
            "metadata": chunk["metadata"]
        })

    # 4. Wipe old embeddings for this scene and insert new ones
    try:
        supabase.table("scene_embeddings").delete().eq("scene_id", scene_id).execute()
        
        if rows_to_insert:
            supabase.table("scene_embeddings").insert(rows_to_insert).execute()
            
        logger.info(f"[Indexer] Indexed scene={scene_id} with {len(rows_to_insert)} chunks")
    except Exception as e:
        logger.error(f"[Indexer] DB error indexing scene {scene_id}: {e}")
