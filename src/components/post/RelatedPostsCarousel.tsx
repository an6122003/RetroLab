"use client";

import { useState } from "react";
import SafeImage from "@/components/ui/SafeImage";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  category: string;
  author: string;
  date: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ITEMS_PER_PAGE = 6; // 2 rows × 3 columns

export default function RelatedPostsCarousel({ posts }: { posts: RelatedPost[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);
  
  if (posts.length === 0) return null;

  const startIdx = page * ITEMS_PER_PAGE;
  const visiblePosts = posts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const canGoBack = page > 0;
  const canGoForward = page < totalPages - 1;

  return (
    <div className="w-full bg-white/60 backdrop-blur-sm py-16 mt-8 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row with title + nav buttons */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-sans font-bold uppercase tracking-widest text-gray-800">
            You May Also Like
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              {/* Page indicator */}
              <span className="text-xs text-gray-400 font-semibold tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!canGoBack}
                aria-label="Previous suggestions"
                className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] transition-all duration-200 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canGoForward}
                aria-label="Next suggestions"
                className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] transition-all duration-200 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* 2-row × 3-col grid with page transition */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 transition-opacity duration-300"
          key={page}
          style={{ animation: "carousel-fade-in 0.35s ease-out" }}
        >
          {visiblePosts.map((post) => (
            <Link
              key={post.id}
              href={`/article/${post.slug}`}
              className="group cursor-pointer flex flex-col h-full"
            >
              <div className="relative overflow-hidden rounded-lg mb-4 aspect-[16/9]">
                <SafeImage
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {post.category}
                  </span>
                </div>
              </div>
              <h3 className="text-[18px] font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-2">
                {post.title}
              </h3>
              <div className="flex items-center text-[11px] text-gray-400 gap-2 uppercase tracking-wide mt-auto">
                <span>
                  By{" "}
                  <span className="font-bold text-gray-700">
                    {post.author.toUpperCase()}
                  </span>
                </span>
                <span>🕒 {formatDate(post.date)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
