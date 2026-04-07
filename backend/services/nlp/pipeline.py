"""
spaCy Model Pipeline — Singleton Loader
=========================================
Loads the spaCy model ONCE at startup and reuses it across all requests.
This is critical for low latency — loading spaCy per-request would be ~2-5s.

Model selection:
  Dev:  en_core_web_lg  (faster, ~560MB, excellent NER)
  Prod: en_core_web_trf (slower, ~440MB transformer, highest accuracy)

After switching models run:
  python -m spacy download en_core_web_lg
"""

import logging
import os
import spacy
from spacy.language import Language

logger = logging.getLogger("nolan.nlp.pipeline")

# ─── Globals ─────────────────────────────────────────────────────────────────

_nlp: Language | None = None
_MODEL_NAME = os.getenv("SPACY_MODEL", "en_core_web_lg")


def get_nlp() -> Language:
    """
    Returns the loaded spaCy model singleton.
    Raises RuntimeError if load_spacy() was not called at startup.
    """
    if _nlp is None:
        raise RuntimeError(
            "spaCy model not loaded. Call load_spacy() in the FastAPI lifespan."
        )
    return _nlp


def load_spacy() -> Language:
    """
    Load the spaCy model and cache it as a module-level singleton.
    Call this once in app.py lifespan startup.
    Returns the loaded model.
    """
    global _nlp

    if _nlp is not None:
        return _nlp  # already loaded

    logger.info(f"Loading spaCy model '{_MODEL_NAME}'...")

    try:
        nlp = spacy.load(_MODEL_NAME)
    except OSError:
        logger.error(
            f"spaCy model '{_MODEL_NAME}' not found.\n"
            f"Run:  python -m spacy download {_MODEL_NAME}"
        )
        raise

    # ── Add custom components here (future: coref, custom entity ruler) ───────
    # nlp.add_pipe("experimental_coref")   # Phase 2.5: coreference resolution

    _nlp = nlp
    logger.info(
        f"✅ spaCy '{_MODEL_NAME}' loaded "
        f"| pipes: {nlp.pipe_names}"
    )
    return _nlp
