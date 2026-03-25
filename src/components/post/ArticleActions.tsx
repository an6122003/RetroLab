'use client';

import LikeButton from '@/components/post/LikeButton';
import SaveButton from '@/components/post/SaveButton';
import { Share2 } from 'lucide-react';
import { useState } from 'react';

interface ArticleActionsProps {
  postSlug: string;
}

/**
 * Floating action bar for article pages.
 * Contains Like, Save, and Share buttons.
 * Positioned between the article header and body.
 */
export default function ArticleActions({ postSlug }: ArticleActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // User cancelled or share API failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <LikeButton postSlug={postSlug} />
      <SaveButton postSlug={postSlug} />
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-all"
        title="Chia sẻ"
        aria-label="Chia sẻ bài viết"
      >
        <Share2 size={18} />
        <span className="text-sm font-semibold">{copied ? 'Đã copy!' : 'Chia sẻ'}</span>
      </button>
    </div>
  );
}
