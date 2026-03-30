'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface YoutubeVideo {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
  channelName: string;
}

export default function YoutubeCarousel({ videos }: { videos: YoutubeVideo[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    updateScrollButtons();
    return () => el.removeEventListener('scroll', updateScrollButtons);
  }, [updateScrollButtons]);

  // Auto-scroll
  useEffect(() => {
    if (isPaused || videos.length <= 3) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      // If at end, scroll back to start
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, videos.length]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = dir === 'left' ? -320 : 320;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Scrollable Row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video) => {
          const dateObj = new Date(video.publishedAt);
          const formattedDate = dateObj.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          });

          return (
            <a
              key={video.id}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/card flex-shrink-0 w-[290px] flex flex-col bg-gray-900 p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="relative overflow-hidden rounded-md mb-3 aspect-[16/9] shrink-0">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover/card:scale-105 opacity-80 group-hover/card:opacity-100"
                  sizes="290px"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover/card:bg-[#ff0000] transition-colors">
                    <PlayCircle className="text-white" size={24} />
                  </div>
                </div>
              </div>
              <h3 className="text-[14px] font-bold leading-snug mb-1 text-white group-hover/card:text-red-400 transition-colors line-clamp-2">
                {video.title}
              </h3>
              <div className="text-[12px] text-gray-400 mt-auto pt-2 flex items-center gap-2">
                <span className="text-gray-300 font-medium truncate">{video.channelName}</span>
                <span>•</span>
                <span className="flex-shrink-0">{formattedDate}</span>
              </div>
            </a>
          );
        })}
      </div>

      {/* Fade edges */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-gray-950 to-transparent pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
