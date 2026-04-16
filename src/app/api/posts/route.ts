import { NextRequest, NextResponse } from 'next/server';
import { getPosts } from '@/lib/notion';

/**
 * GET /api/posts?page=1&limit=12
 * 
 * Returns paginated posts for the "load more" feature.
 * Uses the same cached getPosts() from Notion.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(24, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    
    const allPosts = await getPosts();

    // The homepage uses ~16 unique articles in various sections.
    // If total posts is small, don't skip any so users can browse everything.
    const HOMEPAGE_UNIQUE = Math.min(16, allPosts.length);
    const availablePosts = allPosts.length > HOMEPAGE_UNIQUE
      ? allPosts.slice(HOMEPAGE_UNIQUE)
      : allPosts; // Show all if not many posts
    
    const startIdx = (page - 1) * limit;
    const posts = availablePosts.slice(startIdx, startIdx + limit);
    const hasMore = startIdx + limit < availablePosts.length;
    const totalRemaining = availablePosts.length;

    return NextResponse.json({
      posts,
      page,
      hasMore,
      total: totalRemaining,
    });
  } catch (err) {
    console.error('Posts API error:', err);
    return NextResponse.json({ posts: [], page: 1, hasMore: false, total: 0 });
  }
}
