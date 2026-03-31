import 'server-only';

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from "notion-to-md";
import { marked } from 'marked';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

const n2m = new NotionToMarkdown({ notionClient: notion });

marked.setOptions({
  gfm: true
});

// A shared interface for article data
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
}

export interface ArticleDetail extends Omit<ArticleData, 'isFeatured' | 'slug'> {
  content: string;
}

// ═══════════════════════════════════════════
// In-memory cache for fast repeated reads
// ═══════════════════════════════════════════
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// A helper function to safely extract properties
function extractProperty(page: any, propName: string, type: string, fallback: any) {
  const prop = page.properties[propName];
  if (!prop) return fallback;
  
  switch(type) {
    case 'title': return prop.title?.[0]?.plain_text || fallback;
    case 'rich_text': return prop.rich_text?.[0]?.plain_text || fallback;
    case 'select': return prop.select?.name || fallback;
    case 'multi_select': return prop.multi_select?.map((t: any) => t.name).join(', ') || fallback;
    case 'date': return prop.date?.start || prop.created_time || fallback;
    case 'checkbox': return prop.checkbox || fallback;
    default: return fallback;
  }
}

function mapPageToArticle(page: any): ArticleData {
  const title = extractProperty(page, 'Title', 'title', 'Untitled');
  const slug = extractProperty(page, 'Slug', 'rich_text', page.id);
  const date = extractProperty(page, 'Date', 'date', page.created_time);
  const category = extractProperty(page, 'Category', 'select', 'Tin tức');
  const excerpt = extractProperty(page, 'Excerpt', 'rich_text', 'Chưa có mô tả.');
  const author = extractProperty(page, 'Author', 'select', 'RetroLab');
  const isFeatured = extractProperty(page, 'Featured', 'checkbox', false);
  const tags = extractProperty(page, 'Tags', 'multi_select', '');
  const coverImage = page.cover?.external?.url || page.cover?.file?.url || 'https://picsum.photos/seed/default/800/450';

  return { id: page.id, title, slug, excerpt, category, date, author, coverImage, isFeatured, tags };
}

export async function getPosts(): Promise<ArticleData[]> {
  const cacheKey = 'all-posts';
  const cached = getCached<ArticleData[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Status',
        status: {
          equals: 'Live'
        }
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    const posts = response.results.map(mapPageToArticle);
    setCache(cacheKey, posts);
    return posts;
  } catch (error) {
    console.error("Error fetching Notion posts:", error);
    return [];
  }
}

export async function getPostsByCategory(category: string): Promise<ArticleData[]> {
  const cacheKey = `category-${category}`;
  const cached = getCached<ArticleData[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Status',
            status: { equals: 'Live' }
          },
          {
            property: 'Category',
            select: { equals: category }
          }
        ]
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    const posts = response.results.map(mapPageToArticle);
    setCache(cacheKey, posts);
    return posts;
  } catch (error) {
    console.error("Error fetching posts by category:", error);
    return [];
  }
}

export async function searchPosts(query: string): Promise<ArticleData[]> {
  const cacheKey = `search-${query}`;
  const cached = getCached<ArticleData[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Status',
            status: { equals: 'Live' }
          },
          {
            property: 'Title',
            title: { contains: query }
          }
        ]
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    const posts = response.results.map(mapPageToArticle);
    setCache(cacheKey, posts, 2 * 60 * 1000); // shorter TTL for search
    return posts;
  } catch (error) {
    console.error("Error searching posts:", error);
    return [];
  }
}

/**
 * Search posts by tag (multi_select property).
 * Falls back to filtering all posts client-side if the Notion filter fails.
 */
export async function searchPostsByTag(tag: string): Promise<ArticleData[]> {
  const cacheKey = `tag-${tag}`;
  const cached = getCached<ArticleData[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Status',
            status: { equals: 'Live' }
          },
          {
            property: 'Tags',
            multi_select: { contains: tag }
          }
        ]
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    const posts = response.results.map(mapPageToArticle);
    setCache(cacheKey, posts);
    return posts;
  } catch (error) {
    // Fallback: filter from all posts if Tags property doesn't support this filter
    console.warn("Tag filter failed, falling back to client-side filter:", error);
    const allPosts = await getPosts();
    const posts = allPosts.filter(p =>
      p.tags.split(',').map(t => t.trim().toLowerCase()).includes(tag.toLowerCase())
    );
    setCache(cacheKey, posts);
    return posts;
  }
}

