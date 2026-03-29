'use client';

import LikeButton from '@/components/post/LikeButton';
import SaveButton from '@/components/post/SaveButton';
import { Share2, Link2, Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ArticleActionsProps {
  postSlug: string;
  postTitle: string;
}

/**
 * Build share URLs for each platform.
 * Facebook/LinkedIn: rely on OG tags (auto-populated once deployed to a public URL).
 * X/Telegram: support pre-filling text, so we include the article title + URL inline.
 */
function getShareLinks(url: string, title: string) {
  const shareText = `${title} | RetroLab`;

  return [
    {
      name: 'Facebook',
      color: '#1877F2',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'X',
      color: '#000000',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: 'LinkedIn',
      color: '#0A66C2',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      name: 'Telegram',
      color: '#0088CC',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
    },
  ];
}

export default function ArticleActions({ postSlug, postTitle }: ArticleActionsProps) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Get current URL on client only
  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  // Close popup on outside click
  useEffect(() => {
    if (!showShare) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowShare(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showShare]);

  // Close on Escape
  useEffect(() => {
    if (!showShare) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowShare(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showShare]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowShare(false);
    }, 1500);
  };

  const shareLinks = currentUrl ? getShareLinks(currentUrl, postTitle) : [];

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <LikeButton postSlug={postSlug} />
      <SaveButton postSlug={postSlug} />

      {/* Share button + popup */}
      <div className="relative" ref={popupRef}>
        <button
          onClick={() => setShowShare(!showShare)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${
            showShare
              ? 'border-blue-300 bg-blue-50 text-blue-600'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50'
          }`}
          title="Chia sẻ"
          aria-label="Chia sẻ bài viết"
        >
          <Share2 size={18} />
          <span className="text-sm font-semibold">Chia sẻ</span>
        </button>

        {/* Share popup */}
        {showShare && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">Chia sẻ bài viết</span>
              <button
                onClick={() => setShowShare(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Social channels grid — uses <a> tags for reliability */}
            <div className="grid grid-cols-4 gap-1 p-4">
              {shareLinks.map((ch) => (
                <a
                  key={ch.name}
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowShare(false)}
                  className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl hover:bg-gray-50 transition-colors group no-underline"
                  title={`Chia sẻ qua ${ch.name}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform group-hover:scale-110"
                    style={{ backgroundColor: ch.color }}
                  >
                    {ch.icon}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700 transition-colors">
                    {ch.name}
                  </span>
                </a>
              ))}
            </div>

            {/* Copy link */}
            <div className="px-4 pb-4">
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  copied
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Đã sao chép!
                  </>
                ) : (
                  <>
                    <Link2 size={16} />
                    Sao chép liên kết
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
