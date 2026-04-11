"""
Ghost Text Prompt Builder
==========================
Assembles structured, hierarchically-prioritized prompt variables for the LLM.

Key design decisions:
  - Style is expressed as RULES not as raw text examples
  - Narrative context is formatted as flowing prose paragraphs, most-recent first
  - All project boilerplate (genre, tone, audience, setting) is pre-compiled into
    the system prompt so the model NEVER has to infer world facts
  - Characters are formatted as an immutable roster the model cannot deviate from
"""

from typing import List, Dict, Any


def _sentence_length_label(avg: float) -> str:
    if avg <= 10:  return "very short (under 10 words each)"
    if avg <= 16:  return "short to medium (10–16 words)"
    if avg <= 22:  return "medium (16–22 words)"
    return "long, flowing sentences (22+ words)"


def _dialogue_label(ratio: float) -> str:
    if ratio < 0.05:  return "minimal — almost no dialogue, pure prose"
    if ratio < 0.20:  return "moderate — occasional dialogue breaks"
    return "dialogue-heavy — frequent exchanges"


def build_style_rules_block(dna: Dict[str, Any]) -> str:
    """
    Converts the DNA fingerprint dict into a STYLE RULES block string.
    This replaces raw style_examples entirely.
    """
    tone              = dna.get("dominant_tone", "balanced-literary")
    sent_label        = dna.get("sentence_length_label") or _sentence_length_label(dna.get("avg_sentence_len", 14))
    dialogue_label    = dna.get("dialogue_frequency_label") or _dialogue_label(dna.get("dialogue_ratio", 0.35))
    description       = dna.get("description_density", "balanced action-description")
    vocab             = dna.get("vocab_diversity_label", "moderate")

    return (
        f"- Tone: {tone}\n"
        f"- Sentence length: {sent_label}\n"
        f"- Dialogue frequency: {dialogue_label}\n"
        f"- Description style: {description}\n"
        f"- Vocabulary: {vocab}"
    )


def build_narrative_context_block(chunks: List[Dict[str, Any]]) -> str:
    """
    Formats narrative chunks as prose paragraphs separated by dividers.
    Most-recent first (retriever already sorts them this way).
    """
    if not chunks:
        return "No previous narrative context available."

    parts = []
    for chunk in chunks:
        text = chunk.get("chunk_text", "").strip()
        emotion = chunk.get("metadata", {}).get("dominant_emotion", "")
        if text:
            entry = text
            if emotion and emotion != "neutral":
                entry += f"\n[Emotional tone: {emotion}]"
            parts.append(entry)

    return "\n\n---\n\n".join(parts)


def build_characters_block(characters: List[Dict[str, Any]]) -> str:
    """
    Formats the character roster as an immutable reference list.
    """
    if not characters:
        return "No specific characters defined. Do not invent named characters."

    lines = []
    for c in characters:
        name  = c.get("name", "Unknown")
        role  = c.get("role", "supporting")
        desc  = c.get("description", "")
        traits = c.get("traits", [])

        line = f"- {name} ({role.capitalize()})"
        if desc:
            line += f": {desc}"
        if traits:
            line += f"\n  Traits: {', '.join(traits)}"
        lines.append(line)

    return "\n".join(lines)


def build_ghost_prompt_vars(
    project_setup: Dict[str, Any],
    dna_fingerprint: Dict[str, Any],
    narrative_chunks: List[Dict[str, Any]],
    dna_chunks: List[Dict[str, Any]],   # kept for future use, not injected as raw text
    characters: List[Dict[str, Any]],
    scene_emotion: str,
    cursor_text: str,
) -> Dict[str, Any]:
    """
    Constructs the variables for the LangChain ChatPromptTemplate.
    Every field maps to a placeholder in GHOST_PROMPT_TEMPLATE in chain.py.
    """
    dna = dna_fingerprint or {}
    setup = project_setup or {}

    # ── Project boilerplate ────────────────────────────────────────────────
    genre              = setup.get("genre", "Literary Fiction")
    tone               = setup.get("tone") or dna.get("dominant_tone", "balanced-literary")
    target_audience    = setup.get("target_audience", "general readers")
    setting_description = setup.get("setting_description", "Not specified")
    story_foundation   = setup.get("story_foundation") or setup.get("premise", "A story without a specific premise.")
    premise            = setup.get("premise", "Not specified")
    themes             = ", ".join(setup.get("themes", [])) or "Not specified"
    desired_ending     = setup.get("desired_ending", "Not specified")
    conflict_types     = ", ".join(setup.get("conflict_types", [])) or "Not specified"
    inciting_incident  = setup.get("inciting_incident", "Not specified")

    # ── Style rules block (replaces raw examples) ─────────────────────────
    style_rules_block = build_style_rules_block(dna)

    # ── Narrative context (prose paragraphs, most-recent first) ───────────
    narrative_context = build_narrative_context_block(narrative_chunks)

    # ── Character roster ───────────────────────────────────────────────────
    characters_context = build_characters_block(characters)

    return {
        # Boilerplate anchors
        "genre":               genre,
        "tone":                tone,
        "target_audience":     target_audience,
        "setting_description": setting_description,
        "story_foundation":    story_foundation,
        "premise":             premise,
        "themes":              themes,
        "desired_ending":      desired_ending,
        "conflict_types":      conflict_types,
        "inciting_incident":   inciting_incident,
        # Style
        "style_rules_block":   style_rules_block,
        # Context
        "narrative_context":   narrative_context,
        "characters_context":  characters_context,
        "scene_emotion":       scene_emotion or "neutral",
        "cursor_text":         cursor_text,
    }


def build_chat_prompt_vars(
    project_setup: Dict[str, Any],
    narrative_chunks: List[Dict[str, Any]],
    user_query: str,
) -> Dict[str, Any]:
    """Variables for the chatbot RAG."""
    narrative_context = build_narrative_context_block(narrative_chunks)
    return {
        "premise":          project_setup.get("premise", "No premise set."),
        "narrative_context": narrative_context or "No context.",
        "user_query":       user_query,
    }
