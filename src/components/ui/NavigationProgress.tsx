"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A slim, animated progress bar at the top of the page that fires on
 * every client-side navigation. Inspired by NProgress / YouTube.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPath = useRef(pathname + searchParams.toString());

  const start = useCallback(() => {
    setVisible(true);
    setProgress(0);

    // Quick jump to ~30%, then slow trickle
    requestAnimationFrame(() => {
      setProgress(30);
    });

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (timerRef.current) clearInterval(timerRef.current);
          return prev;
        }
        // Decelerate as we approach 90
        const increment = Math.max(1, (90 - prev) * 0.08);
        return Math.min(prev + increment, 90);
      });
    }, 200);
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, []);

  useEffect(() => {
    const currentPath = pathname + searchParams.toString();
    if (currentPath !== prevPath.current) {
      finish();
      prevPath.current = currentPath;
    }
  }, [pathname, searchParams, finish]);

  // Intercept link clicks to start the progress bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        target.target === "_blank"
      )
        return;

      const currentPath = pathname + searchParams.toString();
      // Only start if navigating to a different path
      if (href !== currentPath && href !== pathname) {
        start();
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname, searchParams, start]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="nav-progress-bar"
      style={{
        transform: `scaleX(${progress / 100})`,
        opacity: visible ? 1 : 0,
      }}
    />
  );
}
