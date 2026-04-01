"""
Notion integration — converts article to Notion page with blocks.

Maps to existing Notion DB properties:
  Title, Status, Category, Tags, Excerpt, Author, Date, Slug, Featured

Page body:
  1. image block (selected_image)
  2. callout: perspective
  3. divider
  4. Markdown → Notion blocks
  5. divider
  6. Source paragraph
"""

from __future__ import annotations

import re
from typing import Any

from notion_client import AsyncClient

from .models import Article
from .settings import settings

_notion: AsyncClient | None = None


def _get_notion() -> AsyncClient:
    global _notion
    if _notion is None:
        _notion = AsyncClient(auth=settings.NOTION_API_KEY)
    return _notion


# ── Markdown → Notion blocks ─────────────────────────────────


def _rich_text(content: str) -> list[dict]:
    """Create a Notion rich_text array from plain text."""
    if not content:
        return []
    return [{"type": "text", "text": {"content": content}}]


def _paragraph_block(text: str) -> dict:
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": _rich_text(text)},
    }


def _heading_block(text: str, level: int) -> dict:
    h_type = f"heading_{min(level, 3)}"
    return {
        "object": "block",
        "type": h_type,
        h_type: {"rich_text": _rich_text(text)},
    }


def _bulleted_list_block(text: str) -> dict:
    return {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {"rich_text": _rich_text(text)},
    }


def _numbered_list_block(text: str) -> dict:
    return {
        "object": "block",
        "type": "numbered_list_item",
        "numbered_list_item": {"rich_text": _rich_text(text)},
    }


def _code_block(text: str, language: str = "plain text") -> dict:
    return {
        "object": "block",
        "type": "code",
        "code": {
            "rich_text": _rich_text(text),
            "language": language,
        },
    }


def _quote_block(text: str) -> dict:
    return {
        "object": "block",
        "type": "quote",
        "quote": {"rich_text": _rich_text(text)},
    }


def _image_block(url: str) -> dict:
    return {
        "object": "block",
        "type": "image",
        "image": {
            "type": "external",
            "external": {"url": url},
        },
    }


def _divider_block() -> dict:
    return {"object": "block", "type": "divider", "divider": {}}


def _callout_block(text: str, emoji: str = "💡") -> dict:
    return {
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": _rich_text(text),
            "icon": {"type": "emoji", "emoji": emoji},
        },
    }


def _table_block(rows: list[list[str]], has_column_header: bool = True) -> dict:
    """Create a Notion table block."""
    if not rows:
        return {}
    return {
        "object": "block",
        "type": "table",
        "table": {
            "table_width": len(rows[0]),
            "has_column_header": has_column_header,
            "has_row_header": False,
            "children": [
                {
                    "type": "table_row",
                    "table_row": {
                        "cells": [_rich_text(cell) for cell in row]
                    }
                } for row in rows
            ]
        }
    }


def _strip_inline_md(text: str) -> str:
    """Strip inline markdown formatting for plain-text Notion rich_text."""
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", "", text)       # images
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)     # links → text
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"\1", text)         # bold+italic
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)             # bold
    text = re.sub(r"\*(.+?)\*", r"\1", text)                 # italic
    text = re.sub(r"`([^`]+)`", r"\1", text)                 # code
    return text.strip()


