"""
Emotion Classifier Stub (Phase 4)
=================================
In a full production environment, this uses `j-hartmann/emotion-english-distilroberta-base`.
For now, returns a stubbed result.
"""

import logging

logger = logging.getLogger("nolan.bert.emotion")

def classify_emotion(text: str) -> dict:
    return {
        "dominant_emotion": "neutral",
        "breakdown": {
            "neutral": 1.0,
            "joy": 0.0,
            "sadness": 0.0,
            "fear": 0.0,
            "anger": 0.0,
            "surprise": 0.0,
            "disgust": 0.0
        }
    }
