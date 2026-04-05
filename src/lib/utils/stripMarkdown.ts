/**
 * Strips common Markdown syntax from a string, returning plain text.
 * Used for rendering excerpts / descriptions on article cards where
 * we want readable text instead of raw **bold**, _italic_, etc.
 */
export function stripMarkdown(text: string): string {
  if (!text) return text;

  return text
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove links [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold/italic markers (***text***, **text**, *text*, ___text___, __text__, _text_)
    .replace(/(\*{1,3}|_{1,3})(.+?)\1/g, '$2')
    // Remove strikethrough ~~text~~
    .replace(/~~(.+?)~~/g, '$1')
    // Remove inline code `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove headings # ## ### etc
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes > 
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules --- *** ___
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove unordered list markers - * +
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove ordered list markers 1. 2. etc
    .replace(/^\s*\d+\.\s+/gm, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}