def markdown_to_blocks(md_text: str) -> list[dict]:
    """
    Convert markdown text to a list of Notion block dicts.
    Uses a line-by-line regex parser — simple, reliable, no library API issues.
    """
    blocks: list[dict] = []
    lines = md_text.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i]

        # ── Fenced code block ───────────────────────────────
        code_match = re.match(r"^```(\w*)\s*$", line)
        if code_match:
            lang = code_match.group(1) or "plain text"
            code_lines = []
            i += 1
            while i < len(lines) and not re.match(r"^```\s*$", lines[i]):
                code_lines.append(lines[i])
                i += 1
            blocks.append(_code_block("\n".join(code_lines), lang))
            i += 1  # skip closing ```
            continue

        # ── Headings ────────────────────────────────────────
        h_match = re.match(r"^(#{1,3})\s+(.+)$", line)
        if h_match:
            level = len(h_match.group(1))
            blocks.append(_heading_block(_strip_inline_md(h_match.group(2)), level))
            i += 1
            continue

        # ── Horizontal rule ─────────────────────────────────
        if re.match(r"^(-{3,}|\*{3,}|_{3,})\s*$", line):
            blocks.append(_divider_block())
            i += 1
            continue

        # ── Image (standalone) ──────────────────────────────
        img_match = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", line)
        if img_match:
            blocks.append(_image_block(img_match.group(2)))
            i += 1
            continue

        # ── Callout / Blockquote ────────────────────────────
        if line.startswith("> "):
            # Check for Callout syntax: > [!TYPE] Message
            callout_match = re.match(r"^>\s+\[!(INFO|TIP|WARNING|IMPORTANT|CAUTION|NOTE)\]\s*(.*)$", line, re.I)
            if callout_match:
                ctype = callout_match.group(1).upper()
                content = callout_match.group(2)
                emoji = "💡"
                if ctype in ("WARNING", "CAUTION"): emoji = "⚠️"
                elif ctype == "TIP": emoji = "🚀"
                elif ctype == "IMPORTANT": emoji = "⭐️"
                
                # Collect multi-line callout if present
                i += 1
                while i < len(lines) and lines[i].startswith("> ") and not lines[i].startswith("> [!"):
                    content += " " + lines[i][2:].strip()
                    i += 1
                blocks.append(_callout_block(_strip_inline_md(content), emoji))
                continue

            # Standard blockquote
            quote_lines = []
            while i < len(lines) and lines[i].startswith("> "):
                quote_lines.append(lines[i][2:])
                i += 1
            blocks.append(_quote_block(_strip_inline_md(" ".join(quote_lines))))
            continue

        # ── Table ──────────────────────────────────────────
        if re.match(r"^\|.+\|$", line):
            table_rows = []
            # Parse table rows until end of table
            while i < len(lines) and re.match(r"^\|.+\|$", lines[i]):
                row_line = lines[i].strip("|")
                # Skip the separator line |---|---|
                if not re.match(r"^[:\-\s|]+$", row_line):
                    cells = [c.strip() for c in row_line.split("|")]
                    table_rows.append(cells)
                i += 1
            if table_rows:
                blocks.append(_table_block(table_rows))
            continue

        # ── Unordered list ──────────────────────────────────
        ul_match = re.match(r"^[*\-+]\s+(.+)$", line)
        if ul_match:
            blocks.append(_bulleted_list_block(_strip_inline_md(ul_match.group(1))))
            i += 1
            continue

        # ── Ordered list ────────────────────────────────────
        ol_match = re.match(r"^\d+\.\s+(.+)$", line)
        if ol_match:
            blocks.append(_numbered_list_block(_strip_inline_md(ol_match.group(1))))
            i += 1
            continue

        # ── Paragraph (non-empty lines) ─────────────────────
        stripped = line.strip()
        if stripped:
            # Collect consecutive non-empty lines into one paragraph
            para_lines = [stripped]
            i += 1
            while i < len(lines):
                next_line = lines[i].strip()
                if (
                    not next_line
                    or next_line.startswith("#")
                    or next_line.startswith("> ")
                    or re.match(r"^[*\-+]\s+", next_line)
                    or re.match(r"^\d+\.\s+", next_line)
                    or re.match(r"^```", next_line)
                    or re.match(r"^(-{3,}|\*{3,}|_{3,})\s*$", next_line)
                    or re.match(r"^!\[", next_line)
                ):
                    break
                para_lines.append(next_line)
                i += 1
            text = _strip_inline_md(" ".join(para_lines))
            if text:
                blocks.append(_paragraph_block(text))
            continue

        # ── Empty line — skip ───────────────────────────────
        i += 1

    return blocks


# ── Create Notion page ────────────────────────────────────────


async def push_to_notion(article: Article) -> str:
    """
    Create a new page in the Notion database from an Article.
    Returns the created page ID.
    """
    notion = _get_notion()

    # ── Properties ────────────────────────────────────────────
    properties: dict[str, Any] = {
        "Title": {"title": _rich_text(article.title or "Untitled")},
        "Status": {"status": {"name": "Live"}},
        "Featured": {"checkbox": False},
    }

    if article.category:
        # Notion 'select' options cannot contain commas. Take the first one if multiple.
        clean_category = article.category.split(",")[0].strip()
        properties["Category"] = {"select": {"name": clean_category}}

    if article.tags:
        # Ensure tags don't contain commas either (Notion multi_select limit)
        clean_tags = []
        for tag in article.tags:
            for subt in tag.split(","):
                if subt.strip():
                    clean_tags.append(subt.strip())
        
        properties["Tags"] = {
            "multi_select": [{"name": t[:100]} for t in clean_tags[:100]] # limit length and count
        }

    if article.summary:
        properties["Excerpt"] = {"rich_text": _rich_text(article.summary)}

    # Author — use source_author or default
    author_name = article.source_author or "Tổng hợp bởi RetroLab"
    properties["Author"] = {"select": {"name": author_name}}

    # Date is created_time (auto-set by Notion) — read-only, skip

    if article.slug:
        properties["Slug"] = {"rich_text": _rich_text(article.slug)}

    # ── Cover image ──────────────────────────────────────────
    cover = None
    if article.selected_image and isinstance(article.selected_image, dict):
        img_url = article.selected_image.get("url", "")
        if img_url:
            cover = {"type": "external", "external": {"url": img_url}}

    # ── Body blocks ───────────────────────────────────────────
    children: list[dict] = []

    # 1. Callout — perspective
    if article.perspective:
        children.append(_callout_block(article.perspective, "💡"))

    # 2. Divider
    children.append(_divider_block())

    # 3. Body markdown → blocks
    if article.body:
        children.extend(markdown_to_blocks(article.body))

    # 4. Divider
    children.append(_divider_block())

    # 5. Source paragraph — format: Nguồn: Author - Website Name - Link
    source_parts = []
    if article.source_author:
        source_parts.append(article.source_author)
    if article.source_outlet:
        source_parts.append(article.source_outlet)
    if article.source_url:
        source_parts.append(article.source_url)
    if source_parts:
        children.append(_paragraph_block(f"Nguồn: {' - '.join(source_parts)}"))

    # ── Create page ───────────────────────────────────────────
    create_kwargs: dict[str, Any] = {
        "parent": {"database_id": settings.NOTION_DATABASE_ID},
        "properties": properties,
    }
    if cover:
        create_kwargs["cover"] = cover

    page = await notion.pages.create(**create_kwargs)

    page_id = page["id"]

    # ── Append blocks (max 100 per call) ──────────────────────
    for i in range(0, len(children), 100):
        chunk = children[i : i + 100]
        await notion.blocks.children.append(block_id=page_id, children=chunk)

    return page_id

