import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const VALID_FREQUENCIES = ['daily', 'weekly'] as const;
const VALID_CATEGORIES = ['general', 'tin-tuc', 'ai', 'cong-nghe', 'it', 'game-gia-lap'] as const;

// ── In-memory rate limiting (per IP) ──
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;         // max 5 subscribe attempts per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  record.count++;
  return record.count > RATE_LIMIT_MAX;
}

/**
 * POST /api/newsletter/subscribe
 * 
 * Subscribes an email to the newsletter.
 * 
 * Security model:
 * - service_role key is used server-side only (never exposed to browser)
 * - Input is strictly validated (email format, whitelist of categories/frequencies)
 * - Rate limited per IP (5 requests/minute)
 * - Only touches the newsletter_subscriptions table — no other tables
 */
export async function POST(request: NextRequest) {
  try {
    // ── Rate limit ──
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' },
        { status: 429 }
      );
    }

    // ── Parse & validate ──
    const body = await request.json();
    const { email, frequency = 'weekly', category, categories: rawCategories } = body;

    // Strict email validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
    }

    const validFrequency = VALID_FREQUENCIES.includes(frequency) ? frequency : 'weekly';

    // ── Get authenticated user (optional — for linking) ──
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Not authenticated — that's fine for subscribe
    }

    // ── Determine categories (strict whitelist validation) ──
    const normalizedEmail = email.toLowerCase().trim();
    let finalCategories: string[] = ['general'];

    // Admin client — only used for newsletter_subscriptions operations
    const adminSupabase = createAdminClient();

    const isDirectSet = rawCategories && Array.isArray(rawCategories);
    if (isDirectSet) {
      // Direct set mode — only accept whitelisted categories
      finalCategories = rawCategories.filter((c: unknown) =>
        typeof c === 'string' && VALID_CATEGORIES.includes(c as any)
      );
      if (finalCategories.length === 0) finalCategories = ['general'];
      // Cap at 10 categories max (prevent abuse)
      finalCategories = finalCategories.slice(0, 10);
    } else if (typeof category === 'string' && VALID_CATEGORIES.includes(category as any)) {
      // Merge mode — add single category to existing
      const { data: existing } = await adminSupabase
        .from('newsletter_subscriptions')
        .select('categories')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing?.categories && Array.isArray(existing.categories)) {
        finalCategories = existing.categories.includes(category)
          ? existing.categories
          : [...existing.categories, category];
      } else {
        finalCategories = [category];
      }
    }

    // ── Upsert (with fallback for missing columns) ──
    const payload: Record<string, any> = {
      email: normalizedEmail,
      user_id: userId,
      is_active: true,
      subscribed_at: new Date().toISOString(),
      frequency: validFrequency,
      categories: finalCategories,
    };

    let { data, error } = await adminSupabase
      .from('newsletter_subscriptions')
      .upsert(payload, { onConflict: 'email' })
      .select('email, is_active, subscribed_at')
      .single();

    // Fallback without optional columns
    if (error) {
      console.warn('Full upsert failed, retrying basic:', error.message);
      delete payload.frequency;
      delete payload.categories;

      const retry = await adminSupabase
        .from('newsletter_subscriptions')
        .upsert(payload, { onConflict: 'email' })
        .select('email, is_active, subscribed_at')
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Newsletter subscribe error:', error.message);
      return NextResponse.json(
        { error: 'Không thể đăng ký. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Newsletter API error:', err);
    return NextResponse.json(
      { error: 'Lỗi máy chủ.' },
      { status: 500 }
    );
  }
}
