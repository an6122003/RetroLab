import { NextRequest, NextResponse } from 'next/server';
import { getPostMetadataBySlug } from '@/lib/notion';

/**
 * Lightweight API to fetch article metadata by slug.
 * Used by the profile page PostCard components to display saved/liked articles.
 * Returns only title, excerpt, coverImage — no full content (minimal payload).
 *
 * Cached for 5 minutes via Notion cache layer.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const meta = await getPostMetadataBySlug(slug);

  if (!meta) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Also try to get category from a full article lookup (cached)
  const { getPosts } = await import('@/lib/notion');
  const allPosts = await getPosts();
  const post = allPosts.find((p) => p.slug === slug);

  return NextResponse.json({
    title: meta.title,
    excerpt: meta.excerpt,
    coverImage: meta.coverImage,
    category: post?.category || 'Tin tức',
  });
}
