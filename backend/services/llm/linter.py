import os
import json
import logging
from openai import AsyncOpenAI
import traceback
from dotenv import load_dotenv

load_dotenv()

from services.nlp.entity_extractor import extract_entities
from services.graph.graph_service import get_linter_context

logger = logging.getLogger("nolan.llm.linter")

async def run_linting_pipeline(text: str, project_id: str) -> list:
    """
    Analyzes a chunk of text for spelling, inconsistency, and creative issues.
    Injects Knowledge Graph context for narrative consistency.
    Returns a list of dicts: [{ id, type, original_text, suggestion, reason }]
    """
    if not text or len(text.strip()) < 5:
        return []

    # 1. Extract participating entities
    extraction_result = extract_entities(text)
    character_names = extraction_result.scene_characters
    
    # 2. Fetch Knowledge Graph Context
    graph_context = ""
    if character_names:
        graph_context = await get_linter_context(project_id, character_names)

    client = AsyncOpenAI(
        api_key=os.environ.get("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1"
    )
    model = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")

    system_prompt = f"""You are Nolan, an elite AI editor. 
Analyze the provided text snippet and return exactly 1 JSON object with a single root key 'suggestions' which is a list of objects.

{graph_context}

## Analysis Goal
Identify and return objects with:
- "id": Unique string.
- "type": "spelling", "inconsistency", or "creative".
- "original_text": CHARACTER-PERFECT match substring.
- "suggestion": Corrected replacement.
- "reason": Brief 1-sentence explanation.

Inconsistency Rule: Use the PROJECT KNOWLEDGE GRAPH above as your ONLY source of truth for character personality, lore, and relationships. If a character acts out of character according to the traits or roles provided, flag it as 'inconsistency'.

Maximum 3 suggestions. If perfect, return an empty list.
"""

    try:
        response = await client.chat.completions.create(
            model=model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"TEXT TO LINT:\n{text}"}
            ],
            temperature=0.3,
            max_tokens=800
        )
        
        raw_output = response.choices[0].message.content
        data = json.loads(raw_output)
        return data.get("suggestions", [])

    except Exception as e:
        logger.error(f"[Linter] Error generating lint analysis: {e}\n{traceback.format_exc()}")
        return []
