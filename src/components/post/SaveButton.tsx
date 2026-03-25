'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { isPostSaved, savePost, unsavePost } from '@/lib/services/saves.service';
import { useRouter } from 'next/navigation';

interface SaveButtonProps {
  postSlug: string;
  /** Compact mode for article cards */
  compact?: boolean;
}

export default function SaveButton({ postSlug, compact = false }: SaveButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [animating, setAnimating] = useState(false);

  const loadState = useCallback(async () => {
    if (!user) return;
    const isSaved = await isPostSaved(user.id, postSlug);
    setSaved(isSaved);
  }, [postSlug, user]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleToggle = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Optimistic UI
    const wasSaved = saved;
    setSaved(!wasSaved);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    try {
      if (wasSaved) {
        await unsavePost(user.id, postSlug);
      } else {
        await savePost(user.id, postSlug);
      }
    } catch {
      // Rollback on error
      setSaved(wasSaved);
    }
  };

  if (compact) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggle(); }}
        className={`flex items-center transition-all ${
          saved
            ? 'text-[#2563eb]'
            : 'text-gray-400 hover:text-[#2563eb]'
        }`}
        title={saved ? 'Bỏ lưu' : 'Lưu bài viết'}
        aria-label={saved ? 'Bỏ lưu' : 'Lưu bài viết'}
      >
        <Bookmark
          size={16}
          className={`transition-transform ${animating ? 'scale-125' : 'scale-100'} ${saved ? 'fill-current' : ''}`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${
        saved
          ? 'bg-blue-50 border-blue-200 text-[#2563eb]'
          : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:text-[#2563eb] hover:bg-blue-50'
      }`}
      title={saved ? 'Bỏ lưu' : 'Lưu bài viết'}
      aria-label={saved ? 'Bỏ lưu' : 'Lưu bài viết'}
    >
      <Bookmark
        size={18}
        className={`transition-transform duration-200 ${animating ? 'scale-125' : 'scale-100'} ${saved ? 'fill-current' : ''}`}
      />
      <span className="text-sm font-semibold">{saved ? 'Đã lưu' : 'Lưu'}</span>
    </button>
  );
}
