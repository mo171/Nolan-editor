"""
PDF Extractor
===============
Extracts clean text from uploaded reference stories (PDF format).
Used as input for the DNA fingerprinting pipeline.
"""

import logging
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

logger = logging.getLogger("nolan.tools.pdf_extractor")

def extract_text_from_pdf(file_path: str) -> str:
    """
    Attempts to extract text using pdfplumber (higher quality),
    falls back to PyPDF2 if not installed or fails.
    """
    text_content = []

    if pdfplumber:
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
            logger.info("✅ Extracted PDF text using pdfplumber")
            return "\n".join(text_content)
        except Exception as e:
            logger.warning(f"pdfplumber failed: {e}. Falling back to PyPDF2.")

    if PdfReader:
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
            logger.info("✅ Extracted PDF text using PyPDF2")
            return "\n".join(text_content)
        except Exception as e:
            logger.error(f"PyPDF2 failed: {e}")

    raise RuntimeError("Failed to extract PDF text. Check installed libraries and file validity.")
