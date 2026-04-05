import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/newsletter/status
 * 
 * Returns the newsletter subscription status for the current authenticated user.
 * Uses admin client for the DB query to bypass RLS.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's email
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ subscribed: false, authenticated: false });
    }

    // Use admin client to read subscription (bypasses RLS)
    const adminSupabase = createAdminClient();

    // Try with all columns first
    let data: any = null;

    const fullResult = await adminSupabase
      .from('newsletter_subscriptions')
      .select('is_active, frequency, categories, subscribed_at')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();

    if (fullResult.error) {
      // Columns might not exist — try basic
      const basicResult = await adminSupabase
        .from('newsletter_subscriptions')
        .select('is_active, subscribed_at')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();
      data = basicResult.data;
    } else {
      data = fullResult.data;
    }

    if (!data) {
      return NextResponse.json({ subscribed: false, authenticated: true, email: user.email });
    }

    return NextResponse.json({
      subscribed: data.is_active,
      frequency: data.frequency || 'weekly',
      categories: data.categories || ['general'],
      authenticated: true,
      email: user.email,
      subscribedAt: data.subscribed_at,
    });
  } catch (err) {
    console.error('Newsletter status error:', err);
    return NextResponse.json({ subscribed: false, authenticated: false });
  }
}
