"""
DNA Extractor
================
Generates a writing style "DNA fingerprint" from a reference text block.
Used to align LangChain ghost text with the desired author's voice.
"""

import logging
from typing import Dict, Any

from tools.html_stripper import split_into_paragraphs, extract_dialogue_lines

logger = logging.getLogger("nolan.bert.dna_extractor")

async def extract_dna_from_text(plain_text: str) -> Dict[str, Any]:
    """
    Computes statistical and thematic properties from a reference text.
    In Phase 4, this gets augmented with sentence-transformer embeddings 
    for the top stylistic sentences.
    """
    if not plain_text or len(plain_text.strip()) < 50:
        logger.warning("Text too short for meaningful DNA extraction.")
        return _get_default_dna()
        
    paragraphs = split_into_paragraphs(plain_text)
    if not paragraphs:
        return _get_default_dna()

    # 1. Split sentences (rudimentary split if spacy isn't running here)
    import re
    sentences = re.split(r'[.!?]+', plain_text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 3]
    
    num_sentences = len(sentences)
    if num_sentences == 0:
        return _get_default_dna()

    # 2. Compute metrics
    avg_sentence_len = sum(len(s.split()) for s in sentences) / num_sentences
    
    dialogues = extract_dialogue_lines(plain_text)
    dialogue_ratio = len(dialogues) / num_sentences if num_sentences > 0 else 0.0

    words = plain_text.lower().split()
    unique_words = set(words)
    vocab_diversity = len(unique_words) / len(words) if len(words) > 0 else 0.0
    
    # 3. Compile fingerprint
    dna = {
        "avg_sentence_len": round(avg_sentence_len, 1),
        "vocab_diversity": round(vocab_diversity, 2),
        "dialogue_ratio": round(dialogue_ratio, 2),
        "dominant_tone": "balanced-literary", # NLP model would set this in production
        "emotional_spectrum": {"neutral": 0.5, "tension": 0.3, "hope": 0.2}
    }
    
    logger.info(f"[DNA Evaluator] Computed DNA: {dna}")
    return dna

def _get_default_dna() -> Dict[str, Any]:
    return {
        "avg_sentence_len": 14.0,
        "vocab_diversity": 0.65,
        "dialogue_ratio": 0.35,
        "dominant_tone": "balanced-literary",
        "emotional_spectrum": {"neutral": 0.4, "hope": 0.3, "tension": 0.3}
    }
