"""
Character Arc Consistency Detector Stub (Phase 4)
===================================================
Detects if character behavior randomly shifts without preceding events.
"""

import logging

logger = logging.getLogger("nolan.bert.arc_detector")

from transformers import pipeline
from typing import Optional, List

logger = logging.getLogger("nolan.bert.arc_detector")

# Fallback volatility map for emotional jumps
VOLATILITY_MAP = {
    "joy": ["sadness", "anger", "fear", "disgust"],
    "sadness": ["joy"],
    "anger": ["joy"],
    "fear": ["joy"],
    "disgust": ["joy"],
}

class PersonaDetector:
    _instance = None

    def __init__(self):
        # Lazy-loadedZero-shot model for persona consistency checks
        # DistilBART is ~600MB and much faster than the large version
        self.classifier = None
        self.model_name = "valhalla/distilbart-mnli-12-3"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _ensure_model(self):
        if self.classifier is None:
            logger.info(f"[Arc] Loading zero-shot classifier: {self.model_name}")
            self.classifier = pipeline("zero-shot-classification", model=self.model_name)

    def detect_arc_change(
        self, 
        char_name: str, 
        current_text: str,
        current_emotion: str, 
        last_known_emotion: Optional[str] = None, 
        traits: Optional[List[str]] = None,
        word_count: int = 0
    ) -> dict:
        """
        Deep behavioral & persona consistency detection.
        Combines emotional volatility (labels) + persona violation (BERT).
        """
        # ── Signal 1: Emotional Volatility (Heuristic) ───────────────────────
        volatility_warning = None
        if last_known_emotion and last_known_emotion != "neutral" and current_emotion != "neutral":
            opposites = VOLATILITY_MAP.get(last_known_emotion.lower(), [])
            if current_emotion.lower() in opposites:
                volatility_warning = f"Sudden mood shift from {last_known_emotion} to {current_emotion}."

        # ── Signal 2: Persona Consistency (BERT) ──────────────────────────────
        persona_warning = None
        if traits and len(current_text) > 10:
            try:
                self._ensure_model()
                # Create hypotheses: "This text is consistent with a {trait} persona."
                # and "This text is out of character for a {trait} persona."
                # But a cleaner way: check if text matches opposite behaviors
                candidate_labels = ["consistent behavior", "out of character behavior", "trait violation"]
                
                # We can also check specific trait contradictions if we know the opposites
                # For now, let's check high-level behavioral alignment
                traits_str = ", ".join(traits)
                prompt = f"The character {char_name} is defined as: {traits_str}. In this scene, their behavior is:"
                
                res = self.classifier(current_text, candidate_labels=candidate_labels, hypothesis_template=prompt)
                
                top_label = res['labels'][0]
                top_score = res['scores'][0]

                if top_label in ["out of character behavior", "trait violation"] and top_score > 0.7:
                    persona_warning = f"Behavior appears inconsistent with {char_name}'s traits ({traits_str})."
            except Exception as e:
                logger.error(f"[Arc] BERT consistency check failed: {e}")

        # ── Final Verdict ──────────────────────────────────────────────────
        if persona_warning or volatility_warning:
            severity = "HIGH" if word_count < 100 else "MEDIUM"
            detail = persona_warning or volatility_warning
            
            return {
                "arc_change_detected": True,
                "character": char_name,
                "severity": severity,
                "change_detail": detail,
                "suggestion": f"Verify if {char_name}'s behavior in this scene aligns with their established arc."
            }

        return {"arc_change_detected": False}

# Helper for the orchestrator
def detect_arc_change(*args, **kwargs):
    return PersonaDetector.get_instance().detect_arc_change(*args, **kwargs)

