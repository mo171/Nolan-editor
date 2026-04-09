"""
Entity Extractor — spaCy NER + SVO + Coref
============================================
Takes plain text and extracts:
  1. Named entities (PERSON, LOC, GPE, ORG, EVENT, WORK_OF_ART)
  2. Subject-Verb-Object triples (used to populate Neo4j relationships)
  3. Scene-level character and location lists

Output is fed into:
  - scene_nlp_analysis table (Supabase)
  - graph_service.py (Neo4j)
  - rag/indexer.py (as chunk metadata)
"""

import logging
from dataclasses import dataclass, field

from services.nlp.pipeline import get_nlp

logger = logging.getLogger("nolan.nlp.extractor")

# ─── Output Types ────────────────────────────────────────────────────────────

@dataclass
class Entity:
    text: str
    label: str          # PERSON, LOC, GPE, ORG, EVENT, WORK_OF_ART, etc.
    start: int          # char offset in plain text
    end: int
    coref_resolved_to: str | None = None   # set later by coref pass


@dataclass
class SVOTriple:
    subject: str
    verb: str
    obj: str
    sentence: str       # source sentence (for context in Neo4j)


@dataclass
class ExtractionResult:
    entities: list[Entity] = field(default_factory=list)
    svo_triples: list[SVOTriple] = field(default_factory=list)
    scene_characters: list[str] = field(default_factory=list)
    scene_locations: list[str] = field(default_factory=list)
    sentence_count: int = 0


# ─── Labels we care about ────────────────────────────────────────────────────

PERSON_LABELS = {"PERSON"}
LOCATION_LABELS = {"GPE", "LOC", "FAC"}       # GPE=geo-political, LOC=location, FAC=facility
ALL_ENTITY_LABELS = PERSON_LABELS | LOCATION_LABELS | {"ORG", "EVENT", "WORK_OF_ART", "NORP"}


# ─── Core extraction ─────────────────────────────────────────────────────────

def extract_entities(plain_text: str) -> ExtractionResult:
    """
    Run spaCy NER + dependency parsing on plain text.

    Args:
        plain_text: Clean text (output of html_stripper.strip_html)

    Returns:
        ExtractionResult with entities, SVO triples, characters, locations
    """
    if not plain_text or not plain_text.strip():
        return ExtractionResult()

    nlp = get_nlp()
    doc = nlp(plain_text)

    result = ExtractionResult(sentence_count=len(list(doc.sents)))

    # ── Named Entities ────────────────────────────────────────────────────────
    seen_entities: set[str] = set()

    for ent in doc.ents:
        if ent.label_ not in ALL_ENTITY_LABELS:
            continue

        key = (ent.text.strip().lower(), ent.label_)
        if key in seen_entities:
            continue
        seen_entities.add(key)

        entity = Entity(
            text=ent.text.strip(),
            label=ent.label_,
            start=ent.start_char,
            end=ent.end_char,
        )
        result.entities.append(entity)

        # Bucket into character/location lists
        if ent.label_ in PERSON_LABELS:
            name = ent.text.strip()
            if name not in result.scene_characters:
                result.scene_characters.append(name)

        if ent.label_ in LOCATION_LABELS:
            loc = ent.text.strip()
            if loc not in result.scene_locations:
                result.scene_locations.append(loc)

    # ── SVO Triples (Subject-Verb-Object) ────────────────────────────────────
    for sent in doc.sents:
        svo = _extract_svo(sent)
        if svo:
            result.svo_triples.append(svo)

    logger.debug(
        f"Extracted: {len(result.entities)} entities, "
        f"{len(result.svo_triples)} SVOs, "
        f"{len(result.scene_characters)} characters, "
        f"{len(result.scene_locations)} locations"
    )

    return result


def _extract_svo(sent) -> SVOTriple | None:
    """
    Extract Subject-Verb-Object from a dependency-parsed sentence.
    Returns None if no clear SVO pattern is found.
    """
    subject = None
    verb = None
    obj = None

    for token in sent:
        # Subject: nominal subject or passive nominal subject
        if token.dep_ in ("nsubj", "nsubjpass") and subject is None:
            subject = _get_span_text(token)

        # Root verb (main predicate)
        if token.dep_ == "ROOT" and token.pos_ == "VERB":
            verb = token.lemma_

        # Direct object or attribute
        if token.dep_ in ("dobj", "attr", "pobj") and obj is None:
            obj = _get_span_text(token)

    if subject and verb:
        return SVOTriple(
            subject=subject,
            verb=verb,
            obj=obj or "",
            sentence=sent.text.strip(),
        )
    return None


def _get_span_text(token) -> str:
    """Get token text including compound modifiers (e.g. 'the fierce lion' → 'lion')."""
    # Collect compound children
    parts = [token.text]
    for child in token.children:
        if child.dep_ in ("compound", "amod") and child.i < token.i:
            parts.insert(0, child.text)
    return " ".join(parts)


# ─── Serialization helpers (for storing in Supabase JSONB) ──────────────────

def result_to_dict(result: ExtractionResult) -> dict:
    return {
        "entities": [
            {
                "text": e.text,
                "label": e.label,
                "start": e.start,
                "end": e.end,
                "coref_resolved_to": e.coref_resolved_to,
            }
            for e in result.entities
        ],
        "svo_triples": [
            {"subject": s.subject, "verb": s.verb, "obj": s.obj, "sentence": s.sentence}
            for s in result.svo_triples
        ],
        "scene_characters": result.scene_characters,
        "scene_locations": result.scene_locations,
        "sentence_count": result.sentence_count,
    }
