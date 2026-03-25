/**
 * Likes service — abstracts like/unlike + like count operations.
 * Uses selective columns, batching, and client-side caching.
 */

import { createClient } from '@/lib/supabase/client';
import type { LikedPost } from '@/lib/types/database';
import { cacheGet, cacheSet, cacheInvalidate, cacheKeys, TTL } from '@/lib/cache';

const supabase = createClient();

/**
 * Check if the current user has liked a specific post.
 * Cached for 2 minutes; invalidated on like/unlike.
 */
export async function isPostLiked(userId: string, postSlug: string): Promise<boolean> {
  const key = cacheKeys.likedStatus(userId, postSlug);
  const cached = cacheGet<boolean>(key);
  if (cached !== undefined) return cached;

  const { count } = await supabase
    .from('liked_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('post_slug', postSlug);

  const result = (count ?? 0) > 0;
  cacheSet(key, result, TTL.LIKED_STATUS);
  return result;
}

/**
 * Get the like count for a post.
 * Cached for 1 minute (other users may also like).
 */
export async function getLikeCount(postSlug: string): Promise<number> {
  const key = cacheKeys.likeCount(postSlug);
  const cached = cacheGet<number>(key);
  if (cached !== undefined) return cached;

  const { count } = await supabase
    .from('liked_posts')
    .select('id', { count: 'exact', head: true })
    .eq('post_slug', postSlug);

  const result = count ?? 0;
  cacheSet(key, result, TTL.LIKE_COUNT);
  return result;
}

/**
 * Like a post. Invalidates relevant caches immediately.
 */
export async function likePost(userId: string, postSlug: string) {
  const { error } = await supabase
    .from('liked_posts')
    .insert({ user_id: userId, post_slug: postSlug });

  // Ignore duplicate key errors (already liked)
  if (error && error.code !== '23505') throw error;

  // Invalidate caches
  cacheInvalidate(cacheKeys.likedStatus(userId, postSlug));
  cacheInvalidate(cacheKeys.likeCount(postSlug));
  cacheInvalidate(cacheKeys.likedSlugs(userId));
}

/**
 * Unlike a post. Invalidates relevant caches immediately.
 */
export async function unlikePost(userId: string, postSlug: string) {
  const { error } = await supabase
    .from('liked_posts')
    .delete()
    .eq('user_id', userId)
    .eq('post_slug', postSlug);

  if (error) throw error;

  // Invalidate caches
  cacheInvalidate(cacheKeys.likedStatus(userId, postSlug));
  cacheInvalidate(cacheKeys.likeCount(postSlug));
  cacheInvalidate(cacheKeys.likedSlugs(userId));
}

/**
 * Get all liked post slugs for a user.
 * Cached for 2 minutes; invalidated on like/unlike.
 */
export async function getUserLikedSlugs(userId: string): Promise<string[]> {
  const key = cacheKeys.likedSlugs(userId);
  const cached = cacheGet<string[]>(key);
  if (cached !== undefined) return cached;

  const { data } = await supabase
    .from('liked_posts')
    .select('post_slug')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const result = (data ?? []).map((row: Pick<LikedPost, 'post_slug'>) => row.post_slug);
  cacheSet(key, result, TTL.LIKED_SLUGS);
  return result;
}

/**
 * Batch check: get liked status for multiple posts at once.
 * Used on listing pages to avoid N+1 queries.
 */
export async function batchCheckLiked(
  userId: string,
  postSlugs: string[]
): Promise<Set<string>> {
  if (!postSlugs.length) return new Set();

  const { data } = await supabase
    .from('liked_posts')
    .select('post_slug')
    .eq('user_id', userId)
    .in('post_slug', postSlugs);

  return new Set((data ?? []).map((row: Pick<LikedPost, 'post_slug'>) => row.post_slug));
}
