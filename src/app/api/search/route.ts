import { searchPosts } from '@/lib/notion';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }
  const results = await searchPosts(q.trim());
  // Return only the first 6 for the dropdown preview
  return NextResponse.json(results.slice(0, 6));
}
