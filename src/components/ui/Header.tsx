"use client";

import Link from 'next/link';
import { Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import UserMenu from '@/components/auth/UserMenu';

const navItems = [
  { label: 'Tin tức', href: '/category/tin-tuc' },
  { label: 'AI', href: '/category/ai' },
  { label: 'Công Nghệ', href: '/category/cong-nghe' },
  { label: 'IT', href: '/category/it' },
  { label: 'Game & Giả Lập', href: '/category/game-gia-lap' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center relative">
            <div className="w-2 h-2 bg-[#facc15] rounded-full absolute top-1.5 right-1.5"></div>
          </div>
          <div className="text-xl font-black tracking-tighter flex items-center">
            <span className="text-gray-900">Retro</span>
            <span className="text-[#2563eb]">Lab</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex gap-8 h-full items-center text-sm font-bold uppercase tracking-wider">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-all h-full flex items-center relative group ${
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

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="hidden sm:flex items-center bg-gray-100 rounded-full px-4 py-2 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Search size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-gray-500">Tìm kiếm...</span>
          </Link>
          <UserMenu />
        </div>

      </div>
    </header>
  );
}
