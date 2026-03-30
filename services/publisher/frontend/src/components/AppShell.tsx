import { ReactNode, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/',          label: 'ARTICLES',  icon: 'article' },
  { path: '/composer',  label: 'COMPOSE',   icon: 'auto_awesome' },
  { path: '/pipeline',  label: 'PIPELINE',  icon: 'bolt' },
  { path: '/workers',   label: 'WORKERS',   icon: 'engineering' },
  { path: '/finops',    label: 'FINOPS',    icon: 'monitoring' },
  { path: '/backup',    label: 'BACKUP',    icon: 'cloud_sync' },
  { path: '/youtube',   label: 'YOUTUBE',   icon: 'smart_display' },
];

interface AppShellProps {
  children: ReactNode;
  /** Optional secondary sidebar (e.g. filters in Dashboard) */
  sidebar?: ReactNode;
  /** Top header bar content — title, tabs, actions */
  header?: ReactNode;
}

export default function AppShell({ children, sidebar, header }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-surface flex">
      {/* ── Icon-only Global Nav Rail ── */}
      <aside className="fixed left-0 top-0 bottom-0 z-50 h-screen w-20 flex flex-col items-center py-6 bg-surface-container-low">
        {/* Brand avatar */}
        <div className="mb-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center hover:scale-105 transition-transform"
            title="RetroLab Publisher"
          >
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#2563EB" />
              <circle cx="22" cy="10" r="4" fill="#FACC15" />
            </svg>
          </button>
        </div>

        {/* Navigation icons */}
        <nav className="flex-1 flex flex-col gap-2">
          {NAV_ITEMS.map(item => {
            const isActive = item.path === '/'
              ? location.pathname === '/' || location.pathname.startsWith('/article/')
              : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all ${
                  isActive
                    ? 'text-primary'
                    : 'text-outline hover:text-primary/70'
                }`}
              >
                {/* Active indicator — 4px blue tab on left edge */}
                {isActive && (
                  <div className="absolute left-[-16px] h-8 w-1 bg-primary rounded-r-full" />
                )}
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="text-[8px] font-semibold tracking-wider mt-0.5 uppercase">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="mt-auto flex flex-col gap-3 items-center">
          <button
            className="w-12 h-12 flex items-center justify-center text-outline hover:text-primary transition-all rounded-lg"
            title="Settings"
          >
            <span className="material-symbols-outlined text-[24px]">settings</span>
          </button>

          {/* User avatar */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant/30 hover:border-primary transition-colors"
              title={user?.email || 'Account'}
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-container flex items-center justify-center text-white text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </button>

            {showMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(19,27,46,0.06)] py-2 z-50 animate-fade-in-up border border-outline-variant/15">
                <div className="px-4 py-2.5 border-b border-outline-variant/10">
                  <p className="text-xs font-semibold text-on-surface truncate">{user?.user_metadata?.full_name || 'Admin'}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setShowMenu(false); signOut(); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-on-surface-variant hover:bg-surface-container-low hover:text-error transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Content area (offset by nav rail width) ── */}
      <div className="ml-20 flex-1 flex flex-col min-h-screen">
        {/* Top header bar */}
        {header && (
          <header className="sticky top-0 z-40 flex items-center justify-between h-20 px-12 bg-surface-container-lowest">
            {header}
          </header>
        )}

        {/* Main workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Optional secondary sidebar */}
          {sidebar && (
            <aside className="w-[240px] bg-surface-container-low flex flex-col flex-shrink-0 overflow-y-auto">
              {sidebar}
            </aside>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
