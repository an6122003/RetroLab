// ═══════════════════════════════════════════
// Database type definitions — mirrors Supabase schema
// Portable: no Supabase-specific imports here
// ═══════════════════════════════════════════

export interface Profile {
  id: string;
  display_name: string;
  avatar_id: string;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  newsletter_subscribed: boolean;
  theme_preference: 'light' | 'dark' | 'system';
}

export interface LikedPost {
  id: number;
  user_id: string;
  post_slug: string;
  created_at: string;
}

export interface SavedPost {
  id: number;
  user_id: string;
  post_slug: string;
  created_at: string;
}

export interface Comment {
  id: number;
  user_id: string;
  post_slug: string;
  content: string;
  parent_id: number | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════
// Auth user (minimal — only what we expose)
// ═══════════════════════════════════════════

export interface AuthUser {
  id: string;
  email: string | undefined;
  /** Profile loaded alongside the auth check */
  profile?: Profile;
}
