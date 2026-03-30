"""
Firecrawl + Claude service for auto-generating KB entries from a dental office website.

Flow:
  1. Firecrawl scrapes the website → returns clean markdown
  2. Claude reads the markdown → extracts structured KB entries
  3. Each entry is embedded and saved to Supabase
"""

import json
from firecrawl import FirecrawlApp
from anthropic import Anthropic

from app.core.config import settings

_firecrawl: FirecrawlApp | None = None
_anthropic: Anthropic | None = None

EXTRACTION_PROMPT = """You are helping set up an AI assistant for a dental office.

Below is the scraped content from their website. Extract structured knowledge base entries that the AI will use to answer patient questions.

For each piece of useful information, create an entry with:
- title: short descriptive title (5-10 words)
- content: the actual information a patient would want to know (1-4 sentences, clear and friendly)
- category: one of: hours, services, pricing, insurance, location, policies, team, emergency, general

Rules:
- Only include information that is genuinely useful for patients
- Skip navigation menus, legal boilerplate, cookie notices, and generic filler text
- Be specific — include actual hours, prices, phone numbers, addresses if present
- Create separate entries for each distinct topic
- Aim for 5-20 entries depending on how much content is on the site

Return ONLY a JSON array, no other text:
[
  {"title": "...", "content": "...", "category": "..."},
  ...
]

Website content:
"""


def get_firecrawl() -> FirecrawlApp:
    global _firecrawl
    if _firecrawl is None:
        _firecrawl = FirecrawlApp(api_key=settings.firecrawl_api_key)
    return _firecrawl


def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic


def scrape_website(url: str) -> str:
    """
    Scrape a dental office website and return clean markdown text.
    Crawls up to 10 pages (home, services, contact, about, etc.)
    """
    fc = get_firecrawl()

    result = fc.crawl_url(
        url,
        params={
            "limit": 10,                        # max pages to crawl
            "scrapeOptions": {
                "formats": ["markdown"],
                "excludeTags": ["nav", "footer", "script", "style", "head"],
                "onlyMainContent": True,        # strips headers/footers/navbars
            },
        },
        poll_interval=3,
    )

    # Combine all pages into one document
    pages = result.data if hasattr(result, "data") else []
    combined = []
    for page in pages:
        md = page.markdown if hasattr(page, "markdown") else ""
        url_str = page.metadata.get("url", "") if hasattr(page, "metadata") else ""
        if md and md.strip():
            combined.append(f"## Page: {url_str}\n\n{md}")

    return "\n\n---\n\n".join(combined)


def parse_kb_entries(scraped_content: str) -> list[dict]:
    """
    Send scraped content to Claude and get back structured KB entries.
    Returns list of {title, content, category} dicts.
    """
    client = get_anthropic()

    # Truncate if too long (Claude has context limits, but keep it generous)
    content = scraped_content[:40000]

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": EXTRACTION_PROMPT + content,
            }
        ],
    )

    raw = message.content[0].text.strip()

    # Strip markdown code fences if Claude wrapped it
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    entries = json.loads(raw)

    # Validate structure
    valid = []
    valid_categories = {"hours", "services", "pricing", "insurance", "location", "policies", "team", "emergency", "general"}
    for e in entries:
        if isinstance(e, dict) and e.get("title") and e.get("content"):
            valid.append({
                "title": str(e["title"])[:200],
                "content": str(e["content"]),
                "category": e.get("category", "general") if e.get("category") in valid_categories else "general",
            })

    return valid


def import_from_url(url: str) -> list[dict]:
    """
    Full pipeline: scrape → parse → return KB entries ready to save.
    The KB router calls this, then embeds and saves each entry.
    """
    scraped = scrape_website(url)
    if not scraped.strip():
        raise ValueError("No content could be scraped from that URL. Check the URL and try again.")

    entries = parse_kb_entries(scraped)
    if not entries:
        raise ValueError("Could not extract any knowledge base entries from the website content.")

    return entries
