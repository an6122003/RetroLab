'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogOut, Settings, Heart, Bookmark } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAvatar } from '@/constants/avatars';

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  // Loading state — show skeleton circle
  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full skeleton-bone" />
    );
  }

  // Not logged in — show login button
  if (!user) {
    return (
      <Link
        href="/auth/login"
        id="user-login-btn"
        className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#2563eb] flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
        aria-label="Đăng nhập"
      >
        <User size={20} />
      </Link>
    );
  }

  // Logged in — show avatar + dropdown
  const avatar = getAvatar(user.profile?.avatar_id ?? 'avatar-01');
  const displayName = user.profile?.display_name || user.email || 'User';

  return (
    <div ref={menuRef} className="relative">
      <button
        id="user-menu-btn"
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-[#2563eb] transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Menu người dùng"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Image
          src={avatar.src}
          alt={avatar.label}
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in"
          role="menu"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Image
                src={avatar.src}
                alt={avatar.label}
                width={36}
                height={36}
                className="rounded-full"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <MenuLink
              href="/profile"
              icon={<Settings size={16} />}
              label="Hồ sơ & Cài đặt"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/profile?tab=likes"
              icon={<Heart size={16} />}
              label="Bài viết yêu thích"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/profile?tab=saved"
              icon={<Bookmark size={16} />}
              label="Đã lưu"
              onClick={() => setOpen(false)}
            />
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-1">
            <button
              id="user-logout-btn"
              onClick={async () => {
                setOpen(false);
                await logout();
                window.location.href = '/';
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              role="menuitem"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      role="menuitem"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
