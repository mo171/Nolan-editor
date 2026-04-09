"""
Context-Aware Retriever
=========================
Queries Supabase pgvector via RPC `search_scene_embeddings`.
Supports multi-mode search (narrative, dna, etc.)
"""

import logging
from typing import List, Dict, Any

from lib.supabase import supabase
from services.rag.indexer import get_embedding_model

logger = logging.getLogger("nolan.rag.retriever")

async def retrieve(
    query_text: str, 
    project_id: str, 
    mode: str = "narrative", 
    match_count: int = 5,
    filters: Dict[str, Any] = None
) -> List[Dict[str, Any]]:
    """
    Embeds the user query and searches the vector store.
    
    Args:
        query_text: The user's input/cursor context.
        project_id: The ID of the project.
        mode: "narrative" or "dna" or "chatbot".
        match_count: How many chunks to return.
        filters: (Optional) Any specific metadata filters.
    """
    if not query_text or not query_text.strip():
        return []

    try:
        model = get_embedding_model()
    except Exception as e:
        logger.error(f"[Retriever] Model failed to load: {e}")
        return []

    # 1. Embed query (must return list of floats)
    query_embedding = model.encode([query_text], show_progress_bar=False)[0].tolist()

    # 2. Determine RPC args based on mode
    is_dna_only = False
    
    if mode == "dna":
        is_dna_only = True
    elif mode == "narrative":
        is_dna_only = False

    # 3. Call Supabase RPC
    try:
        result = supabase.rpc("search_scene_embeddings", {
            "query_embedding": query_embedding,
            "project_filter": project_id,
            "match_count": match_count,
            "is_dna_only": is_dna_only
        }).execute()
        
        return result.data or []
    except Exception as e:
        logger.error(f"[Retriever] RPC Query failed: {e}")
        return []
