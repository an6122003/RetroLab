/**
 * Auth service — abstracts all authentication operations.
 * If migrating away from Supabase, only this file needs to change.
 */

import { createClient } from '@/lib/supabase/client';
import type { AuthUser, Profile } from '@/lib/types/database';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabase = createClient();

type AuthProvider = 'google' | 'github';

/**
 * Sign in with OAuth provider (Google or GitHub).
 * Redirects the browser to the provider's consent screen.
 */
export async function signInWithOAuth(provider: AuthProvider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
}

/**
 * Sign in with email + password.
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign up with email + password.
 * User will receive a confirmation email.
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current auth user + their profile (selective columns).
 * Returns null if not logged in.
 *
 * Network optimization: selects only required profile fields.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch profile with minimal columns
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_id, bio')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    profile: (profile as Profile) || undefined,
  };
}

/**
 * Listen for auth state changes (login, logout, token refresh).
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        // Fetch profile with minimal columns
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_id, bio')
          .eq('id', session.user.id)
          .single();

        callback({
          id: session.user.id,
          email: session.user.email,
          profile: (profile as Profile) || undefined,
        });
      } else {
        callback(null);
      }
    }
  );

  return () => subscription.unsubscribe();
}
