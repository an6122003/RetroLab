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
    
    // Skip posts already shown on the homepage (first ~25 are used in sections)
    const HOMEPAGE_POSTS_COUNT = 25;

    const allPosts = await getPosts();
    const availablePosts = allPosts.slice(HOMEPAGE_POSTS_COUNT);
    
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
