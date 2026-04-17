'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Returns 'up' when the user is scrolling up or is near the top,
 * 'down' when scrolling down. Uses requestAnimationFrame throttling.
 *
 * @param threshold  Min pixels scrolled before direction changes (prevents noise). Default 8px.
 * @param topOffset  Always returns 'up' when scroll position < topOffset. Default 120px.
 */
export function useScrollDirection(threshold = 8, topOffset = 120) {
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const lastY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const y = window.scrollY;

      // Always show when near top
      if (y < topOffset) {
        setDirection('up');
        lastY.current = y;
        ticking.current = false;
        return;
      }

      const delta = y - lastY.current;
      if (Math.abs(delta) >= threshold) {
        setDirection(delta > 0 ? 'down' : 'up');
        lastY.current = y;
      }
      ticking.current = false;
    });
  }, [threshold, topOffset]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return direction;
}
