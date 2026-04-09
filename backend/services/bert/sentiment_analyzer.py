"""
Sentiment Analyzer Stub (Phase 4)
=================================
In a full production environment, this uses `cardiffnlp/twitter-roberta-base-sentiment-latest`.
For now, returns a stubbed result so the pipeline doesn't break.
"""

import logging

logger = logging.getLogger("nolan.bert.sentiment")

def analyze_sentiment(text: str) -> dict:
    # Stub behavior for Phase 1-3
    return {
        "score": 0.0,
        "label": "neutral",
        "confidence": 1.0
    }
