"""
LangChain Prompt Builder
==========================
Assembles all the pieces needed for the ghost text LLM prompt:
- Narrative context (past chunks)
- DNA context (writing style)
- Project setup (premise, theme, temp)
"""

from typing import List, Dict, Any

def build_ghost_prompt_vars(
    project_setup: Dict[str, Any],
    dna_fingerprint: Dict[str, Any],
    narrative_chunks: List[Dict[str, Any]],
    dna_chunks: List[Dict[str, Any]],
    scene_emotion: str,
    cursor_text: str
) -> Dict[str, Any]:
    """
    Constructs the variables for the LangChain ChatPromptTemplate.
    """
    
    # 1. Format narrative chunks
    narrative_context = "\n".join([
        f"- {chunk['chunk_text']} (Emotion: {chunk['metadata'].get('dominant_emotion', 'neutral')})"
        for chunk in narrative_chunks
    ])
    if not narrative_context:
        narrative_context = "No previous narrative context."

    # 2. Format DNA chunks (style examples)
    style_examples = "\n".join([
        f"- \"{chunk['chunk_text']}\""
        for chunk in dna_chunks
    ])
    if not style_examples:
        style_examples = "No strict style examples. Be naturally descriptive."

    # 3. Fallbacks for missing DNA 
    dna_fingerprint = dna_fingerprint or {}
    
    return {
        "premise": project_setup.get("premise", "A story without a specific premise."),
        "themes": ", ".join(project_setup.get("themes", [])),
        "dominant_tone": dna_fingerprint.get("dominant_tone", "neutral-literary"),
        "sentence_length": dna_fingerprint.get("avg_sentence_len", "medium"),
        "dialogue_ratio": dna_fingerprint.get("dialogue_ratio", "moderate"),
        "narrative_context": narrative_context,
        "style_examples": style_examples,
        "scene_emotion": scene_emotion,
        "cursor_text": cursor_text
    }

def build_chat_prompt_vars(
    project_setup: Dict[str, Any],
    narrative_chunks: List[Dict[str, Any]],
    user_query: str
) -> Dict[str, Any]:
    """
    Variables for the chatbot RAG.
    """
    narrative_context = "\n".join([
        f"- {chunk['chunk_text']}"
        for chunk in narrative_chunks
    ])
    
    return {
        "premise": project_setup.get("premise", "No premise set."),
        "narrative_context": narrative_context or "No context.",
        "user_query": user_query
    }
