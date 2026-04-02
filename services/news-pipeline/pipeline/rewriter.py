"""
Stage 3 — LLM article rewriter.

Consumes raw articles, calls Google Gemini, Anthropic Claude, or local Ollama
to rewrite them in a configurable output language (default: Vietnamese),
and returns structured JSON output.

Provider is selected via LLM_PROVIDER env var ("gemini", "anthropic", or "ollama").
"""

from __future__ import annotations

import json
import re
from typing import Any

import structlog

from config.settings import get_settings

logger = structlog.get_logger(__name__)

# ── Prompt templates ────────────────────────────────────────────
# {lang} is interpolated at runtime from settings.output_language_name

SYSTEM_PROMPT_TEMPLATE = (
    "You are an editorial AI for a {lang} tech news website. "
    "You receive English-language tech news articles and rewrite them "
    "entirely in {lang}. Write naturally for a {lang}-speaking audience "
    "— do not translate word-for-word, rewrite with your own editorial "
    "voice and added perspective. Keep technical terms, product names, "
    "and brand names in their original English form (e.g. 'Samsung "
    "Galaxy S26 Ultra', 'Snapdragon 8 Elite', 'Android 16'). "
    "Return valid JSON only — no markdown fences, no preamble."
)

# Valid categories that the LLM must choose from
VALID_CATEGORIES = ["Tin tức", "AI", "Công Nghệ", "Công nghệ thông tin", "Game & Giả Lập"]

USER_PROMPT_TEMPLATE = """\
Rewrite the following article in {lang}.
Title, body, summary, perspective, category, and tags → all in {lang}.
image_keywords → English always (for image search APIs).

SOURCE ARTICLE:
Title: {title}
Author: {author}
Source: {source_name}
Published: {published_at}

Body:
{body_text}
{available_images_section}
---

Return a JSON object with exactly these fields:
- "title": rewritten headline in {lang}
- "body": Full article in Markdown, in {lang}. Write as long as the content warrants — no word limit. 
  Write naturally as a professional journalist would. Use markdown formatting only when it genuinely improves readability:
  * ## for main sections (only if the article has clear distinct topics, not for every paragraph)
  * **bold** for product names and key features on first mention
  * Bulleted or numbered lists for specs, features, or step-by-step content (not for regular prose)
  * Tables only for real comparisons (e.g. specs side-by-side, pricing tiers)
  * > blockquotes only for actual quotes from people or official statements
  * Do NOT use callouts, code blocks, or excessive headers. Write flowing paragraphs as the primary format.
  * IMAGES — CRITICAL RULES:
    1. If the source article body contains inline images with REAL URLs (e.g. ![alt](https://example.com/image.jpg)),
       you MUST KEEP those exact image URLs in your rewritten body at the contextually correct position.
       These are original images from the source — they are relevant and should be preserved.
    2. If AVAILABLE IMAGES are provided above, you may use them in the body where contextually appropriate.
       Use the format ![Vietnamese description](URL) with the exact URL from the list.
       Pick images whose description matches what you are writing about at that point in the article.
       You do NOT have to use all of them — only use images that genuinely enhance the content.
    3. DO NOT put all images at the end — distribute them naturally throughout the article.
    4. DO NOT invent or hallucinate image URLs. Use ONLY URLs from the source article body or the AVAILABLE IMAGES list.
    5. If no AVAILABLE IMAGES are provided and you want to suggest an image position,
       use ![description](PLACEHOLDER_IMAGE_N) sparingly (1-3 max).
  Focus on compelling, insightful writing. Elaborate on the original content to add value, but do not hallucinate facts.
  * Length & Detail: If the source article is very short (under 300 words), expand it into a comprehensive article by explaining the underlying concepts, background context, or historical significance. Do NOT simply translate a brief snippet.
  * Fact Accuracy: If you are expanding the article, ONLY state facts you are highly confident about. If the topic is very new or niche and you are unsure, do not guess or hallucinate details. Stick to the provided text.
  * Category Adaptation: The news post could be from various categories (hardware, software, AI, casual gaming, enterprise IT). Adapt your writing style and tone to perfectly suit the specific category of the source article.
- "summary": 2-3 sentences in {lang}, professional tone.
- "perspective": 2 sentences of editorial opinion in {lang}. IMPORTANT: When stating an opinion or evaluating, you MUST refer to yourself as "RetroLab", "Đội ngũ RetroLab", "Team RetroLab", or "RetroLab chúng mình" (e.g. "Theo đánh giá của RetroLab...", "Đội ngũ RetroLab nhận thấy..."). NEVER use "Tôi nghĩ", "Theo tôi", "Chúng tôi", or other generic pronouns.
- "category": REQUIRED. A SINGLE string — pick the ONE BEST-FIT category from this list: ["Tin tức", "AI", "Công Nghệ", "Công nghệ thông tin", "Game & Giả Lập"]. Choose the most specific match. If an article is about AI, pick "AI" (not "Tin tức"). If about gaming/emulation, pick "Game & Giả Lập". If about programming/IT, pick "Công nghệ thông tin". Use "Tin tức" only for general tech news that doesn't fit other categories.
- "hero_image_url": Pick the SINGLE BEST image URL for the article's cover/hero image. Choose the image that best represents the article's main subject. Prefer product photos, key visuals, or action shots. AVOID author headshots, logos, ads, icons, or generic stock imagery. Must be an exact URL from the source body or AVAILABLE IMAGES list. If no suitable image exists, return null.
- "image_keywords": 4-6 English phrases for additional hero image search. Make these VERY SPECIFIC to the article subject (e.g. "Apple Car Project Titan concept render", NOT "car technology"). Only needed if no good hero image was found above.
- "inline_image_keywords": a JSON array of search phrases for each PLACEHOLDER_IMAGE_N used in body. If you used real URLs from available images instead, return an empty array [].
- "tags": 5-10 topic tags in {lang}. ALL tags must be in Vietnamese (e.g. "điện thoại", "trí tuệ nhân tạo", "đánh giá", "bảo mật", "phần mềm"). The ONLY exception: keep product/brand names in English (e.g. "Samsung", "iPhone", "ChatGPT"). Do NOT use English words for concepts — translate them. IMPORTANT: If the article fits multiple categories from the category list above, include the OTHER applicable categories (the ones NOT chosen as the primary "category") as additional tags here. For example, if the article is about an AI-powered game and you chose "AI" as the primary category, add "Game & Giả Lập" as a tag.
- "reading_time_minutes": estimated reading time as an integer.

CRITICAL — CONTENT CLEANING RULES:
The source article may contain advertisements, affiliate links, promotional content, and other non-article material.
You MUST completely strip and NEVER include any of the following in your rewritten article:
  * Affiliate links or product recommendation sections (e.g. Amazon links, "Buy now" buttons, "Best accessories" lists)
  * FTC disclaimers (e.g. "We use income-earning auto affiliate links")
  * Social media follow/subscribe calls-to-action (e.g. "Follow us on Twitter", "Subscribe to our YouTube")
  * Reader engagement prompts (e.g. "Share your thoughts in the comments", "What do you think?")
  * Cross-promotion sections (e.g. "Visit our homepage for more", "Check out our exclusive stories")
  * Newsletter signup prompts
  * Any content that is clearly advertising or not part of the actual news article
Focus ONLY on the factual news content and editorial substance.

Rules: Write in a premium, authoritative tech journalism voice. 
Keep product names in English. Use markdown architecture to make the article highly readable and professional.
Note: Systematic source attribution (Nguồn: ...) is handled by the platform; focus purely on the article content.
"""


