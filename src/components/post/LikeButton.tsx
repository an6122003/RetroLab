'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { isPostLiked, likePost, unlikePost, getLikeCount } from '@/lib/services/likes.service';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  postSlug: string;
  /** Compact mode for article cards (icon only) */
  compact?: boolean;
}

export default function LikeButton({ postSlug, compact = false }: LikeButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [animating, setAnimating] = useState(false);

  const loadState = useCallback(async () => {
    // Always fetch count (public)
    const likeCount = await getLikeCount(postSlug);
    setCount(likeCount);

    // Check user's liked status if logged in
    if (user) {
      const isLiked = await isPostLiked(user.id, postSlug);
      setLiked(isLiked);
    }
  }, [postSlug, user]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleToggle = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Optimistic UI — update immediately, reconcile on error
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((prev) => wasLiked ? prev - 1 : prev + 1);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    try {
      if (wasLiked) {
        await unlikePost(user.id, postSlug);
      } else {
        await likePost(user.id, postSlug);
      }
    } catch {
      // Rollback on error
      setLiked(wasLiked);
      setCount((prev) => wasLiked ? prev + 1 : prev - 1);
    }
  };

  if (compact) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggle(); }}
        className={`flex items-center gap-1.5 text-sm transition-all ${
          liked
            ? 'text-[#ef4444]'
            : 'text-gray-400 hover:text-[#ef4444]'
        }`}
        title={liked ? 'Bỏ thích' : 'Thích'}
        aria-label={liked ? 'Bỏ thích' : 'Thích'}
      >
        <Heart
          size={16}
          className={`transition-transform ${animating ? 'scale-125' : 'scale-100'} ${liked ? 'fill-current' : ''}`}
        />
        {count > 0 && <span className="text-xs font-medium">{count}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${
        liked
          ? 'bg-red-50 border-red-200 text-[#ef4444]'
          : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-[#ef4444] hover:bg-red-50'
      }`}
      title={liked ? 'Bỏ thích' : 'Thích bài viết'}
      aria-label={liked ? 'Bỏ thích' : 'Thích bài viết'}
    >
      <Heart
        size={18}
        className={`transition-transform duration-200 ${animating ? 'scale-125' : 'scale-100'} ${liked ? 'fill-current' : ''}`}
      />
      <span className="text-sm font-semibold">{count > 0 ? count : 'Thích'}</span>
    </button>
  );
}
