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

USER_PROMPT_TEMPLATE = """\
Rewrite the following article in {lang}.
Title, body, summary, perspective, and tags → {lang}.
image_keywords and inline_image_keywords → English always (for image search APIs).

SOURCE ARTICLE:
Title: {title}
Author: {author}
Source: {source_name}
Published: {published_at}

Body:
{body_text}

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
  * Image placeholders: Include 2-4 images using ![description](PLACEHOLDER_IMAGE_N) syntax.
    Place each at the CONTEXTUALLY CORRECT position where it relates to surrounding text. 
    DO NOT put all images at the end.
  Focus on compelling, insightful writing. Elaborate on the original content to add value, but do not hallucinate facts.
- "summary": 2-3 sentences in {lang}, professional tone.
- "perspective": 2 sentences of editorial opinion in {lang}.
- "image_keywords": 4-6 English phrases for high-quality hero image search.
- "inline_image_keywords": a JSON array of search phrases for each placeholder (must match # of placeholders in body).
- "tags": 5-10 lowercase topic tags in {lang} (e.g. "điện thoại", "trí tuệ nhân tạo", "đánh giá"). Use {lang} words for concepts, keep product/brand names in English.
- "reading_time_minutes": estimated reading time as an integer.

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
        max_tokens=2000,
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
) -> dict[str, Any]:
    """
    Rewrite a raw article using the configured LLM provider.

    Args:
        raw_article: dict with title, author, body_text, published_at, source_name
        source_name: name of the source outlet
        output_language_name: language to rewrite in (defaults to settings value)

    Returns:
        Parsed JSON dict with rewritten fields:
            title, body, summary, perspective, image_keywords, tags, reading_time_minutes

    Raises:
        ValueError: if the LLM returns malformed JSON after retry.
    """
    settings = get_settings()
    lang = output_language_name or settings.output_language_name
    provider = settings.llm_provider.lower()

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(lang=lang)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        lang=lang,
        title=raw_article.get("title", ""),
        author=raw_article.get("author", "Unknown"),
        source_name=source_name,
        published_at=raw_article.get("published_at", "Unknown"),
        body_text=raw_article.get("body_text", ""),
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
            ]
            missing = [f for f in required_fields if f not in result]
            if missing:
                raise ValueError(f"Missing fields in LLM response: {missing}")

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
