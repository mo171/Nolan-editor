"""
DNA Extractor
================
Generates a writing style "DNA fingerprint" from a reference text block.
Now uses the real BERT sentiment + emotion classifiers to determine tone.
Used to align LangChain ghost text with the desired author's voice.
"""

import logging
import re
from typing import Dict, Any

from tools.html_stripper import split_into_paragraphs, extract_dialogue_lines
from services.bert.sentiment_analyzer import analyze_sentiment
from services.bert.emotion_classifier import classify_emotion

logger = logging.getLogger("nolan.bert.dna_extractor")


def _sentence_length_label(avg: float) -> str:
    if avg <= 10:   return "very short"
    if avg <= 16:   return "short-medium"
    if avg <= 22:   return "medium"
    return "long, flowing"


def _dialogue_frequency_label(ratio: float) -> str:
    if ratio < 0.05:  return "minimal"
    if ratio < 0.20:  return "moderate"
    return "dialogue-heavy"


def _description_density_label(avg_sentence_len: float, dialogue_ratio: float) -> str:
    """Infer description density from sentence length + low dialogue ratio."""
    if dialogue_ratio < 0.10 and avg_sentence_len > 14:
        return "sensory-heavy"
    if dialogue_ratio < 0.20:
        return "descriptive"
    return "balanced action-description"


def _vocab_diversity_label(diversity: float) -> str:
    if diversity < 0.4:  return "repetitive, hypnotic"
    if diversity < 0.6:  return "moderate"
    return "rich, varied"


async def extract_dna_from_text(plain_text: str) -> Dict[str, Any]:
    """
    Computes statistical and BERT-derived properties from a reference text.
    Returns a fingerprint dict consumed by prompt_builder.py.
    """
    if not plain_text or len(plain_text.strip()) < 50:
        logger.warning("Text too short for meaningful DNA extraction.")
        return _get_default_dna()

    paragraphs = split_into_paragraphs(plain_text)
    print(paragraphs)
    if not paragraphs:
        return _get_default_dna()

    # ── 1. Sentence-level stats ───────────────────────────────────────────────
    sentences = re.split(r'[.!?]+', plain_text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 3]
    num_sentences = len(sentences)

    if num_sentences == 0:
        return _get_default_dna()

    avg_sentence_len = sum(len(s.split()) for s in sentences) / num_sentences

    dialogues = extract_dialogue_lines(plain_text)
    dialogue_ratio = len(dialogues) / num_sentences

    words = plain_text.lower().split()
    unique_words = set(words)
    vocab_diversity = len(unique_words) / len(words) if words else 0.0

    # ── 2. BERT: sample representative paragraphs for tone/emotion ───────────
    # Use the first 3 substantive paragraphs to avoid excessive inference time
    sample_paras = [p for p in paragraphs if len(p.split()) >= 10][:3]
    sample_text = " ".join(sample_paras)[:1000]  # cap tokens

    sentiment_result = analyze_sentiment(sample_text)
    emotion_result   = classify_emotion(sample_text)

    dominant_emotion = emotion_result.get("dominant_emotion", "neutral")
    sentiment_label  = sentiment_result.get("label", "neutral")

    # Compose a human-readable tone string for the system prompt
    tone_parts = []
    if sentiment_label == "negative":
        tone_parts.append("dark")
    elif sentiment_label == "positive":
        tone_parts.append("uplifting")

    if dominant_emotion not in ("neutral",):
        tone_parts.append(dominant_emotion)

    avg_len = avg_sentence_len
    if avg_len < 12:
        tone_parts.append("terse")
    elif avg_len > 20:
        tone_parts.append("lyrical")

    dominant_tone = ", ".join(tone_parts) if tone_parts else "balanced-literary"

    # ── 3. Assemble fingerprint ───────────────────────────────────────────────
    dna = {
        "avg_sentence_len":        round(avg_sentence_len, 1),
        "vocab_diversity":          round(vocab_diversity, 2),
        "dialogue_ratio":           round(dialogue_ratio, 2),
        "dominant_tone":            dominant_tone,
        "sentence_length_label":    _sentence_length_label(avg_sentence_len),
        "dialogue_frequency_label": _dialogue_frequency_label(dialogue_ratio),
        "description_density":      _description_density_label(avg_sentence_len, dialogue_ratio),
        "vocab_diversity_label":    _vocab_diversity_label(vocab_diversity),
        "emotional_spectrum":       emotion_result.get("breakdown", {}),
        "sentiment_label":          sentiment_label,
    }
    print(dna)
    logger.info(f"[DNA] Fingerprint: tone='{dominant_tone}' sentence_len={avg_sentence_len:.1f} dialogue={dialogue_ratio:.2f}")
    return dna


def _get_default_dna() -> Dict[str, Any]:
    return {
        "avg_sentence_len":        14.0,
        "vocab_diversity":          0.65,
        "dialogue_ratio":           0.35,
        "dominant_tone":            "balanced-literary",
        "sentence_length_label":    "medium",
        "dialogue_frequency_label": "moderate",
        "description_density":      "balanced action-description",
        "vocab_diversity_label":    "moderate",
        "emotional_spectrum":       {"neutral": 0.4, "hope": 0.3, "tension": 0.3},
        "sentiment_label":          "neutral",
    }
