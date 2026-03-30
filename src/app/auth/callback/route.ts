import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * OAuth callback handler.
 * After OAuth provider consent, Supabase redirects here with a `code`.
 * We exchange it for a session cookie, then redirect to the homepage.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  
  // Determine the real origin. Priority:
  // 1. NEXT_PUBLIC_SITE_URL env var (most reliable for production)
  // 2. x-forwarded-host header (reverse proxy)
  // 3. host header
  // 4. request.nextUrl.origin (fallback — often wrong behind proxy)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  
  let origin: string;
  if (siteUrl) {
    origin = siteUrl.replace(/\/$/, ''); // Use env var, strip trailing slash
  } else if (forwardedHost) {
    const proto = forwardedHost.includes('localhost') ? 'http' : forwardedProto;
    origin = `${proto}://${forwardedHost}`;
  } else {
    origin = request.nextUrl.origin;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}
