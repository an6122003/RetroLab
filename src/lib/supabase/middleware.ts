import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on every request via middleware.
 * This keeps the cookie fresh and avoids forcing re-login.
 *
 * Security notes:
 * - Cookies are HttpOnly + SameSite=Lax (Supabase SSR defaults)
 * - No tokens are ever stored in localStorage
 * - Session refresh is transparent to the user
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recreate the response with updated request cookies
          supabaseResponse = NextResponse.next({ request });
          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — this is what actually keeps the session alive.
  // IMPORTANT: do NOT remove this call. It triggers the cookie refresh.
  await supabase.auth.getUser();

  return supabaseResponse;
}
