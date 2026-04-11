"""
Context-Aware Retriever
=========================
Queries Supabase pgvector via RPC `search_scene_embeddings`.
Supports multi-mode search (narrative, dna).

Changes (Phase 4+):
  - Similarity threshold gating: narrative ≥ 0.35, DNA ≥ 0.50
  - Recency boost: for narrative chunks, higher chunk_index floats up
    (= most recently written text is prioritized)
  - Zero-result fast path: returns [] immediately if query is empty
"""

import logging
from typing import List, Dict, Any, Optional

from lib.supabase import supabase
from services.rag.indexer import get_embedding_model

logger = logging.getLogger("nolan.rag.retriever")

# ── Similarity thresholds ───────────────────────────────────────────────────
# Tuned conservatively: narrative needs broad tolerance, DNA must be close
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


async def retrieve(
    query_text: str,
    project_id: str,
    mode: str = "narrative",
    match_count: int = 5,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Embeds the user query and searches the vector store.

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

    # 5. Recency boost for narrative (blend similarity + recency)
    if mode == "narrative":
        chunks.sort(
            key=lambda c: c.get("similarity", 0.0) * 0.85 + _recency_score(c) * 0.15,
            reverse=True,
        )
    # DNA: pure similarity order is fine (no recency concept for style)

    return chunks[:match_count]
