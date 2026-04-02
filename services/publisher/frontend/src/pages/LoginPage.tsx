import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center relative mb-4">
            <div className="w-3 h-3 bg-[#facc15] rounded-full absolute top-2 right-2" />
          </div>
          <div className="text-2xl font-black tracking-tighter flex items-center">
            <span className="text-on-surface">Retro</span>
            <span className="text-primary">Lab</span>
          </div>
          <p className="text-on-surface-variant text-sm mt-1.5">Publisher Admin</p>
        </div>

        {/* Login card */}
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-bold text-on-surface text-center mb-1">
            Sign in to continue
          </h1>
          <p className="text-sm text-on-surface-variant text-center mb-6">
            Only authorized admin accounts can access the publisher.
          </p>

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-on-surface-variant mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@retrolab.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-on-surface-variant mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-error-container/30 border border-error/20 text-xs text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-outline-variant/20" />
            <span className="text-[11px] text-on-surface-variant/60 uppercase">or</span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>

          {/* Google sign-in */}
          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-on-surface font-medium text-sm hover:bg-surface-container-low hover:border-outline-variant/30 transition-all disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-on-surface-variant/60">
              Restricted access · Admin only
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-on-surface-variant/60 mt-8">
          © 2026 RetroLab · Publisher v1.0
        </p>
      </div>
    </div>
  );
}
