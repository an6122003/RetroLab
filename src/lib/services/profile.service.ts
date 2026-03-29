/**
 * Profile service — abstracts profile CRUD operations.
 * Selects only needed columns to minimize data transfer.
 * Caches profile and settings locally.
 */

import { createClient } from '@/lib/supabase/client';
import type { Profile, UserSettings } from '@/lib/types/database';
import { cacheGet, cacheSet, cacheInvalidate, cacheKeys, TTL } from '@/lib/cache';

const supabase = createClient();

/**
 * Get the current user's profile (selective columns).
 * Cached for 5 minutes.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const key = cacheKeys.profile(userId);
  const cached = cacheGet<Profile>(key);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_id, bio, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error) return null;
  const profile = data as Profile;
  cacheSet(key, profile, TTL.PROFILE);
  return profile;
}

/**
 * Update the current user's profile.
 * Invalidates cache immediately so next read fetches fresh data.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'avatar_id' | 'bio'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select('id, display_name, avatar_id, bio')
    .single();

  if (error) throw error;

  const profile = data as Profile;
  cacheSet(cacheKeys.profile(userId), profile, TTL.PROFILE);
  return profile;
}

/**
 * Get user settings. Cached for 5 minutes.
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const key = cacheKeys.settings(userId);
  const cached = cacheGet<UserSettings>(key);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id, email_notifications, push_notifications, newsletter_subscribed, theme_preference')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  const settings = data as UserSettings;
  cacheSet(key, settings, TTL.SETTINGS);
  return settings;
}

/**
 * Update user settings. Invalidates cache immediately.
 */
export async function updateUserSettings(
  userId: string,
  updates: Partial<Omit<UserSettings, 'user_id'>>
) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, ...updates },
      { onConflict: 'user_id' }
    )
    .select('user_id, email_notifications, push_notifications, newsletter_subscribed, theme_preference')
    .single();

  if (error) throw error;

  const settings = data as UserSettings;
  cacheSet(cacheKeys.settings(userId), settings, TTL.SETTINGS);
  return settings;
}
