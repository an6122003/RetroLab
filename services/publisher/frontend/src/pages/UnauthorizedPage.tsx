import { useAuth } from '../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="max-w-sm mx-auto px-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center relative mb-4">
            <div className="w-3 h-3 bg-[#facc15] rounded-full absolute top-2 right-2" />
          </div>
          <div className="text-2xl font-black tracking-tighter flex items-center">
            <span className="text-on-surface">Retro</span>
            <span className="text-primary">Lab</span>
          </div>
        </div>

        <div className="bg-error-container/20 border border-error/20 rounded-2xl p-6">
          <div className="text-3xl mb-3">🚫</div>
          <h1 className="text-lg font-bold text-on-surface mb-2">Access Denied</h1>
          <p className="text-sm text-on-surface-variant mb-1">
            Signed in as <span className="font-medium text-on-surface">{user?.email}</span>
          </p>
          <p className="text-sm text-on-surface-variant mb-5">
            This account is not authorized to access the publisher. Please sign in with an admin account.
          </p>
          <button
            onClick={signOut}
            className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary text-sm font-medium hover:opacity-90 transition-all"
          >
            Sign out & try again
          </button>
        </div>
      </div>
    </div>
  );
}
