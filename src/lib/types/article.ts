// ═══════════════════════════════════════════
// Shared article types & utilities
// This module is safe to import from BOTH client and server components.
// (No 'server-only' guard — purely types + pure functions)
// ═══════════════════════════════════════════

/**
 * Shared interface for article listing data.
 * Used by card components, pages, and layout modules.
 */
export interface ArticleData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  coverImage: string;
  isFeatured: boolean;
  tags: string;
  /** First image from article content — used as fallback when cover fails */
  contentFirstImage?: string;
  /** All unique images from article content — used as cascading fallbacks */
  contentImages?: string[];
}

export interface ArticleDetail extends Omit<ArticleData, 'isFeatured' | 'slug'> {
  content: string;
}

/**
 * Lightweight metadata-only type (no content, no isFeatured).
 * Used by generateMetadata for fast SEO resolution.
 */
export interface PostMetadata {
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  author: string;
  date: string;
  tags: string;
}

/**
 * Format a date string to a Vietnamese-friendly relative or absolute format.
 * Pure function — safe for both client and server.
 */
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
