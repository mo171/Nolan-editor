"""
Emotion Classifier — Phase 4 (REAL)
======================================
Uses j-hartmann/emotion-english-distilroberta-base via HuggingFace pipelines.
Classifies text into: joy, sadness, anger, fear, surprise, disgust, neutral.
Lazy-loads on first call. Falls back to neutral stub if unavailable.
"""

import logging
from typing import Dict

logger = logging.getLogger("nolan.bert.emotion")

_emotion_pipeline = None

# All 7 Ekman emotions this model returns
_EMOTION_LABELS = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"]


def _get_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline is None:
        try:
            from transformers import pipeline
            logger.info("[Emotion] Loading j-hartmann/emotion-english-distilroberta-base ...")
            _emotion_pipeline = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                top_k=None,          # return all scores
                truncation=True,
                max_length=512,
            )
            logger.info("[Emotion] ✅ Model loaded")
        except Exception as e:
            logger.warning(f"[Emotion] Model failed to load ({e}) — using stub fallback")
            _emotion_pipeline = None
    print(_emotion_pipeline)
    return _emotion_pipeline


def _stub_result() -> Dict:
    return {
        "dominant_emotion": "neutral",
        "breakdown": {k: (1.0 if k == "neutral" else 0.0) for k in _EMOTION_LABELS},
    }


def classify_emotion(text: str) -> Dict:
    """
    Returns:
        {
            dominant_emotion: str,
            breakdown: { emotion: float, ... }
        }
    """
    if not text or not text.strip():
        return _stub_result()

    pipe = _get_pipeline()
    if pipe is None:
        return _stub_result()

    try:
        # top_k=None returns list of {label, score} for every class
        raw = pipe(text[:512])[0]
        breakdown = {item["label"].lower(): round(item["score"], 4) for item in raw}

        # dominant = highest scoring emotion
        dominant = max(breakdown, key=breakdown.get)
        print(dominant)
        print(breakdown)
        return {
            "dominant_emotion": dominant,
            "breakdown": breakdown,
        }
    except Exception as e:
        logger.error(f"[Emotion] Inference failed: {e}")
        return _stub_result()
