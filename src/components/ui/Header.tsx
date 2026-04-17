"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import InlineSearch from '@/components/ui/InlineSearch';

const navItems = [
  { label: 'Tin tức', href: '/category/tin-tuc' },
  { label: 'AI', href: '/category/ai' },
  { label: 'Công Nghệ', href: '/category/cong-nghe' },
  { label: 'IT', href: '/category/it' },
  { label: 'Game & Giả Lập', href: '/category/game-gia-lap' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mobileMenuOpen, handleKeyDown]);

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 will-change-transform [backface-visibility:hidden]">
        {/* Mobile: relative container so logo can be absolute-centered.
            Desktop: flex row unchanged. */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] relative flex items-center justify-between md:justify-between">

          {/* Mobile Menu Button — left edge */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mở menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={22} className="text-gray-700" />
          </button>

          {/* Logo — absolute center on mobile, normal flow on desktop */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 cursor-pointer shrink-0 md:static md:translate-x-0"
          >
            <Image src="/logo.svg" alt="RetroLab Logo" width={150} height={32} className="h-7 sm:h-8 w-auto" priority />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 lg:gap-8 h-full items-center text-sm font-bold uppercase tracking-wider">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-all h-full flex items-center relative group whitespace-nowrap ${
                    isActive ? 'text-[#2563eb]' : 'text-gray-900 hover:text-[#2563eb]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2563eb] rounded-t-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions — right edge */}
          <div className="flex items-center gap-2 sm:gap-4">
            <InlineSearch />
            <UserMenu />
          </div>

        </div>
      </header>

      {/* Mobile Slide-Out Menu */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-white z-[70] shadow-2xl transition-transform duration-300 ease-out md:hidden flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
          <Link href="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
            <Image src="/logo.svg" alt="RetroLab Logo" width={120} height={26} className="h-6 w-auto" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Đóng menu"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="flex flex-col">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-6 py-3.5 text-[15px] font-semibold transition-all ${
                    isActive
                      ? 'text-[#2563eb] bg-blue-50/70 border-l-[3px] border-[#2563eb]'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Secondary links */}
          <div className="mt-6 pt-6 border-t border-gray-100 px-6">
            {/* Dark mode toggle (visual placeholder with click feedback) */}
            <DarkModeToggle />

            {/* Search bar in drawer */}
            <div className="flex items-center bg-gray-100 rounded-lg px-4 py-3 border border-gray-200 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 mr-2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                    setMobileMenuOpen(false);
                    window.location.href = `/search?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`;
                  }
                }}
              />
            </div>

            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 mt-6">Thêm</p>
            <div className="flex flex-col gap-1">
              <Link href="/gioi-thieu" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-500 py-2 hover:text-[#2563eb] transition-colors">
                Giới thiệu
              </Link>
              <Link href="/lien-he-quang-cao" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-500 py-2 hover:text-[#2563eb] transition-colors">
                Liên hệ quảng cáo
              </Link>
              <Link href="/chinh-sach-bao-mat" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-500 py-2 hover:text-[#2563eb] transition-colors">
                Chính sách bảo mật
              </Link>
            </div>
          </div>
        </nav>

        {/* Drawer Footer — Profile CTA */}
        <div className="shrink-0 border-t border-gray-100 p-6 bg-gray-50">
          <Link
            href="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full bg-[#2563eb] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Hồ sơ cá nhân
          </Link>
        </div>
      </div>
    </>
  );
}

function DarkModeToggle() {
  const [on, setOn] = useState(false);
  return (
    <div 
      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl mb-6 cursor-pointer select-none active:bg-gray-100 transition-colors"
      onClick={() => setOn(!on)}
      role="switch"
      aria-checked={on}
      aria-label="Chế độ tối"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </div>
        <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Chế độ tối</span>
      </div>
      <div className={`w-12 h-6 rounded-full relative p-0.5 transition-colors duration-200 ${on ? 'bg-[#2563eb]' : 'bg-gray-300'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
