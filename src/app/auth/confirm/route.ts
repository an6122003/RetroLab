import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Email confirmation handler.
 * When a user clicks the confirm link in their email, Supabase redirects
 * here with a token_hash and type. We verify it and set the session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | 'magiclink';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      return NextResponse.redirect(`${origin}/profile`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirm_failed`);
}
