"""
Web Scraper
===========
Extracts clean text from a URL for DNA fingerprinting.
"""

import logging

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    requests = None
    BeautifulSoup = None

logger = logging.getLogger("nolan.tools.web_scraper")

def scrape_url_text(url: str) -> str:
    """Scrapes raw text from a webpage using BeautifulSoup."""
    if not requests or not BeautifulSoup:
        logger.error("BeautifulSoup4 or requests not installed.")
        return ""
        
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        text = soup.get_text(separator='\n')
        # Cleanup blank lines
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Failed to scrape URL {url}: {e}")
        return ""
