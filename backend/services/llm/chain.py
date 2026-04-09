"""
LangChain Streaming Chain
===========================
Defines the ChatPromptTemplate and streaming logic for Ghost Text.
Uses gpt-4o-mini via LangChain.
"""

import logging
import os
from typing import Dict, Any, AsyncGenerator

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

logger = logging.getLogger("nolan.llm.chain")

# ─── Prompts ──────────────────────────────────────────────────────────────────

GHOST_PROMPT_TEMPLATE = """You are a creative writing assistant for a novelist.
Your task is to provide exactly 1-2 sentences of highly creative "ghost text" to continue the scene.

STORY GUARDRAILS
Premise: {premise}
Themes: {themes}

WRITING STYLE DNA
Target Style: {dominant_tone}
Average Sentence Length: {sentence_length}
Dialogue frequency: {dialogue_ratio}
Examples of author's voice:
{style_examples}

WHAT HAPPENED BEFORE (Narrative Context)
{narrative_context}

CURRENT SCENE STATE
The dominant emotional tone right now is: {scene_emotion}

INSTRUCTIONS:
1. Continue the story seamlessly from the user's cursor.
2. DO NOT repeat what the user just wrote.
3. Write EXACTLY 1-2 sentences. No more.
4. Match the provided writing style examples precisely.
5. Do NOT use emojis, markdown, or chatty conversational text. Output pure prose.

User's last text:
"{cursor_text}"
"""

CHAT_PROMPT_TEMPLATE = """You are Nolan, the AI co-writer.
You are helping the author brainstorm and check facts about their story.

Story Premise: {premise}

Relevant Context from the Story:
{narrative_context}

Author's Question:
{user_query}
"""

def _get_llm(temperature: float = 0.7):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set.")
        
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=temperature,
        streaming=True,
        api_key=api_key
    )

async def stream_ghost_text(
    prompt_vars: Dict[str, Any], 
    temperature: float = 0.7
) -> AsyncGenerator[str, None]:
    """
    Streams the ghost text prediction.
    """
    try:
        llm = _get_llm(temperature=temperature)
        prompt = ChatPromptTemplate.from_messages([
            ("system", GHOST_PROMPT_TEMPLATE),
        ])
        chain = prompt | llm | StrOutputParser()

        async for chunk in chain.astream(prompt_vars):
            yield chunk
    except Exception as e:
        logger.error(f"[Chain] Ghost text stream failed: {e}")
        yield f" [Error generating text: {e}]"

async def stream_chat_response(
    prompt_vars: Dict[str, Any], 
    temperature: float = 0.7
) -> AsyncGenerator[str, None]:
    """
    Streams the chatbot response.
    """
    try:
        llm = _get_llm(temperature=temperature)
        prompt = ChatPromptTemplate.from_messages([
            ("system", CHAT_PROMPT_TEMPLATE),
        ])
        chain = prompt | llm | StrOutputParser()

        async for chunk in chain.astream(prompt_vars):
            yield chunk
    except Exception as e:
        logger.error(f"[Chain] Chat stream failed: {e}")
        yield f" [Error: {e}]"
