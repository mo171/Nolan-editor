"""
LangChain Document Loaders
=============================
Wraps LangChain's document loaders for ingesting URLs, txt, or word docs
when setting up the project's DNA reference material.
"""

import logging
from typing import List

try:
    from langchain_community.document_loaders import WebBaseLoader, TextLoader
except ImportError:
    WebBaseLoader = None
    TextLoader = None

logger = logging.getLogger("nolan.tools.langchain_loader")

def load_plain_text(file_path: str) -> str:
    if not TextLoader:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
            
    try:
        loader = TextLoader(file_path, encoding="utf-8")
        docs = loader.load()
        return "\n\n".join([d.page_content for d in docs])
    except Exception as e:
        logger.error(f"Text loader failed: {e}")
        return ""

def load_from_url(url: str) -> str:
    if not WebBaseLoader:
        logger.error("WebBaseLoader not installed")
        return ""

    try:
        loader = WebBaseLoader(url)
        docs = loader.load()
        return "\n\n".join([d.page_content for d in docs])
    except Exception as e:
        logger.error(f"WebBaseLoader failed for url={url}: {e}")
        return ""
