"""
Context-Aware Retriever
=========================
Queries Supabase pgvector via RPC `search_scene_embeddings`.
Supports multi-mode search (narrative, dna) with hybrid retrieval.

Retrieval Strategy (Phase 5 upgrade):
  - Vector similarity (semantic understanding)
  - Keyword boosting (exact phrase matches)
  - Recency boost (recent text prioritized)
  - Similarity threshold gating
  
Changes:
  - Similarity threshold gating: narrative ≥ 0.20, DNA ≥ 0.25
  - Recency boost: for narrative chunks, higher chunk_index floats up
  - Keyword boost: exact matches in query get +0.15 similarity bonus
"""

import logging
from typing import List, Dict, Any, Optional

from lib.supabase import supabase
from services.rag.indexer import get_embedding_model

logger = logging.getLogger("nolan.rag.retriever")

# ── Similarity thresholds ───────────────────────────────────────────────────
_THRESHOLDS = {
    "narrative": 0.20,
    "dna":       0.25,
    "chatbot":   0.20,
}


def _recency_score(chunk: Dict) -> float:
    """
    Higher chunk_index = later in the scene = more recent = higher score.
    Blends with similarity so recent+relevant wins over old+relevant.
    """
    idx = chunk.get("metadata", {}).get("chunk_index", 0) or 0
    # Normalize: assume max 20 chunks per scene, weight recency at 15%
    return idx / 20.0


def _keyword_boost(chunk: Dict, query_text: str) -> float:
    """
    Boost chunks that contain exact phrases from the query.
    This helps catch specific character names, locations, or plot points
    that pure semantic similarity might miss.
    """
    chunk_text = chunk.get("chunk_text", "").lower()
    query_lower = query_text.lower()
    
    # Extract meaningful words (3+ chars, not common stopwords)
    stopwords = {"the", "and", "but", "for", "with", "from", "this", "that", "was", "were"}
    query_words = [w for w in query_lower.split() if len(w) >= 3 and w not in stopwords]
    
    if not query_words:
        return 0.0
    
    # Count exact matches
    matches = sum(1 for word in query_words if word in chunk_text)
    match_ratio = matches / len(query_words)
    
    # Boost up to +0.15 for perfect keyword match
    return match_ratio * 0.15


async def retrieve(
    query_text: str,
    project_id: str,
    mode: str = "narrative",
    match_count: int = 5,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Embeds the user query and searches the vector store with hybrid scoring.

    Args:
        query_text:  The user's input/cursor context.
        project_id:  The ID of the project.
        mode:        "narrative" | "dna" | "chatbot"
        match_count: How many chunks to return after filtering.
        filters:     (Optional) unused for now — reserved for future scene-level filters.

    Returns:
        List of chunk dicts, sorted most-relevant/most-recent first.
    """
    if not query_text or not query_text.strip():
        return []

    try:
        model = get_embedding_model()
    except Exception as e:
        logger.error(f"[Retriever] Embedding model failed: {e}")
        return []

    # 1. Embed query
    query_embedding = model.encode([query_text], show_progress_bar=False)[0].tolist()

    # 2. Determine RPC mode flag
    is_dna_only = (mode == "dna")

    # 3. Fetch from Supabase — request more than needed so we have room to filter
    fetch_count = min(match_count * 3, 20)

    try:
        result = supabase.rpc("search_scene_embeddings", {
            "query_embedding": query_embedding,
            "project_filter":  project_id,
            "match_count":     fetch_count,
            "is_dna_only":     is_dna_only,
        }).execute()
    except Exception as e:
        logger.error(f"[Retriever] RPC failed: {e}")
        return []

    chunks = result.data or []

    # 4. Gating: drop chunks below similarity threshold
    threshold = _THRESHOLDS.get(mode, 0.30)
    chunks = [c for c in chunks if c.get("similarity", 0.0) >= threshold]

    if not chunks:
        logger.info(f"[Retriever] All chunks below threshold {threshold} for mode={mode}. Returning empty.")
        return []

    # 5. Hybrid scoring: semantic + recency + keyword boost
    for chunk in chunks:
        base_similarity = chunk.get("similarity", 0.0)
        
        if mode == "narrative":
            # Narrative mode: blend all three signals
            recency = _recency_score(chunk)
            keyword = _keyword_boost(chunk, query_text)
            
            # Weighted combination: 70% semantic, 15% recency, 15% keyword
            hybrid_score = (base_similarity * 0.70) + (recency * 0.15) + keyword
            chunk["hybrid_score"] = hybrid_score
        else:
            # DNA mode: pure similarity (no recency concept for style)
            chunk["hybrid_score"] = base_similarity
    
    # Sort by hybrid score
    chunks.sort(key=lambda c: c.get("hybrid_score", 0.0), reverse=True)

    return chunks[:match_count]
