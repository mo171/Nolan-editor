"""
HTML Stripper — Tiptap HTML → Clean Plain Text
================================================
Preserves:
  - Sentence and paragraph boundaries (critical for spaCy)
  - Dialogue quotes (critical for DNA ratio calculation)
  - Word count accuracy

Removes:
  - All HTML tags
  - data-* attributes (Tiptap critique markers etc.)
  - Redundant whitespace
"""

import re
from bs4 import BeautifulSoup


def strip_html(html: str) -> str:
    """
    Convert Tiptap HTML to clean plain text suitable for NLP processing.

    Args:
        html: Raw HTML string from Tiptap editor

    Returns:
        Clean plain text with proper sentence spacing
    """
    if not html or not html.strip():
        return ""

    soup = BeautifulSoup(html, "lxml")

    # Insert newlines for block-level elements before stripping tags
    # This preserves paragraph/sentence boundaries for spaCy
    for tag in soup.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6", "br", "li"]):
        tag.insert_after("\n")

    # Get text
    text = soup.get_text(separator=" ")

    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)      # max 2 consecutive newlines
    text = re.sub(r"[ \t]+", " ", text)          # collapse horizontal whitespace
    text = re.sub(r" \n", "\n", text)            # remove space before newline
    text = re.sub(r"\n ", "\n", text)            # remove space after newline

    return text.strip()


def count_words(html: str) -> int:
    """Count words from HTML content."""
    plain = strip_html(html)
    if not plain:
        return 0
    return len(plain.split())


def extract_dialogue_lines(plain_text: str) -> list[str]:
    """
    Extract quoted dialogue lines from plain text.
    Used by DNA extractor to compute dialogue ratio.
    """
    # Match text in double or single quotes
    pattern = r'["\u201c\u201d](.*?)["\u201d\u2019]'
    matches = re.findall(pattern, plain_text, re.DOTALL)
    return [m.strip() for m in matches if m.strip()]


def split_into_paragraphs(plain_text: str) -> list[str]:
    """
    Split plain text into non-empty paragraphs.
    Useful for chunking and analysis.
    """
    paragraphs = [p.strip() for p in plain_text.split("\n\n")]
    return [p for p in paragraphs if p]