# ── Provider-specific callers ───────────────────────────────────


async def _call_gemini(
    system_prompt: str,
    user_prompt: str,
    settings: Any,
) -> str:
    """Call Google Gemini API and return raw text response."""
    from google import genai

    client = genai.Client(api_key=settings.gemini_api_key)

    response = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=user_prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=settings.llm_temperature,
            response_mime_type="application/json",
        ),
    )

    return response.text.strip()


async def _call_anthropic(
    system_prompt: str,
    user_prompt: str,
    settings: Any,
) -> str:
    """Call Anthropic Claude API and return raw text response."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=8000,
        temperature=settings.llm_temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    return message.content[0].text.strip()


async def _call_ollama(
    system_prompt: str,
    user_prompt: str,
    settings: Any,
) -> str:
    """Call a local Ollama model via its OpenAI-compatible API.
    
    When ollama_think is enabled, prefixes the user prompt with /think
    to activate the model's reasoning mode (e.g. Qwen3's CoT mode).
    The thinking tokens are stripped from the final response.
    """
    import httpx
    import re

    # Prepend /think to enable reasoning mode
    final_user_prompt = user_prompt
    if settings.ollama_think:
        final_user_prompt = "/think\n\n" + user_prompt

    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": final_user_prompt},
        ],
        "stream": False,
        "options": {
            "num_ctx": settings.ollama_num_ctx,
            "temperature": settings.llm_temperature,
        },
        "format": "json",
    }

    async with httpx.AsyncClient(timeout=600.0) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    raw_text = data.get("message", {}).get("content", "")

    # Strip <think>...</think> blocks from reasoning-enabled responses
    raw_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()

    logger.info(
        "ollama_response_received",
        model=settings.ollama_model,
        response_length=len(raw_text),
        eval_count=data.get("eval_count"),
        total_duration_ms=data.get("total_duration", 0) // 1_000_000,
    )

    return raw_text


async def _call_llm(
    system_prompt: str,
    user_prompt: str,
    settings: Any,
) -> str:
    """Route to the configured LLM provider."""
    provider = settings.llm_provider.lower()

    if provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not set but LLM_PROVIDER=gemini")
        return await _call_gemini(system_prompt, user_prompt, settings)
    elif provider == "anthropic":
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set but LLM_PROVIDER=anthropic")
        return await _call_anthropic(system_prompt, user_prompt, settings)
    elif provider == "ollama":
        return await _call_ollama(system_prompt, user_prompt, settings)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}. Use 'gemini', 'anthropic', or 'ollama'.")


# ── Main rewriter ───────────────────────────────────────────────


async def rewrite_article(
    raw_article: dict[str, Any],
    source_name: str = "",
    output_language_name: str | None = None,
    available_images: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """
    Rewrite a raw article using the configured LLM provider.

    Args:
        raw_article: dict with title, author, body_text, published_at, source_name
        source_name: name of the source outlet
        output_language_name: language to rewrite in (defaults to settings value)
        available_images: optional list of pre-searched images with {url, description}
                         that the LLM can place directly in the article body

    Returns:
        Parsed JSON dict with rewritten fields:
            title, body, summary, perspective, image_keywords, tags, reading_time_minutes,
            hero_image_url

    Raises:
        ValueError: if the LLM returns malformed JSON after retry.
    """
    settings = get_settings()
    lang = output_language_name or settings.output_language_name
    provider = settings.llm_provider.lower()

    # Build available images section for the prompt
    available_images_section = ""
    if available_images:
        lines = ["\n\nAVAILABLE IMAGES (pre-searched, use these URLs directly in body where appropriate):"]
        for i, img in enumerate(available_images, 1):
            desc = img.get("description") or img.get("title") or "No description"
            url = img.get("url", "")
            lines.append(f"  {i}. {url} — \"{desc}\"")
        lines.append("")
        available_images_section = "\n".join(lines)

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(lang=lang)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        lang=lang,
        title=raw_article.get("title", ""),
        author=raw_article.get("author", "Unknown"),
        source_name=source_name,
        published_at=raw_article.get("published_at", "Unknown"),
        body_text=raw_article.get("body_text", ""),
        available_images_section=available_images_section,
    )

    # Determine model name for DB tracking
    if provider == "gemini":
        model_name = settings.gemini_model
    elif provider == "anthropic":
        model_name = settings.anthropic_model
    elif provider == "ollama":
        model_name = f"ollama/{settings.ollama_model}"
    else:
        model_name = provider

    # Attempt up to 2 times (initial + 1 retry)
    for attempt in range(2):
        try:
            raw_text = await _call_llm(system_prompt, user_prompt, settings)

            # Strip markdown fences if the model included them anyway
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1]  # remove first line
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

            # Fix invalid JSON escape sequences (e.g. \' \V etc.)
            # Valid JSON escapes are: \" \\ \/ \b \f \n \r \t \uXXXX
            raw_text = re.sub( # Changed from _re.sub to re.sub
                r'\\(?!["\\/bfnrtu])',
                r'\\\\',
                raw_text,
            )

            result = json.loads(raw_text)

            # Validate required fields
            required_fields = [
                "title", "body", "summary", "perspective",
                "image_keywords", "tags", "reading_time_minutes",
                "category",
            ]
            missing = [f for f in required_fields if f not in result]
            if missing:
                raise ValueError(f"Missing fields in LLM response: {missing}")

            # Validate and normalize category to a single string
            raw_cat = result.get("category", "Tin tức")
            extra_cats = []

            if isinstance(raw_cat, list):
                # LLM returned an array — take the first valid one, push rest to tags
                valid_list = [c for c in raw_cat if c in VALID_CATEGORIES]
                if not valid_list:
                    cat_map = {c.lower(): c for c in VALID_CATEGORIES}
                    valid_list = [cat_map[c.lower()] for c in raw_cat if c.lower() in cat_map]
                if valid_list:
                    result["category"] = valid_list[0]
                    extra_cats = valid_list[1:]  # overflow → tags
                else:
                    result["category"] = "Tin tức"
            elif isinstance(raw_cat, str):
                if raw_cat in VALID_CATEGORIES:
                    result["category"] = raw_cat
                else:
                    # Fuzzy match
                    cat_map = {c.lower(): c for c in VALID_CATEGORIES}
                    result["category"] = cat_map.get(raw_cat.lower(), "Tin tức")
            else:
                result["category"] = "Tin tức"

            # Merge any extra categories into tags (avoid duplicates)
            if extra_cats:
                existing_tags = result.get("tags", []) or []
                for ec in extra_cats:
                    if ec not in existing_tags:
                        existing_tags.append(ec)
                result["tags"] = existing_tags

            # Attach model info for tracking
            result["_model"] = model_name

            logger.info(
                "article_rewritten",
                source_name=source_name,
                title=result["title"][:80],
                output_language=lang,
                provider=provider,
                model=model_name,
                attempt=attempt + 1,
            )
            return result

        except json.JSONDecodeError:
            logger.warning(
                "rewrite_json_parse_failed",
                source_name=source_name,
                provider=provider,
                attempt=attempt + 1,
            )
            if attempt == 0:
                # Retry once — append instruction to fix JSON
                user_prompt += (
                    "\n\nYour previous response was not valid JSON. "
                    "Please return ONLY a valid JSON object, no other text."
                )
                continue
            raise ValueError("LLM returned malformed JSON after retry")

        except ValueError:
            if attempt == 0:
                continue
            raise

    # Should not reach here, but just in case
    raise ValueError("Rewrite failed after all attempts")
