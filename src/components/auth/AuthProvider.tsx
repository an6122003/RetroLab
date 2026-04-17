'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@/lib/types/database';
import { getCurrentUser, onAuthStateChange, signOut as authSignOut } from '@/lib/services/auth.service';
import { cacheClearAll } from '@/lib/cache';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Force refresh the user data from the server */
  refresh: () => Promise<void>;
  /** Sign out and clear local state */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load — fetch once, then subscribe to changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) setUser(currentUser);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    // Subscribe to live auth changes (login / logout / token refresh).
    // NOTE: we do NOT set loading=true here — that would cause a full
    // re-render of UserMenu (skeleton flash) every time the session refreshes.
    const unsubscribe = onAuthStateChange((updatedUser) => {
      if (mounted) {
        setUser(updatedUser);
        // Only clear loading if it's still true from the initial load.
        // This handles the race where the subscription fires before init() resolves.
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authSignOut();
    } catch (e) {
      // Sign-out can fail if session is already invalid — that's OK
      console.warn('Sign-out error (ignored):', e);
    }
    cacheClearAll(); // Clear all cached user data
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state anywhere in the component tree.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
