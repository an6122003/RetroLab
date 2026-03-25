/**
 * Comments service — prepared but feature-flagged OFF.
 * All CRUD operations are ready; enable by setting COMMENTS_ENABLED.
 */

import { createClient } from '@/lib/supabase/client';
import type { Comment, Profile } from '@/lib/types/database';

const supabase = createClient();

/** Feature flag — set to true when ready to launch comments */
export const COMMENTS_ENABLED = false;

export interface CommentWithAuthor extends Comment {
  author: Pick<Profile, 'display_name' | 'avatar_id'>;
}

/**
 * Get comments for a post (with author info), ordered oldest first.
 * Joins with profiles to get display_name and avatar_id.
 */
export async function getPostComments(postSlug: string): Promise<CommentWithAuthor[]> {
  if (!COMMENTS_ENABLED) return [];

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, user_id, post_slug, content, parent_id, is_edited, created_at, updated_at,
      profiles!inner ( display_name, avatar_id )
    `)
    .eq('post_slug', postSlug)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch comments:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    post_slug: row.post_slug,
    content: row.content,
    parent_id: row.parent_id,
    is_edited: row.is_edited,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: row.profiles,
  }));
}

/**
 * Get comment count for a post (head-only query).
 */
export async function getCommentCount(postSlug: string): Promise<number> {
  if (!COMMENTS_ENABLED) return 0;

  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('post_slug', postSlug);

  return count ?? 0;
}

/**
 * Add a comment (or reply to an existing comment).
 * Content is capped at 2000 chars by the DB constraint.
 */
export async function addComment(
  userId: string,
  postSlug: string,
  content: string,
  parentId?: number
) {
  if (!COMMENTS_ENABLED) throw new Error('Comments are not enabled');

  // Client-side validation (DB has CHECK constraint too)
  if (content.length > 2000) {
    throw new Error('Comment must be 2000 characters or fewer');
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: userId,
      post_slug: postSlug,
      content: content.trim(),
      parent_id: parentId ?? null,
    })
    .select('id, content, created_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Edit a comment (owner only — RLS enforced).
 */
export async function editComment(commentId: number, newContent: string) {
  if (!COMMENTS_ENABLED) throw new Error('Comments are not enabled');

  if (newContent.length > 2000) {
    throw new Error('Comment must be 2000 characters or fewer');
  }

  const { error } = await supabase
    .from('comments')
    .update({
      content: newContent.trim(),
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId);

  if (error) throw error;
}

/**
 * Delete a comment (owner only — RLS enforced).
 */
export async function deleteComment(commentId: number) {
  if (!COMMENTS_ENABLED) throw new Error('Comments are not enabled');

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}
