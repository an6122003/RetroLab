'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, useCallback } from 'react';

const PLACEHOLDER_SRC = '/placeholder-article.svg';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  /** Optional custom placeholder src. Falls back to the default placeholder. */
  placeholderSrc?: string;
}

/**
 * A drop-in replacement for Next.js `Image` that shows a placeholder
 * when the source image fails to load. Handles both `fill` and
 * explicit width/height layout modes.
 */
export default function SafeImage({
  src,
  alt,
  placeholderSrc = PLACEHOLDER_SRC,
  ...rest
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(placeholderSrc);
    }
  }, [hasError, placeholderSrc]);

  // Reset error state when src changes (e.g. navigating to a new article)
  const effectiveSrc = src !== imgSrc && !hasError ? src : imgSrc;

  return (
    <Image
      {...rest}
      src={effectiveSrc}
      alt={alt}
      onError={handleError}
      // When showing placeholder, don't try to optimize an SVG
      {...(hasError ? { unoptimized: true } : {})}
    />
  );
}
