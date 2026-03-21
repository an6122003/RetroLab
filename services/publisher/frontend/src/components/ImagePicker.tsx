import { useState } from 'react';

interface ImagePickerProps {
  originalImages: any[] | null;
  searchedImages: any[] | null;
  selectedImage: any;
  onChange: (img: any) => void;
  onInsertInBody?: (url: string, alt: string) => void;
}

function getImageList(originalImages: any[] | null, searchedImages: any[] | null): any[] {
  const imgs: any[] = [];

  if (originalImages && Array.isArray(originalImages)) {
    for (const img of originalImages) {
      if (typeof img === 'string') {
        imgs.push({ url: img, source: 'original' });
      } else if (img?.url) {
        imgs.push({ ...img, source: img.source || 'original' });
      }
    }
  }

  if (searchedImages && Array.isArray(searchedImages)) {
    for (const img of searchedImages) {
      if (typeof img === 'string') {
        imgs.push({ url: img, source: 'search' });
      } else if (img?.url) {
        imgs.push({ ...img, source: img.source || 'search' });
      }
    }
  }

  return imgs;
}

export default function ImagePicker({
  originalImages,
  searchedImages,
  selectedImage,
  onChange,
  onInsertInBody,
}: ImagePickerProps) {
  const images = getImageList(originalImages, searchedImages);
  const selectedUrl = selectedImage?.url || '';
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!images.length) {
    return (
      <div className="text-center py-4">
        <div className="text-2xl mb-1">🖼️</div>
        <p className="text-xs text-outline">No images available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          Hero Image
        </label>
        <span className="text-[9px] text-outline">{images.length} images</span>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {images.map((img, idx) => {
          const isSelected = img.url === selectedUrl;
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={img.url || idx}
              className="relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <button
                onClick={() => onChange(img)}
                className={`relative rounded-lg overflow-hidden aspect-video border-2 transition-all duration-200 group w-full ${
                  isSelected
                    ? 'border-accent-500 ring-2 ring-accent-500/30 shadow-lg shadow-accent-500/10'
                    : 'border-outline-variant/15 hover:border-outline'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt || `Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect fill="%231e293b" width="100" height="60"/><text fill="%2364748b" font-size="10" x="50%" y="50%" text-anchor="middle" dy="0.3em">Error</text></svg>';
                  }}
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-accent-500/20 flex items-center justify-center">
                    <div className="bg-accent-500 text-on-surface rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                      ✓
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                  <span className="text-[9px] text-on-surface/70 uppercase tracking-wider">
                    {img.source}
                  </span>
                </div>
              </button>

              {/* Insert into body button — shown on hover */}
              {isHovered && onInsertInBody && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInsertInBody(img.url, img.query_used || img.alt || '');
                  }}
                  className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded bg-surface-container-low/90 border border-outline-variant/15 text-[8px] text-primary hover:bg-surface-container-low0/20 transition-all"
                  title="Insert this image into article body"
                >
                  + Body
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
