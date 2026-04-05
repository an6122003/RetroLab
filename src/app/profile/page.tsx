'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { User, Heart, MessageSquare, Settings, LogOut,
  Clock, Trash2, Bookmark, Bell, Lock, Check, ExternalLink, AlertTriangle, Mail, Loader2, CalendarDays, CalendarClock, Newspaper, Brain, Monitor, Terminal, Gamepad2
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAvatar, AVATARS, type AvatarOption } from '@/constants/avatars';
import { getProfile, updateProfile, getUserSettings, updateUserSettings } from '@/lib/services/profile.service';
import { deleteUserAccountAction } from './actions';
import { getUserLikedSlugs } from '@/lib/services/likes.service';
import { getUserSavedSlugs, unsavePost } from '@/lib/services/saves.service';
import { unlikePost } from '@/lib/services/likes.service';
import type { Profile, UserSettings } from '@/lib/types/database';

type TabType = 'saved' | 'liked' | 'comments' | 'settings';

export default function ProfilePage() {
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get('tab') as TabType) || 'saved';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Edit states
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarId, setEditAvatarId] = useState('avatar-01');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [newsletter, setNewsletter] = useState(true);

  // Newsletter subscription from DB (via API)
  const [newsletterDbActive, setNewsletterDbActive] = useState(false);
  const [newsletterDbFrequency, setNewsletterDbFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [newsletterDbCategories, setNewsletterDbCategories] = useState<string[]>([]);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  // Post lists
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [likedSlugs, setLikedSlugs] = useState<string[]>([]);

  // UI states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!user) return;

    const [profileData, settingsData, saved, liked] = await Promise.all([
      getProfile(user.id),
      getUserSettings(user.id),
      getUserSavedSlugs(user.id),
      getUserLikedSlugs(user.id),
    ]);

    if (profileData) {
      setProfile(profileData);
      setEditName(profileData.display_name);
      setEditBio(profileData.bio || '');
      setEditAvatarId(profileData.avatar_id);
    }
    if (settingsData) {
      setSettings(settingsData);
      setEmailNotif(settingsData.email_notifications);
      setPushNotif(settingsData.push_notifications);
      setNewsletter(settingsData.newsletter_subscribed);
    }
    setSavedSlugs(saved);
    setLikedSlugs(liked);

    // Fetch newsletter DB status
    try {
      const nlRes = await fetch('/api/newsletter/status');
      const nlData = await nlRes.json();
      setNewsletterDbActive(nlData.subscribed || false);
      setNewsletterDbFrequency(nlData.frequency || 'weekly');
      setNewsletterDbCategories(nlData.categories || []);
    } catch {
      // Silently ignore
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    loadUserData();
  }, [user, authLoading, router, loadUserData]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await Promise.all([
        updateProfile(user.id, {
          display_name: editName,
          bio: editBio,
          avatar_id: editAvatarId,
        }),
        updateUserSettings(user.id, {
          email_notifications: emailNotif,
          push_notifications: pushNotif,
          newsletter_subscribed: newsletter,
        }),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      alert('Không thể lưu thay đổi. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNewsletter = async () => {
    if (!user?.email) return;
    setNewsletterLoading(true);
    try {
      const endpoint = newsletterDbActive
        ? '/api/newsletter/unsubscribe'
        : '/api/newsletter/subscribe';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, frequency: newsletterDbFrequency, categories: newsletterDbCategories.length > 0 ? newsletterDbCategories : ['general'] }),
      });
      if (res.ok) {
        setNewsletterDbActive(!newsletterDbActive);
      }
    } catch {
      alert('Không thể thay đổi trạng thái đăng ký.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleChangeFrequency = async (newFreq: 'daily' | 'weekly') => {
    if (!user?.email || !newsletterDbActive || newFreq === newsletterDbFrequency) return;
    setNewsletterLoading(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, frequency: newFreq, categories: newsletterDbCategories }),
      });
      if (res.ok) {
        setNewsletterDbFrequency(newFreq);
      }
    } catch {
      alert('Không thể thay đổi tần suất.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleToggleCategory = async (catSlug: string) => {
    if (!user?.email || !newsletterDbActive) return;
    setNewsletterLoading(true);
    const isCurrentlySubscribed = newsletterDbCategories.includes(catSlug);
    let updatedCats: string[];
    if (isCurrentlySubscribed) {
      updatedCats = newsletterDbCategories.filter(c => c !== catSlug);
      // Don't allow removing all categories
      if (updatedCats.length === 0) updatedCats = ['general'];
    } else {
      updatedCats = [...newsletterDbCategories, catSlug];
    }
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, frequency: newsletterDbFrequency, categories: updatedCats }),
      });
      if (res.ok) {
        setNewsletterDbCategories(updatedCats);
      }
    } catch {
      alert('Không thể cập nhật chủ đề.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleUnsave = async (slug: string) => {
    if (!user) return;
    await unsavePost(user.id, slug);
    setSavedSlugs((prev) => prev.filter((s) => s !== slug));
  };

  const handleUnlike = async (slug: string) => {
    if (!user) return;
    await unlikePost(user.id, slug);
    setLikedSlugs((prev) => prev.filter((s) => s !== slug));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      const res = await deleteUserAccountAction();
      if (res.success) {
        setShowDeleteConfirm(false);
        // Ngắt phiên đăng nhập & đẩy về trang chủ
        await logout();
        router.push('/');
      } else {
        alert(`Lỗi hệ thống: ${res.error}`);
        setShowDeleteConfirm(false);
      }
    } catch (err: any) {
      alert(`Đã xảy ra lỗi không mong muốn.`);
      setShowDeleteConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  // Loading state — only while auth is initializing
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4 shrink-0 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full skeleton-bone mb-4" />
            <div className="h-5 w-32 skeleton-bone rounded mb-2" />
            <div className="h-4 w-40 skeleton-bone rounded" />
          </div>
        </div>
        <div className="flex-1">
          <div className="h-8 w-48 skeleton-bone rounded mb-6" />
          <div className="space-y-4">
            <div className="h-32 skeleton-bone rounded-lg" />
            <div className="h-32 skeleton-bone rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Not logged in — redirect is happening via useEffect
  if (!user) return null;

  const currentAvatar = getAvatar(editAvatarId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
      {/* ═══════════════════════════════════════════
          Sidebar
          ═══════════════════════════════════════════ */}
      <div className="w-full md:w-1/4 shrink-0 flex flex-col gap-6">
        {/* User Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
              <Image
                src={currentAvatar.src}
                alt={currentAvatar.label}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-5 h-5 bg-green-500 border-[3px] border-white rounded-full absolute bottom-1 right-2 z-10 shadow-sm" title="Đang trực tuyến"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {profile?.display_name || user?.email || 'User'}
          </h2>
          <p className="text-sm text-gray-500 mb-2">{user?.email}</p>
          {profile?.created_at && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full mb-4">
              <Clock size={12} />
              <span>Thành viên từ {new Date(profile.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</span>
            </div>
          )}
          <div className="w-full flex justify-between text-sm border-t border-gray-100 pt-4 mt-2 px-2">
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-lg">{savedSlugs.length}</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Đã lưu</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-lg">{likedSlugs.length}</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Đã thích</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-lg">0</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Bình luận</span>
            </div>
          </div>
          
          <Link
            href={`/u/${user?.id}`}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-[#2563eb] text-sm font-semibold rounded-md hover:bg-blue-50 transition-colors border border-gray-100"
          >
            <ExternalLink size={16} />
            Xem hồ sơ công khai
          </Link>
        </div>

        {/* Navigation */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          <SidebarTab
            active={activeTab === 'saved'}
            onClick={() => setActiveTab('saved')}
            icon={<Bookmark size={18} className={activeTab === 'saved' ? 'fill-[#2563eb]' : ''} />}
            label="Bài viết đã lưu"
            activeColor="blue"
          />
          <SidebarTab
            active={activeTab === 'liked'}
            onClick={() => setActiveTab('liked')}
            icon={<Heart size={18} className={activeTab === 'liked' ? 'fill-[#ef4444]' : ''} />}
            label="Bài viết đã thích"
            activeColor="red"
          />
          <SidebarTab
            active={activeTab === 'comments'}
            onClick={() => setActiveTab('comments')}
            icon={<MessageSquare size={18} className={activeTab === 'comments' ? 'fill-[#2563eb]' : ''} />}
            label="Bình luận của tôi"
            activeColor="blue"
          />
          <SidebarTab
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Settings size={18} />}
            label="Cài đặt tài khoản"
            activeColor="blue"
          />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-6 py-4 text-red-500 hover:bg-red-50 font-medium text-sm text-left transition-colors border-t border-gray-100"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          Main Content
          ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col">

        {/* ── Saved Tab ── */}
        {activeTab === 'saved' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Bookmark className="text-[#2563eb]" size={24} fill="#2563eb" />
                Bài viết đã lưu
              </h1>
              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                {savedSlugs.length} bài viết
              </span>
            </div>
            {savedSlugs.length === 0 ? (
              <EmptyState
                icon={<Bookmark size={48} className="text-gray-300" />}
                message="Chưa có bài viết nào được lưu."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {savedSlugs.map((slug) => (
                  <PostCard
                    key={slug}
                    slug={slug}
                    actionIcon={<Trash2 size={18} />}
                    actionTitle="Bỏ lưu"
                    actionHoverClass="hover:text-red-500 hover:bg-red-50"
                    onAction={() => handleUnsave(slug)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Liked Tab ── */}
        {activeTab === 'liked' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Heart className="text-[#ef4444]" size={24} fill="#ef4444" />
                Bài viết đã thích
              </h1>
              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                {likedSlugs.length} bài viết
              </span>
            </div>
            {likedSlugs.length === 0 ? (
              <EmptyState
                icon={<Heart size={48} className="text-gray-300" />}
                message="Chưa có bài viết nào được thích."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {likedSlugs.map((slug) => (
                  <PostCard
                    key={slug}
                    slug={slug}
                    actionIcon={<Heart size={18} fill="currentColor" />}
                    actionTitle="Bỏ thích"
                    actionHoverClass="text-[#ef4444] hover:bg-red-50"
                    onAction={() => handleUnlike(slug)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Comments Tab ── */}
        {activeTab === 'comments' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="text-[#2563eb]" size={24} fill="#2563eb" />
                Bình luận của tôi
              </h1>
              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                0 bình luận
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Tính năng quản lý bình luận đang được phát triển.</p>
            </div>
          </>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Settings className="text-gray-700" size={24} />
                Cài đặt tài khoản
              </h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Profile Info Section */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={18} className="text-[#2563eb]" />
                  Thông tin cá nhân
                </h3>
                <div className="flex flex-col sm:flex-row gap-6 mb-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center relative border border-gray-200 overflow-hidden">
                      <Image
                        src={currentAvatar.src}
                        alt={currentAvatar.label}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="text-sm text-[#2563eb] font-medium hover:underline"
                    >
                      Thay đổi ảnh
                    </button>

                    {/* Avatar picker */}
                    {showAvatarPicker && (
                      <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                        {AVATARS.map((av: AvatarOption) => (
                          <button
                            key={av.id}
                            onClick={() => {
                              setEditAvatarId(av.id);
                              setShowAvatarPicker(false);
                            }}
                            className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                              editAvatarId === av.id
                                ? 'border-[#2563eb] ring-2 ring-blue-200'
                                : 'border-transparent hover:border-gray-300'
                            }`}
                            title={av.label}
                          >
                            <Image
                              src={av.src}
                              alt={av.label}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiểu sử</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Giới thiệu ngắn về bản thân..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Security Section */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock size={18} className="text-[#2563eb]" />
                  Bảo mật
                </h3>
                <div className="flex flex-col gap-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                    <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent" />
                  </div>
                </div>
              </div>

              {/* Notifications Section */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell size={18} className="text-[#2563eb]" />
                  Thông báo
                </h3>
                <div className="flex flex-col gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotif}
                      onChange={(e) => setEmailNotif(e.target.checked)}
                      className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]"
                    />
                    <span className="text-sm text-gray-700">Nhận email thông báo khi có bài viết mới từ tác giả yêu thích</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotif}
                      onChange={(e) => setPushNotif(e.target.checked)}
                      className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]"
                    />
                    <span className="text-sm text-gray-700">Nhận email khi có người trả lời bình luận của tôi</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                      className="w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]"
                    />
                    <span className="text-sm text-gray-700">Đăng ký nhận bản tin tổng hợp hàng tuần (Newsletter)</span>
                  </label>
                </div>
              </div>

              {/* Newsletter Subscription Section */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail size={18} className="text-[#2563eb]" />
                  Bản tin Email (Newsletter)
                </h3>

                {/* Main status card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      newsletterDbActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Mail size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {newsletterDbActive ? 'Đang nhận bản tin' : 'Chưa đăng ký bản tin'}
                        </p>
                        {newsletterDbActive && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {newsletterDbFrequency === 'daily' ? 'Hàng ngày' : 'Hàng tuần'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        {newsletterDbActive
                          ? `Bạn đang nhận email bản tin ${newsletterDbFrequency === 'daily' ? 'hàng ngày' : 'tổng hợp hàng tuần'} từ RetroLab.`
                          : 'Đăng ký để nhận bản tin công nghệ, đánh giá sản phẩm mới nhất và thủ thuật AI độc quyền.'
                        }
                      </p>

                      {/* Frequency picker */}
                      {newsletterDbActive && (
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => handleChangeFrequency('daily')}
                            disabled={newsletterLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 ${
                              newsletterDbFrequency === 'daily'
                                ? 'border-[#2563eb] bg-blue-50 text-[#2563eb]'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <CalendarDays size={13} />
                            Hàng ngày
                          </button>
                          <button
                            onClick={() => handleChangeFrequency('weekly')}
                            disabled={newsletterLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 ${
                              newsletterDbFrequency === 'weekly'
                                ? 'border-[#2563eb] bg-blue-50 text-[#2563eb]'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <CalendarClock size={13} />
                            Hàng tuần
                          </button>
                        </div>
                      )}

                      <button
                        onClick={handleToggleNewsletter}
                        disabled={newsletterLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
                          newsletterDbActive
                            ? 'text-red-600 bg-white border border-red-200 hover:bg-red-50'
                            : 'text-white bg-[#2563eb] hover:bg-blue-700'
                        }`}
                      >
                        {newsletterLoading ? (
                          <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</>
                        ) : newsletterDbActive ? (
                          'Hủy đăng ký bản tin'
                        ) : (
                          'Đăng ký nhận bản tin'
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category subscription management */}
                {newsletterDbActive && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <Newspaper size={14} className="text-[#2563eb]" />
                      Quản lý chủ đề đăng ký
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Chọn các chủ đề bạn muốn nhận bản tin. Bấm vào để bật/tắt.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { slug: 'general', name: 'Tổng hợp', icon: <Mail size={15} />, color: '#2563eb' },
                        { slug: 'tin-tuc', name: 'Tin tức', icon: <Newspaper size={15} />, color: '#dc2626' },
                        { slug: 'ai', name: 'AI', icon: <Brain size={15} />, color: '#6366f1' },
                        { slug: 'cong-nghe', name: 'Công Nghệ', icon: <Monitor size={15} />, color: '#2563eb' },
                        { slug: 'it', name: 'CNTT', icon: <Terminal size={15} />, color: '#10b981' },
                        { slug: 'game-gia-lap', name: 'Game', icon: <Gamepad2 size={15} />, color: '#8b5cf6' },
                      ].map((cat) => {
                        const isActive = newsletterDbCategories.includes(cat.slug);
                        return (
                          <button
                            key={cat.slug}
                            onClick={() => handleToggleCategory(cat.slug)}
                            disabled={newsletterLoading}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-left transition-all disabled:opacity-50 ${
                              isActive
                                ? 'border-current bg-opacity-10 shadow-sm'
                                : 'border-gray-200 text-gray-400 hover:border-gray-300'
                            }`}
                            style={isActive ? { color: cat.color, backgroundColor: `${cat.color}10`, borderColor: `${cat.color}40` } : {}}
                          >
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              isActive ? 'text-white' : 'bg-gray-100 text-gray-400'
                            }`}
                              style={isActive ? { backgroundColor: cat.color } : {}}
                            >
                              {cat.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${isActive ? '' : 'text-gray-600'}`}>{cat.name}</p>
                              <p className="text-[10px] text-gray-400">
                                {isActive ? 'Đang nhận' : 'Đã tắt'}
                              </p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isActive ? 'border-current' : 'border-gray-300'
                            }`}>
                              {isActive && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mr-auto">
                    <Check size={16} />
                    <span>Đã lưu thành công!</span>
                  </div>
                )}
                <button
                  onClick={() => loadUserData()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>

            {/* Danger Zone Section */}
            <div className="mt-8 bg-white border border-red-200 rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                  <Trash2 size={18} />
                  Hiểm họa: Xóa tài khoản
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Một khi bạn xóa tài khoản, toàn bộ dữ liệu hiển thị (bao gồm ảnh đại diện, tiểu sử, lượt thích, đã lưu, và bình luận) sẽ bị xóa sạch khỏi hệ thống RetroLab vĩnh viễn. Hành động này không thể hoàn tác.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Xóa toàn bộ dữ liệu và tài khoản
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Xóa tài khoản vĩnh viễn?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Bạn đang chuẩn bị xóa hoàn toàn tài khoản <span className="font-semibold text-gray-900">{profile?.display_name || user?.email}</span>. Tất cả dữ liệu của bạn bao gồm bài viết đã lưu, lượt thích, cài đặt, và thông tin cá nhân sẽ bị xóa sạch khỏi hệ thống. Hành động này tuyệt đối không thể hoàn tác.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? 'Đang xử lý...' : 'Vâng, xóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function SidebarTab({
  active,
  onClick,
  icon,
  label,
  activeColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor: 'blue' | 'red';
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 text-[#2563eb] border-l-4 border-[#2563eb]',
    },
    red: {
      bg: 'bg-red-50 text-[#ef4444] border-l-4 border-[#ef4444]',
    },
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-4 font-medium text-sm text-left transition-colors ${
        active
          ? colorMap[activeColor].bg
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Post card for saved/liked lists.
 * Fetches metadata from the Notion API on mount.
 * Falls back gracefully if the article was deleted.
 */
function PostCard({
  slug,
  actionIcon,
  actionTitle,
  actionHoverClass,
  onAction,
}: {
  slug: string;
  actionIcon: React.ReactNode;
  actionTitle: string;
  actionHoverClass: string;
  onAction: () => void;
}) {
  const [meta, setMeta] = useState<{ title: string; excerpt: string; coverImage: string; category: string } | null>(null);

  useEffect(() => {
    // Fetch article metadata from our API
    fetch(`/api/article-meta?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setMeta(data))
      .catch(() => setMeta(null));
  }, [slug]);

  return (
    <Link
      href={`/article/${slug}`}
      className="flex flex-col sm:flex-row gap-6 bg-white border border-gray-200 rounded-lg p-4 group cursor-pointer hover:shadow-md transition-shadow relative"
    >
      <div className="w-full sm:w-[240px] shrink-0 aspect-[16/9] rounded-md overflow-hidden bg-gray-100">
        {meta?.coverImage ? (
          <img
            src={meta.coverImage}
            alt={meta.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full skeleton-bone" />
        )}
      </div>
      <div className="flex flex-col justify-center flex-1 pr-8">
        <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest mb-2">
          {meta?.category || '...'}
        </span>
        <h3 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-2">
          {meta?.title || (
            <span className="inline-block h-5 w-64 skeleton-bone rounded" />
          )}
        </h3>
        <p className="text-gray-600 text-[14px] leading-relaxed line-clamp-2 mb-3">
          {meta?.excerpt || ''}
        </p>
        <div className="flex items-center text-[12px] text-gray-400 gap-1 mt-auto">
          <Clock size={12} /> {slug}
        </div>
      </div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction(); }}
        className={`absolute top-4 right-4 p-2 text-gray-400 rounded-full transition-colors ${actionHoverClass}`}
        title={actionTitle}
      >
        {actionIcon}
      </button>
    </Link>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
      <div className="mx-auto mb-4">{icon}</div>
      <p>{message}</p>
    </div>
  );
}
