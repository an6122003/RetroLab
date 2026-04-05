'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, Newspaper } from 'lucide-react';
import type { ArticleData } from '@/lib/types/article';

const CYCLE_INTERVAL = 5000; // 5 seconds

export default function Ticker({ articles }: { articles: ArticleData[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  const count = articles.length;

  const goTo = useCallback((nextIndex: number, dir: 'up' | 'down') => {
    if (isTransitioning || count <= 1) return;
    setDirection(dir);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, count]);

  const goNext = useCallback(() => {
    goTo((currentIndex + 1) % count, 'down');
  }, [currentIndex, count, goTo]);

  const goPrev = useCallback(() => {
    goTo((currentIndex - 1 + count) % count, 'up');
  }, [currentIndex, count, goTo]);

  // Auto-cycle
  useEffect(() => {
    if (isPaused || count <= 1) return;
    const timer = setInterval(goNext, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, count, goNext]);

  if (!articles || articles.length === 0) return null;

  const article = articles[currentIndex];

  return (
    <div
      className="ticker-wrapper group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Accent bar on the left */}
      <div className="ticker-accent" />

      <div className="ticker-inner">
        {/* Label */}
        <div className="ticker-label">
          <Newspaper size={13} strokeWidth={2.5} />
          <span>Tin mới</span>
        </div>

        {/* Headline area */}
        <Link
          href={`/article/${article.slug}`}
          className="ticker-headline-link"
        >
          <span
            className={`ticker-category`}
          >
            {article.category}
          </span>
          <span
            className={`ticker-headline ${
              isTransitioning
                ? direction === 'down'
                  ? 'ticker-slide-out-up'
                  : 'ticker-slide-out-down'
                : 'ticker-slide-in'
            }`}
          >
            {article.title}
          </span>
        </Link>

        {/* Nav arrows + counter */}
        <div className="ticker-controls">
          <span className="ticker-counter">
            {currentIndex + 1}/{count}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); goPrev(); }}
            className="ticker-btn"
            aria-label="Previous news"
          >
            <ChevronUp size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); goNext(); }}
            className="ticker-btn"
            aria-label="Next news"
          >
            <ChevronDown size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!isPaused && count > 1 && (
        <div className="ticker-progress">
          <div
            className="ticker-progress-bar"
            key={currentIndex}
          />
        </div>
      )}
    </div>
  );
}
