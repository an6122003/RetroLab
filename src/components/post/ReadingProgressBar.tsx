'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ReadingProgressBarProps {
  /** Estimated total read time in minutes */
  estimatedMinutes?: number;
}

export default function ReadingProgressBar({ estimatedMinutes = 5 }: ReadingProgressBarProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(estimatedMinutes);
  const [isVisible, setIsVisible] = useState(false);
  const rafRef = useRef<number>(0);

  const handleScroll = useCallback(() => {
    // Cancel pending rAF to throttle updates
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      
      const progress = Math.min((window.scrollY / totalHeight) * 100, 100);
      setScrollProgress(progress);
      setIsVisible(window.scrollY > 80);

      // Update reading time left
      const remaining = Math.max(1, Math.ceil(estimatedMinutes * (1 - progress / 100)));
      setTimeLeft(remaining);
    });
  }, [estimatedMinutes]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  if (!isVisible) return null;

  return (
    <div className="md:hidden fixed top-16 sm:top-[72px] left-0 w-full h-1 bg-gray-100 z-50">
      <div 
        className="h-full bg-[#2563eb] transition-all duration-100 ease-out" 
        style={{ width: `${scrollProgress}%` }}
      />
      <div className="absolute top-2 right-4 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
        {scrollProgress >= 95 ? '✓ Done' : `${timeLeft} MIN LEFT`}
      </div>
    </div>
  );
}
