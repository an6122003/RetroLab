'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bookmark, Heart, Share2, X, Check, Link2, Facebook, ChevronUp } from 'lucide-react';
import { useScrollDirection } from '@/hooks/useScrollDirection';

interface FloatingArticleBarProps {
  postSlug: string;
  postTitle: string;
}

export default function FloatingArticleBar({ postSlug, postTitle }: FloatingArticleBarProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [hasScrolledEnough, setHasScrolledEnough] = useState(false);
  const rafRef = useRef<number>(0);

  // Shared scroll direction — same logic as BottomNavigation
  const scrollDir = useScrollDirection(10, 80);
  const hidden = scrollDir === 'down';

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  // Track whether we have scrolled enough to show the bar at all
  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setHasScrolledEnough(window.scrollY > 300);
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  // Close share sheet when scrolling down
  useEffect(() => {
    if (hidden) setIsShareOpen(false);
  }, [hidden]);

  // Lock body scroll when share sheet is open
  useEffect(() => {
    document.body.style.overflow = isShareOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isShareOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
    } catch {
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsShareOpen(false);
    }, 1500);
  };

  const shareText = `${postTitle} | RetroLab`;
  const shareLinks = [
    {
      name: 'Facebook',
      color: 'bg-[#1877f2]',
      icon: <Facebook size={24} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Twitter',
      color: 'bg-[#1da1f2]',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`,
    },
    {
      name: 'Messenger',
      color: 'bg-[#0084ff]',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.82 1.356 5.34 3.474 7.02V22l3.179-1.752A10.7 10.7 0 0 0 12 20.517c5.523 0 10-4.144 10-9.258S17.523 2 12 2zm1.057 12.461-2.557-2.726-4.983 2.726 5.482-5.816 2.62 2.726 4.92-2.726-5.482 5.816z"/>
        </svg>
      ),
      href: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(currentUrl)}&redirect_uri=${encodeURIComponent(currentUrl)}`,
    },
    {
      name: 'Copy Link',
      color: copied ? 'bg-green-500' : 'bg-gray-800',
      icon: copied ? <Check size={24} /> : <Link2 size={24} />,
      href: '',
    },
  ];

  // Base position: above the bottom nav bar (~60px tall) with an 8px gap.
  const barBase = 'bottom-[76px]';

  if (!hasScrolledEnough) return null;

  return (
    <>
      {/* ── Floating Action Pill ──
          Centering via `left-0 right-0 mx-auto w-fit` (margin-based) so
          the transition-transform on the wrapper doesn't conflict with
          a translateX(-50%) — that bug caused the teleport-from-right glitch. */}
      <div
        className={`md:hidden fixed ${barBase} left-0 right-0 mx-auto w-fit z-40 will-change-transform transition-all duration-300 ease-in-out ${
          hidden ? 'translate-y-[200%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-6 py-3 shadow-xl">
          {/* Bookmark */}
          <button
            className="text-gray-600 hover:text-[#2563eb] transition-colors active:scale-90"
            aria-label="Lưu bài viết"
          >
            <Bookmark size={20} />
          </button>
          <div className="w-px h-4 bg-gray-300" />
          {/* Like */}
          <button
            onClick={() => setLiked(!liked)}
            className={`transition-all active:scale-90 ${
              liked ? 'text-red-500 scale-110' : 'text-gray-600 hover:text-red-400'
            }`}
            aria-label={liked ? 'Bỏ thích' : 'Thích bài viết'}
            aria-pressed={liked}
          >
            <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <div className="w-px h-4 bg-gray-300" />
          {/* Share */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="text-gray-600 hover:text-[#2563eb] transition-colors active:scale-90"
            aria-label="Chia sẻ"
          >
            <Share2 size={20} />
          </button>
          <div className="w-px h-4 bg-gray-300" />
          {/* Back to top — inline with the pill */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-gray-600 hover:text-[#2563eb] transition-colors active:scale-90"
            aria-label="Quay lại đầu trang"
          >
            <ChevronUp size={20} />
          </button>
        </div>
      </div>

      {/* ── Share Drawer (Bottom Sheet) ── */}
      {isShareOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setIsShareOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] p-8 pb-12 animate-slide-up">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">Chia sẻ bài viết</h3>
              <button
                onClick={() => setIsShareOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {shareLinks.map((ch) =>
                ch.href ? (
                  <a
                    key={ch.name}
                    href={ch.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsShareOpen(false)}
                    className="flex flex-col items-center gap-2 cursor-pointer group no-underline"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${ch.color} text-white flex items-center justify-center shadow-lg group-active:scale-95 transition-transform`}>
                      {ch.icon}
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">{ch.name}</span>
                  </a>
                ) : (
                  <button
                    key={ch.name}
                    onClick={handleCopy}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${ch.color} text-white flex items-center justify-center shadow-lg group-active:scale-95 transition-transform`}>
                      {ch.icon}
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tighter">
                      {copied ? 'Đã copy!' : ch.name}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
