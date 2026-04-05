'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, ChevronDown, Clock, Newspaper } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import { stripMarkdown } from '@/lib/utils/stripMarkdown';
import { formatDate } from '@/lib/types/article';
import type { ArticleData } from '@/lib/types/article';

/**
 * Infinite "Load More" section at the bottom of the homepage.
 * Fetches paginated posts from /api/posts and renders them in a clean grid.
 */
export default function LoadMorePosts() {
  const [posts, setPosts] = useState<ArticleData[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalRemaining, setTotalRemaining] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || (!hasMore && initialized)) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/posts?page=${page}&limit=12`);
      const data = await res.json();

      if (data.posts && data.posts.length > 0) {
        setPosts(prev => [...prev, ...data.posts]);
        setPage(prev => prev + 1);
        setHasMore(data.hasMore);
        setTotalRemaining(data.total);
      } else {
        setHasMore(false);
      }
      setInitialized(true);
    } catch {
      console.error('Failed to load more posts');
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, initialized]);

  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Newspaper size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">
            Tất cả bài viết
          </h2>
          {totalRemaining !== null && (
            <p className="text-xs text-gray-500 mt-0.5">
              {posts.length} / {totalRemaining} bài viết
            </p>
          )}
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent ml-4"></div>
      </div>

      {/* Posts Grid */}
      {posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {posts.map((post, idx) => (
            <Link
              key={`more-${post.id}-${idx}`}
              href={`/article/${post.slug}`}
              className="group cursor-pointer bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <SafeImage
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold text-gray-800 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {post.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-[15px] font-bold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-[#2563eb] transition-colors">
                  {post.title}
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                  {stripMarkdown(post.excerpt)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-bold text-gray-600 uppercase tracking-wide">
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatDate(post.date)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More Button / End State */}
      <div className="flex justify-center">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={loading}
            className="group relative px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl font-semibold text-gray-700 hover:border-[#2563eb] hover:text-[#2563eb] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                <span>{initialized ? 'Tải thêm bài viết' : 'Xem thêm bài viết'}</span>
              </>
            )}

            {/* Subtle animated border effect on hover */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent, rgba(37,99,235,0.05), transparent)',
              }}
            />
          </button>
        ) : initialized ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <p className="text-sm text-gray-400 font-medium">
              Bạn đã xem hết tất cả bài viết 🎉
            </p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
