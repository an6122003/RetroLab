-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration 003: Add frequency + categories columns
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Run this AFTER migration 002 (which created the base table).
-- Adds `frequency` and `categories` columns to newsletter_subscriptions.
-- Safe to re-run — uses IF NOT EXISTS / idempotent statements.

-- 1) Add `frequency` column (daily or weekly, defaults to weekly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletter_subscriptions' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE newsletter_subscriptions
      ADD COLUMN frequency TEXT NOT NULL DEFAULT 'weekly';
    ALTER TABLE newsletter_subscriptions
      ADD CONSTRAINT chk_frequency CHECK (frequency IN ('daily', 'weekly'));
  END IF;
END $$;

-- 2) Add `categories` column (JSONB array of category slugs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsletter_subscriptions' AND column_name = 'categories'
  ) THEN
    ALTER TABLE newsletter_subscriptions
      ADD COLUMN categories JSONB NOT NULL DEFAULT '["general"]'::jsonb;
  END IF;
END $$;

-- 3) Backfill existing rows
UPDATE newsletter_subscriptions
  SET categories = '["general"]'::jsonb
  WHERE categories IS NULL;

UPDATE newsletter_subscriptions
  SET frequency = 'weekly'
  WHERE frequency IS NULL;
