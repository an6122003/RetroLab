import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/newsletter/unsubscribe
 * 
 * Unsubscribes an email from the newsletter.
 * Uses admin client to bypass RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    let targetEmail = email;

    if (!targetEmail) {
      // If no email provided, try using the authenticated user's email
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          targetEmail = user.email;
        }
      } catch {
        // Not authenticated
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Email không hợp lệ.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('newsletter_subscriptions')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq('email', targetEmail.toLowerCase().trim());

    if (error) {
      console.error('Newsletter unsubscribe error:', error);
      return NextResponse.json(
        { error: 'Không thể hủy đăng ký. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Newsletter unsubscribe API error:', err);
    return NextResponse.json(
      { error: 'Lỗi máy chủ.' },
      { status: 500 }
    );
  }
}
