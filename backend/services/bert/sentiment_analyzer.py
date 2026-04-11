"""
Sentiment Analyzer — Phase 4 (REAL)
=====================================
Uses cardiffnlp/twitter-roberta-base-sentiment-latest via HuggingFace pipelines.
Lazy-loads on first call so startup time is unaffected.
Falls back to stub if the model is unavailable (no internet / no disk space).
"""

import logging
from typing import Dict

logger = logging.getLogger("nolan.bert.sentiment")

_sentiment_pipeline = None


def _get_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        try:
            from transformers import pipeline

            logger.info(
                "[Sentiment] Loading cardiffnlp/twitter-roberta-base-sentiment-latest ..."
            )
            _sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                truncation=True,
                max_length=512,
            )
            logger.info("[Sentiment] ✅ Model loaded")
        except Exception as e:
            logger.warning(
                f"[Sentiment] Model failed to load ({e}) — using stub fallback"
            )
            _sentiment_pipeline = None
    return _sentiment_pipeline


# cardiffnlp returns LABEL_0/1/2 — map to human-readable
_LABEL_MAP = {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive",
}


def analyze_sentiment(text: str) -> Dict:
    """
    Returns:
        { label: str, score: float, confidence: float }
    """
    if not text or not text.strip():
        return {"label": "neutral", "score": 0.0, "confidence": 1.0}

    pipe = _get_pipeline()
    if pipe is None:
        return {"label": "neutral", "score": 0.0, "confidence": 1.0}

    try:
        result = pipe(text[:512])[0]
        label = _LABEL_MAP.get(result["label"], result["label"])
        print(label)
        return {
            "label": label,
            "score": round(result["score"], 4),
            "confidence": round(result["score"], 4),
        }
    except Exception as e:
        logger.error(f"[Sentiment] Inference failed: {e}")
        return {"label": "neutral", "score": 0.0, "confidence": 1.0}
