"""
LangChain Streaming Chain
===========================
Defines the Ghost Text and Chat ChatPromptTemplates.
Uses gpt-4o-mini via LangChain with streaming=True.

Ghost text prompt is structured in strict priority order:
  SYSTEM  = immutable world facts (boilerplate) + style rules + hard constraints
  HUMAN   = per-request context (narrative + cursor text)

Temperature is 0.5 (down from 0.7) for tighter, more grounded outputs.
"""

import logging
import os
from typing import Dict, Any, AsyncGenerator

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("nolan.llm.chain")

# ─── Ghost Text System Prompt ─────────────────────────────────────────────────
# Split into SYSTEM (immutable) + HUMAN (per-request) for clear model priority.

GHOST_SYSTEM_PROMPT = """\
You are the Ghost Writer module inside Nolan AI Studio — a professional creative \
writing assistant for novelists, screenwriters, and storytellers. \
You continue prose. You never chat. You never explain yourself. \
You output ONLY story text — no preamble, no labels, no markdown.

══════════════════════════════════════════════════════════════════
PROJECT BOILERPLATE  (treat every field as an immutable world fact)
══════════════════════════════════════════════════════════════════
Genre:              {genre}
Tone:               {tone}
Target Audience:    {target_audience}
Setting:            {setting_description}
Story Foundation:   {story_foundation}
Core Premise:       {premise}
Themes:             {themes}
Desired Ending:     {desired_ending}
Conflict Types:     {conflict_types}
Inciting Incident:  {inciting_incident}

══════════════════════════════════════════════════════════════════
ESTABLISHED CHARACTERS — DO NOT INVENT OTHERS
══════════════════════════════════════════════════════════════════
{characters_context}

══════════════════════════════════════════════════════════════════
STYLE RULES  (apply to every word you write — no exceptions)
══════════════════════════════════════════════════════════════════
{style_rules_block}

══════════════════════════════════════════════════════════════════
HARD CONSTRAINTS  (never violate these — they override everything)
══════════════════════════════════════════════════════════════════
1. Do NOT introduce characters not listed in ESTABLISHED CHARACTERS.
2. Do NOT change the scene's location or jump forward/backward in time.
3. Do NOT resolve major plot conflicts or reveal the desired ending.
4. Do NOT contradict anything stated in RECENT STORY CONTEXT.
5. Do NOT use purple prose. Forbidden words/phrases include: \
"abyss", "symphony", "tapestry", "fabric of", "enveloped", \
"whispered to the wind", "heart raced", "soul shattered", "universe conspired".
6. Do NOT output emojis, markdown, bullet points, or meta-commentary.
7. Do NOT repeat the writer's last sentence verbatim.
8. Output EXACTLY 1–2 sentences. Never more. Never less.

══════════════════════════════════════════════════════════════════
STRICT PRIORITY ORDER  (resolve all conflicts using this hierarchy)
══════════════════════════════════════════════════════════════════
PRIORITY 1 (HIGHEST): Continue directly from the writer's last sentence.
PRIORITY 2: Maintain the current scene location and emotional tone.
PRIORITY 3: Follow RECENT STORY CONTEXT only where directly relevant.
PRIORITY 4: Apply all STYLE RULES to every token you generate.
PRIORITY 5 (LOWEST): ESTABLISHED CHARACTERS define who exists in this universe.\
"""

GHOST_HUMAN_PROMPT = """\
CURRENT SCENE EMOTIONAL TONE: {scene_emotion}

RECENT STORY CONTEXT (most recent first — read for continuity, not style):
{narrative_context}

══════════════════════════════════════════════════════════════════
THE WRITER'S LAST WORDS — CONTINUE DIRECTLY FROM HERE:
══════════════════════════════════════════════════════════════════
{cursor_text}\
"""

# ─── Chat Prompt ─────────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """\
You are Nolan, the AI co-writer. You help authors brainstorm and check \
facts about their story. Be concise, creative, and story-focused.

Story Premise: {premise}\
"""

CHAT_HUMAN_PROMPT = """\
Relevant story context:
{narrative_context}

Author's question:
{user_query}\
"""


# ─── LLM factory ─────────────────────────────────────────────────────────────

def _get_llm(temperature: float = 0.5):
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set.")
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        streaming=True,
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "https://nolan-editor.com", 
            "X-Title": "Nolan AI Studio",
        }
    )


# ─── Ghost text stream ────────────────────────────────────────────────────────

async def stream_ghost_text(
    prompt_vars: Dict[str, Any],
    temperature: float = 0.5,
) -> AsyncGenerator[str, None]:
    """
    Streams ghost text prediction token by token.
    Lower temperature (0.5) = tighter, more grounded, less hallucinatory output.
    """
    try:
        llm = _get_llm(temperature=temperature)
        prompt = ChatPromptTemplate.from_messages([
            ("system", GHOST_SYSTEM_PROMPT),
            ("human",  GHOST_HUMAN_PROMPT),
        ])
        chain = prompt | llm | StrOutputParser()
        async for chunk in chain.astream(prompt_vars):
            yield chunk
    except Exception as e:
        logger.error(f"[Chain] Ghost text stream failed: {e}")
        yield f" [Error generating text: {e}]"


# ─── Chat stream ──────────────────────────────────────────────────────────────

async def stream_chat_response(
    prompt_vars: Dict[str, Any],
    temperature: float = 0.6,
) -> AsyncGenerator[str, None]:
    """Streams the chatbot response."""
    try:
        llm = _get_llm(temperature=temperature)
        prompt = ChatPromptTemplate.from_messages([
            ("system", CHAT_SYSTEM_PROMPT),
            ("human",  CHAT_HUMAN_PROMPT),
        ])
        chain = prompt | llm | StrOutputParser()
        async for chunk in chain.astream(prompt_vars):
            yield chunk
    except Exception as e:
        logger.error(f"[Chain] Chat stream failed: {e}")
        yield f" [Error: {e}]"
