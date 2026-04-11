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
    
    Strategy (upgraded for creative writing):
    - Split at natural boundaries (paragraphs, dialogue breaks)
    - Target 300-500 words per chunk (sweet spot for narrative coherence)
    - Preserve complete sentences (never split mid-sentence)
    - Overlap by 2-3 sentences for context continuity

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

    # Split into sentences (preserves natural boundaries)
    import re
    sentences = re.split(r'(?<=[.!?])\s+', plain_text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return []
    
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    TARGET_MIN = 250  # Minimum words per chunk
    TARGET_MAX = 500  # Maximum words per chunk
    OVERLAP_SENTENCES = 3  # Number of sentences to overlap
    
    for sentence in sentences:
        sentence_words = len(sentence.split())
        
        # Add sentence to current chunk
        current_chunk.append(sentence)
        current_word_count += sentence_words
        
        # If we've hit a good chunk size, save it
        if current_word_count >= TARGET_MIN:
            chunk_text = " ".join(current_chunk)
            
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    "project_id": project_id,
                    "scene_id": scene_id,
                    "chunk_index": len(chunks),
                    "word_count": current_word_count,
                    "is_dna_source": False,
                    **scene_metadata
                }
            })
            
            # Keep last N sentences for overlap (context continuity)
            if len(current_chunk) > OVERLAP_SENTENCES:
                overlap_sentences = current_chunk[-OVERLAP_SENTENCES:]
                overlap_word_count = sum(len(s.split()) for s in overlap_sentences)
                current_chunk = overlap_sentences
                current_word_count = overlap_word_count
            else:
                current_chunk = []
                current_word_count = 0
    
    # Add remaining sentences as final chunk if substantial
    if current_chunk and current_word_count >= 50:
        chunk_text = " ".join(current_chunk)
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "project_id": project_id,
                "scene_id": scene_id,
                "chunk_index": len(chunks),
                "word_count": current_word_count,
                "is_dna_source": False,
                **scene_metadata
            }
        })
    
    return chunks