/**
 * Lightweight metadata-only lookup. Skips the expensive markdown→HTML conversion.
 * Used by generateMetadata so it resolves fast and doesn't block loading.tsx.
 */
export async function getPostMetadataBySlug(slug: string): Promise<{ title: string; excerpt: string; coverImage: string } | null> {
  // Check if the full article is already cached — if so, reuse it
  const fullCached = getCached<ArticleDetail>(`article-${slug}`);
  if (fullCached) return { title: fullCached.title, excerpt: fullCached.excerpt, coverImage: fullCached.coverImage };

  const metaCacheKey = `meta-${slug}`;
  const cached = getCached<{ title: string; excerpt: string; coverImage: string }>(metaCacheKey);
  if (cached) return cached;

  let page: any = null;

  try {
    if (slug && slug.length >= 32) {
      try {
        page = await notion.pages.retrieve({ page_id: slug });
        // Check if status is Live
        const status = page?.properties?.Status?.status?.name;
        if (status && status !== 'Live') page = null;
      } catch (e) {
        // Not a valid ID, continue
      }
    }

    if (!page) {
      const response = await notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            { property: 'Slug', rich_text: { equals: slug } },
            { property: 'Status', status: { equals: 'Live' } }
          ]
        }
      });
      if (response.results.length > 0) {
        page = response.results[0];
      }
    }
  } catch {
    return null;
  }

  if (!page) return null;

  const meta = {
    title: extractProperty(page, 'Title', 'title', 'Untitled'),
    excerpt: extractProperty(page, 'Excerpt', 'rich_text', 'Chưa có mô tả.'),
    coverImage: page.cover?.external?.url || page.cover?.file?.url || 'https://picsum.photos/seed/default/800/450',
  };

  setCache(metaCacheKey, meta);
  return meta;
}

export async function getPostBySlug(slug: string): Promise<ArticleDetail | null> {
  const cacheKey = `article-${slug}`;
  const cached = getCached<ArticleDetail>(cacheKey);
  if (cached) return cached;

  let pageId = slug;
  let page: any = null;

  try {
    // 1. First try treating the slug as a direct Page ID
    if (slug && slug.length >= 32) {
      try {
        page = await notion.pages.retrieve({ page_id: slug });
        // Reject if not Live
        const status = page?.properties?.Status?.status?.name;
        if (status && status !== 'Live') {
          page = null;
        } else if (page) {
          pageId = page.id;
        }
      } catch (e) {
        // Not a valid ID, continue to slug query
      }
    }

    // 2. Try querying by the 'Slug' property — only Live posts
    if (!page) {
      const response = await notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            { property: 'Slug', rich_text: { equals: slug } },
            { property: 'Status', status: { equals: 'Live' } }
          ]
        }
      });
      
      if (response.results.length > 0) {
        page = response.results[0];
        pageId = page.id;
      }
    }
  } catch(e: any) {
    if (e.code === 'validation_error' || e.code === 'object_not_found') {
      console.warn(`Slug property not found or invalid ID: ${slug}. Please add 'Slug' (Text) to your Notion DB.`);
    } else {
      console.error("Error finding post by slug:", e);
    }
    return null;
  }

  if (!page) return null;

  const title = extractProperty(page, 'Title', 'title', 'Untitled');
  const date = extractProperty(page, 'Date', 'date', page.created_time);
  const category = extractProperty(page, 'Category', 'select', 'Tin tức');
  const excerpt = extractProperty(page, 'Excerpt', 'rich_text', 'Chưa có mô tả.');
  const author = extractProperty(page, 'Author', 'select', 'RetroLab');
  const tags = extractProperty(page, 'Tags', 'multi_select', '');
  const coverImage = page.cover?.external?.url || page.cover?.file?.url || 'https://picsum.photos/seed/default/800/450';

  const mdblocks = await n2m.pageToMarkdown(pageId);
  const content = n2m.toMarkdownString(mdblocks);
  const htmlContent = await marked.parse(content.parent);

  const article: ArticleDetail = {
    id: page.id,
    title,
    date,
    category,
    excerpt,
    author,
    tags,
    coverImage,
    content: htmlContent
  };

  setCache(cacheKey, article, 10 * 60 * 1000); // cache articles for 10 min
  return article;
}

// Helper: get all unique categories from existing posts
export async function getCategories(): Promise<string[]> {
  const posts = await getPosts();
  const cats = new Set(posts.map(p => p.category));
  return Array.from(cats);
}

// Helper: format a date string to a locale-friendly format
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
