'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SafeImage from './SafeImage';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  coverImage: string;
}

export default function InlineSearch() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Animated close helper
  const handleClose = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 150);
  }, [open, closing]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, handleClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleClose();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`hidden sm:flex items-center bg-gray-100 rounded-full px-4 py-2 border transition-colors ${
          open ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <Search size={16} className="text-gray-500 mr-2" />
        <span className="text-sm text-gray-500">Tìm kiếm...</span>
      </button>

      {/* Mobile: simple link */}
      <Link
        href="/search"
        className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 border border-gray-200"
      >
        <Search size={16} className="text-gray-500" />
      </Link>

      {/* Desktop inline search dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-150 ${closing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose} />

          {/* Search panel */}
          <div className={`absolute right-0 top-full mt-2 w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden transition-all duration-150 ${closing ? 'opacity-0 scale-95 translate-y-1' : 'animate-fade-in'}`}>
            {/* Search input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Tìm kiếm bài viết..."
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                autoComplete="off"
              />
              {loading && <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />}
              {query && !loading && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); }}
                  className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {/* Loading skeleton */}
              {loading && results.length === 0 && (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-16 h-12 rounded-lg bg-gray-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results list */}
              {results.length > 0 && (
                <div className="py-1">
                  {results.map((post) => (
                    <Link
                      key={post.id}
                      href={`/article/${post.slug}`}
                      onClick={handleClose}
                      className="flex gap-3 px-4 py-3 hover:bg-blue-50/50 transition-colors group"
                    >
                      <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-100 relative">
                        <SafeImage
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span className="text-blue-600 font-bold uppercase tracking-wider">{post.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* No results */}
              {searched && !loading && results.length === 0 && query.trim().length >= 2 && (
                <div className="py-10 text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm text-gray-500 font-medium">Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-1">Thử từ khóa khác hoặc ngắn hơn</p>
                </div>
              )}

              {/* Empty state — before typing */}
              {!searched && !loading && query.length < 2 && (
                <div className="py-8 text-center">
                  <div className="text-3xl mb-2">⌨️</div>
                  <p className="text-sm text-gray-500 font-medium">Nhập từ khóa để tìm kiếm</p>
                  <p className="text-xs text-gray-400 mt-1">Tối thiểu 2 ký tự</p>
                </div>
              )}
            </div>

            {/* Footer — "View all results" */}
            {query.trim().length >= 2 && (
              <div className="border-t border-gray-100 px-4 py-2.5">
                <button
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-50 hover:bg-blue-50 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Xem tất cả kết quả
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
