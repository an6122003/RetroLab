'use client';

import { useState, useEffect, useRef } from 'react';
import { Home, LayoutGrid, Search, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const categories = [
  { label: 'Tin tức', href: '/category/tin-tuc' },
  { label: 'AI', href: '/category/ai' },
  { label: 'Công Nghệ', href: '/category/cong-nghe' },
  { label: 'IT', href: '/category/it' },
  { label: 'Game & Giả Lập', href: '/category/game-gia-lap' },
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const scrollDir = useScrollDirection(10, 80);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === '/';
  const isCategory = pathname.startsWith('/category');
  const isSearch = pathname === '/search';
  const isProfile = pathname === '/profile';

  // Close popover on route change
  useEffect(() => {
    setCategoryOpen(false);
  }, [pathname]);

  // Close category popover when scrolling down
  useEffect(() => {
    if (scrollDir === 'down') setCategoryOpen(false);
  }, [scrollDir]);

  // Close on outside click
  useEffect(() => {
    if (!categoryOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [categoryOpen]);

  const hidden = scrollDir === 'down';

  return (
    <>
      {/* Category Selector Popover
          Always in the DOM — visibility driven by CSS transition so the
          exit animation runs before the element disappears.
          Open:   opacity-100  translate-y-0   pointer-events-auto
          Closed: opacity-0    translate-y-3   pointer-events-none  */}
      <div
        ref={popoverRef}
        className={`md:hidden fixed left-0 right-0 mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 z-[55] w-[calc(100vw-2rem)] max-w-[320px] py-2 will-change-transform transition-all duration-200 ease-in-out ${
          categoryOpen && !hidden
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
        style={{ bottom: `calc(60px + max(6px, env(safe-area-inset-bottom)))` }}
        aria-hidden={!categoryOpen}
      >
        <p className="px-4 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chọn chuyên mục</p>
        {categories.map((cat) => {
          const active = pathname === cat.href;
          return (
            <Link
              key={cat.href}
              href={cat.href}
              onClick={() => setCategoryOpen(false)}
              className={`flex items-center px-4 py-3 text-[15px] font-semibold transition-colors ${
                active
                  ? 'text-[#2563eb] bg-blue-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {active && <span className="w-1.5 h-1.5 bg-[#2563eb] rounded-full mr-3" />}
              {cat.label}
            </Link>
          );
        })}
      </div>


      {/* Bottom Navigation Bar */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 px-4 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-in-out will-change-transform ${
          hidden ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
        aria-label="Bottom navigation"
        aria-hidden={hidden}
      >
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${isHome ? 'text-[#2563eb]' : 'text-gray-400'}`}
        >
          {isHome && <span className="absolute -top-1.5 w-1 h-1 bg-[#2563eb] rounded-full" />}
          <Home size={22} strokeWidth={isHome ? 2.5 : 1.8} />
          <span className="text-[10px] font-bold uppercase tracking-tight">Home</span>
        </Link>

        {/* Chuyên mục — opens category popover */}
        <button
          onClick={() => setCategoryOpen(!categoryOpen)}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${isCategory || categoryOpen ? 'text-[#2563eb]' : 'text-gray-400'}`}
          aria-expanded={categoryOpen}
          aria-label="Chọn chuyên mục"
        >
          {isCategory && <span className="absolute -top-1.5 w-1 h-1 bg-[#2563eb] rounded-full" />}
          <LayoutGrid size={22} strokeWidth={isCategory || categoryOpen ? 2.5 : 1.8} />
          <span className="text-[10px] font-bold uppercase tracking-tight">Chuyên mục</span>
        </button>

        {/* Search */}
        <Link
          href="/search"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${isSearch ? 'text-[#2563eb]' : 'text-gray-400'}`}
        >
          {isSearch && <span className="absolute -top-1.5 w-1 h-1 bg-[#2563eb] rounded-full" />}
          <Search size={22} strokeWidth={isSearch ? 2.5 : 1.8} />
          <span className="text-[10px] font-bold uppercase tracking-tight">Tìm kiếm</span>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${isProfile ? 'text-[#2563eb]' : 'text-gray-400'}`}
        >
          {isProfile && <span className="absolute -top-1.5 w-1 h-1 bg-[#2563eb] rounded-full" />}
          <User size={22} strokeWidth={isProfile ? 2.5 : 1.8} />
          <span className="text-[10px] font-bold uppercase tracking-tight">Tài khoản</span>
        </Link>
      </nav>
    </>
  );
}
