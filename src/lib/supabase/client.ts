'use client';

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Singleton browser Supabase client.
 * Uses cookie-based sessions managed by @supabase/ssr — no tokens in localStorage.
 * Re-uses a single instance across the entire client-side lifecycle.
 */
export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
