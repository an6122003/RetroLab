/**
 * Saves/Bookmarks service — abstracts save/unsave operations.
 * Private to the user (RLS-enforced). Client-side cached.
 */

import { createClient } from '@/lib/supabase/client';
import type { SavedPost } from '@/lib/types/database';
import { cacheGet, cacheSet, cacheInvalidate, cacheKeys, TTL } from '@/lib/cache';

const supabase = createClient();

/**
 * Check if the current user has saved a specific post.
 * Cached for 2 minutes; invalidated on save/unsave.
 */
export async function isPostSaved(userId: string, postSlug: string): Promise<boolean> {
  const key = cacheKeys.savedStatus(userId, postSlug);
  const cached = cacheGet<boolean>(key);
  if (cached !== undefined) return cached;

  const { count } = await supabase
    .from('saved_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('post_slug', postSlug);

  const result = (count ?? 0) > 0;
  cacheSet(key, result, TTL.SAVED_STATUS);
  return result;
}

/**
 * Save / bookmark a post. Invalidates caches.
 */
export async function savePost(userId: string, postSlug: string) {
  const { error } = await supabase
    .from('saved_posts')
    .insert({ user_id: userId, post_slug: postSlug });

  if (error && error.code !== '23505') throw error;

  cacheInvalidate(cacheKeys.savedStatus(userId, postSlug));
  cacheInvalidate(cacheKeys.savedSlugs(userId));
}

/**
 * Unsave / remove bookmark from a post. Invalidates caches.
 */
export async function unsavePost(userId: string, postSlug: string) {
  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('user_id', userId)
    .eq('post_slug', postSlug);

  if (error) throw error;

  cacheInvalidate(cacheKeys.savedStatus(userId, postSlug));
  cacheInvalidate(cacheKeys.savedSlugs(userId));
}

/**
 * Get all saved post slugs for a user (minimal payload).
 * Cached for 2 minutes.
 */
export async function getUserSavedSlugs(userId: string): Promise<string[]> {
  const key = cacheKeys.savedSlugs(userId);
  const cached = cacheGet<string[]>(key);
  if (cached !== undefined) return cached;

  const { data } = await supabase
    .from('saved_posts')
    .select('post_slug')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const result = (data ?? []).map((row: Pick<SavedPost, 'post_slug'>) => row.post_slug);
  cacheSet(key, result, TTL.SAVED_SLUGS);
  return result;
}

/**
 * Batch check: get saved status for multiple posts at once.
 */
export async function batchCheckSaved(
  userId: string,
  postSlugs: string[]
): Promise<Set<string>> {
  if (!postSlugs.length) return new Set();

  const { data } = await supabase
    .from('saved_posts')
    .select('post_slug')
    .eq('user_id', userId)
    .in('post_slug', postSlugs);

  return new Set((data ?? []).map((row: Pick<SavedPost, 'post_slug'>) => row.post_slug));
}
