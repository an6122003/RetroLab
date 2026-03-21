import { useAuth } from '../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-sm mx-auto px-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#2563eb] flex items-center justify-center relative mb-4">
            <div className="w-3 h-3 bg-[#facc15] rounded-full absolute top-2 right-2" />
          </div>
          <div className="text-2xl font-black tracking-tighter flex items-center">
            <span className="text-gray-900">Retro</span>
            <span className="text-[#2563eb]">Lab</span>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="text-3xl mb-3">🚫</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-600 mb-1">
            Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
          </p>
          <p className="text-sm text-gray-500 mb-5">
            This account is not authorized to access the publisher. Please sign in with an admin account.
          </p>
          <button
            onClick={signOut}
            className="px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-sm font-medium hover:bg-blue-700 transition-all"
          >
            Sign out & try again
          </button>
        </div>
      </div>
    </div>
  );
}
