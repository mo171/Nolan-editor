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

    paragraphs = split_into_paragraphs(plain_text)
    chunks = []
    
    current_chunk_text = ""

    for i, para in enumerate(paragraphs):
        para = para.strip()
        if not para:
            continue
            
        if not current_chunk_text:
            current_chunk_text = para
        else:
            # Simple heuristic: if chunk is getting too big (> 1000 chars), split it.
            # Otherwise, append paragraph to current chunk.
            if len(current_chunk_text) + len(para) > 1000:
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
                current_chunk_text = para
            else:
                current_chunk_text += "\n\n" + para

    # Grab the last chunk
    if current_chunk_text:
        chunks.append({
            "text": current_chunk_text,
            "metadata": {
                "project_id": project_id,
                "scene_id": scene_id,
                "chunk_index": len(chunks),
                "is_dna_source": False,
                **scene_metadata
            }
        })

    return chunks
