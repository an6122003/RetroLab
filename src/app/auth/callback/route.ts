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
  
  // When running behind a reverse proxy (e.g. Cloud Run), request.url might
  // be localhost:3000. We must use the 'x-forwarded-host' header to get the real origin.
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  
  const origin = forwardedHost 
    ? `${forwardedHost.includes('localhost') ? 'http' : forwardedProto}://${forwardedHost}`
    : request.nextUrl.origin;

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
