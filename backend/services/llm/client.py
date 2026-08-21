"""
Shared OpenAI client factory
============================
Single place where the app decides *who* it talks to for LLM calls.

The project previously fanned every text call out through OpenRouter, with the
key, base_url and referer headers copy-pasted into six modules. That made the
provider impossible to change in one move and let the modules drift apart.
Everything now goes straight to api.openai.com using OPENAI_API_KEY.

Image generation was already direct-to-OpenAI (GPT Image / DALL-E never worked
through OpenRouter), so this brings text calls onto the same credential.
"""

import os
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("nolan.llm.client")

DEFAULT_MODEL = "gpt-4o-mini"

_client: AsyncOpenAI | None = None


def resolve_model(default: str = DEFAULT_MODEL) -> str:
    """
    Return the chat model id in OpenAI's native namespace.

    LLM_MODEL has historically held an OpenRouter-style id ("openai/gpt-4o-mini").
    api.openai.com rejects that vendor prefix with a 404 model_not_found, so it is
    stripped here rather than requiring every existing .env to be hand-edited.
    Both "openai/gpt-4o-mini" and "gpt-4o-mini" resolve to the same model.
    """
    model = (os.getenv("LLM_MODEL") or default).strip().strip('"').strip("'")
    if model.startswith("openai/"):
        model = model[len("openai/"):]
    return model or default


def get_api_key() -> str:
    """OPENAI_API_KEY or a loud, actionable failure."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY is not set. Add it to backend/.env — LLM calls now go "
            "directly to api.openai.com instead of OpenRouter."
        )
    return api_key


def get_async_openai() -> AsyncOpenAI:
    """
    Process-wide AsyncOpenAI client pointed at api.openai.com.

    Cached because AsyncOpenAI holds an httpx connection pool; building one per
    call leaks sockets under the editor's request rate.
    """
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_api_key())
        logger.info(f"OpenAI client initialized | model={resolve_model()}")
    return _client
