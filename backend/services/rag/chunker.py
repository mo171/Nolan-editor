"""
Semantic Text Chunker
=======================
Splits scene plain text into semantic chunks for RAG indexing.
Strategy:
  - Split at paragraph boundaries and dialogue lines
  - Target size > 50 words to avoid fragmentation
  - Return chunks with metadata
"""

from typing import Dict, Any, List
from tools.html_stripper import split_into_paragraphs

def chunk_scene(
    scene_id: str,
    project_id: str,
    plain_text: str,
    scene_metadata: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Chunks a scene into semantically meaningful blocks.

    Args:
        scene_id: ID of the scene
        project_id: ID of the project
        plain_text: The cleaned text of the scene
        scene_metadata: Metadata like characters_present, dominant_emotion, etc.

    Returns:
        List of dictionaries with 'text' and 'metadata'.
    """
    if not plain_text or not plain_text.strip():
        return []

    words = plain_text.split()
    chunks = []
    
    CHUNK_SIZE = 400
    OVERLAP = 80
    
    i = 0
    while i < len(words):
        chunk_words = words[i:i + CHUNK_SIZE]
        current_chunk_text = " ".join(chunk_words)
        
        chunks.append({
            "text": current_chunk_text,
            "metadata": {
                "project_id": project_id,
                "scene_id": scene_id,
                "chunk_index": len(chunks),
                "is_dna_source": False, # DNA is handled separately
                **scene_metadata
            }
        })
        
        i += (CHUNK_SIZE - OVERLAP)

    return chunks
