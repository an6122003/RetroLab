-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RetroLab — Supabase Schema (Initial)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Project: https://tmwkuavfhnjthcicxsed.supabase.co
-- Run this in Supabase SQL Editor to recreate the full schema.
-- Last verified: 2026-03-27
--
-- Creates: profiles, user_settings, liked_posts, saved_posts, comments
-- Plus: RLS policies and auto-provisioning trigger for new users


-- ══════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'User',
  avatar_id TEXT NOT NULL DEFAULT 'avatar-01',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  newsletter_subscribed BOOLEAN DEFAULT false,
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'))
);

CREATE TABLE IF NOT EXISTS public.liked_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_slug)
);

CREATE TABLE IF NOT EXISTS public.saved_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_slug)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_slug TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  parent_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════

-- profiles: public read, own write
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_settings: private (own only)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY settings_insert ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY settings_update ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- liked_posts: public read (for counts), own write
ALTER TABLE public.liked_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY likes_select ON public.liked_posts FOR SELECT USING (true);
CREATE POLICY likes_insert ON public.liked_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY likes_delete ON public.liked_posts FOR DELETE USING (auth.uid() = user_id);

-- saved_posts: private (own only)
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY saves_all ON public.saved_posts FOR ALL USING (auth.uid() = user_id);

-- comments: public read, own write
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_select ON public.comments FOR SELECT USING (true);
CREATE POLICY comments_insert ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY comments_update ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY comments_delete ON public.comments FOR DELETE USING (auth.uid() = user_id);


-- ══════════════════════════════════════
-- AUTO-PROVISIONING TRIGGER
-- ══════════════════════════════════════
-- When a new user signs up, auto-create their profile + settings row.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    'avatar-01'
  );
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
