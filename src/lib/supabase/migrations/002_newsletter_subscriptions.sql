-- Newsletter Subscriptions Table
-- Stores email subscriptions for the newsletter (daily or weekly).
-- Supports per-category subscriptions via `categories` JSONB column.
-- Can be linked to authenticated users via user_id (optional).

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
  categories JSONB NOT NULL DEFAULT '["general"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);

-- Index for finding active subscriptions
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(is_active) WHERE is_active = true;

-- Index for user_id lookups (profile page)
CREATE INDEX IF NOT EXISTS idx_newsletter_user_id ON newsletter_subscriptions(user_id) WHERE user_id IS NOT NULL;

-- Row Level Security
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (subscribe) — even anonymous users
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read their own subscription
CREATE POLICY "Users can view own newsletter subscription"
  ON newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Authenticated users can update their own subscription
CREATE POLICY "Users can update own newsletter subscription"
  ON newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role has full access to newsletter"
  ON newsletter_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
