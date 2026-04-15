'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, useCallback, useEffect, useMemo } from 'react';

const PLACEHOLDER_SRC = '/placeholder-article.svg';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  /** Optional custom placeholder src. Falls back to the default placeholder. */
  placeholderSrc?: string;
  /** Single fallback image URL (convenience — added to the chain). */
  fallbackSrc?: string;
  /** Array of fallback image URLs to try in order before the placeholder. */
  fallbackSrcs?: string[];
}

/**
 * A drop-in replacement for Next.js `Image` that cascades through
 * multiple fallback images when the source fails to load.
 *
 * Cascade: src → fallbackSrcs[0] → fallbackSrcs[1] → … → placeholderSrc (SVG)
 *
 * Performance: zero cost on the happy path. Each failure triggers a single
 * re-render to try the next URL. No extra API/network calls beyond the
 * image itself.
 */
export default function SafeImage({
  src,
  alt,
  placeholderSrc = PLACEHOLDER_SRC,
  fallbackSrc,
  fallbackSrcs,
  ...rest
}: SafeImageProps) {
  // Build the full fallback chain: deduplicate & filter out the primary src
  const chain = useMemo(() => {
    const raw: string[] = [];
    if (fallbackSrc) raw.push(fallbackSrc);
    if (fallbackSrcs) raw.push(...fallbackSrcs);

    // Deduplicate, remove entries that match the primary src, and filter empties
    const primaryStr = typeof src === 'string' ? src : '';
    const seen = new Set<string>([primaryStr]);
    const unique: string[] = [];
    for (const url of raw) {
      if (url && !seen.has(url)) {
        seen.add(url);
        unique.push(url);
      }
    }
    return unique;
  }, [src, fallbackSrc, fallbackSrcs]);

  const [imgSrc, setImgSrc] = useState(src);
  // 0 = original, 1..chain.length = fallbacks, chain.length+1 = placeholder
  const [stage, setStage] = useState(0);

  // Reset when src prop changes (e.g. navigating to a new article)
  useEffect(() => {
    setImgSrc(src);
    setStage(0);
  }, [src]);

  const handleError = useCallback(() => {
    const nextStage = stage + 1;

    if (nextStage <= chain.length) {
      // Try the next fallback in the chain
      setStage(nextStage);
      setImgSrc(chain[nextStage - 1]);
    } else if (nextStage === chain.length + 1) {
      // All fallbacks exhausted — show placeholder
      setStage(nextStage);
      setImgSrc(placeholderSrc);
    }
    // If already at placeholder, do nothing (prevent infinite loop)
  }, [stage, chain, placeholderSrc]);

  const isPlaceholder = stage > chain.length;

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      // When showing placeholder SVG, don't try to optimize it
      {...(isPlaceholder ? { unoptimized: true } : {})}
    />
  );
}
