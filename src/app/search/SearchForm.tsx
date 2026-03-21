"use client";

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchForm({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nhập từ khóa tìm kiếm..." 
        className="w-full pl-14 pr-32 py-4 md:py-5 text-lg border-2 border-gray-300 rounded-full focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all shadow-sm"
      />
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
      <button 
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#2563eb] text-white px-6 py-2 md:py-3 rounded-full font-bold text-sm hover:bg-blue-700 transition-colors"
      >
        Tìm
      </button>
    </form>
  );
}
