'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, CheckCircle2, Loader2, X, Shield, Bell, PartyPopper } from 'lucide-react';

interface CategorySubscribeButtonProps {
  categorySlug: string;
  categoryName: string;
  accentColor?: string;
  buttonText?: string;
}

export default function CategorySubscribeButton({
  categorySlug,
  categoryName,
  accentColor = '#2563eb',
  buttonText,
}: CategorySubscribeButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalPhase, setModalPhase] = useState<'form' | 'success'>('form');
  const [buttonSuccess, setButtonSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category: categorySlug }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Không thể đăng ký.');
        return;
      }

      // Show success phase inside modal
      setModalPhase('success');

      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowModal(false);
        setModalPhase('form');
        setButtonSuccess(true);
        setEmail('');
        // Reset button success after 5 seconds
        setTimeout(() => setButtonSuccess(false), 5000);
      }, 3000);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setModalPhase('form');
    setError('');
  };

  // After-modal success state on the button
  if (buttonSuccess) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold" style={{ color: accentColor }}>
        <CheckCircle2 size={16} className="animate-bounce" />
        <span>Đã đăng ký {categoryName}!</span>
      </div>
    );
  }

  const modal = showModal && mounted ? createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
      onClick={modalPhase === 'form' ? handleClose : undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {modalPhase === 'success' ? (
          /* ═══════════════════════════════════════════
             SUCCESS PHASE — Animated celebration
             ═══════════════════════════════════════════ */
          <div className="p-8 text-center">
            {/* Animated checkmark circle */}
            <div className="relative mx-auto mb-6 w-20 h-20">
              {/* Pulsing ring */}
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: accentColor }}
              />
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full opacity-10"
                style={{ backgroundColor: accentColor }}
              />
              {/* Inner circle with check */}
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <CheckCircle2 size={40} className="text-white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Celebration icon */}
            <div className="flex justify-center mb-3">
              <PartyPopper size={28} className="text-yellow-500 animate-bounce" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Đăng ký thành công!
            </h3>
            <p className="text-sm text-gray-500 mb-1">
              Bạn đã đăng ký nhận bản tin <span className="font-semibold" style={{ color: accentColor }}>{categoryName}</span>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              tại <span className="font-medium text-gray-700">{email}</span>
            </p>

            {/* Progress bar auto-close indicator */}
            <div className="w-48 mx-auto h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: accentColor,
                  animation: 'shrink 3s linear forwards',
                }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Tự động đóng...</p>

            {/* Keyframe for the progress bar */}
            <style>{`
              @keyframes shrink {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}</style>
          </div>
        ) : (
          /* ═══════════════════════════════════════════
             FORM PHASE — Email input + confirmation
             ═══════════════════════════════════════════ */
          <>
            {/* Header */}
            <div className="relative p-6 pb-4" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}>
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm">
                <Mail size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                Đăng ký bản tin {categoryName}
              </h3>
              <p className="text-white/80 text-sm">
                Nhận cập nhật mới nhất về {categoryName} qua email
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">
                  Email của bạn
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm text-gray-900 focus:outline-none transition-colors"
                  onFocus={(e) => (e.target.style.borderColor = accentColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${accentColor}15` }}>
                    <Bell size={14} style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Nội dung bản tin</p>
                    <p className="text-[11px] text-gray-500">
                      Tin tức, phân tích và đánh giá mới nhất về {categoryName} — gửi hàng tuần.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${accentColor}15` }}>
                    <Shield size={14} style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Quyền riêng tư</p>
                    <p className="text-[11px] text-gray-500">
                      Email của bạn không bao giờ được chia sẻ. Hủy đăng ký bất cứ lúc nào trong{' '}
                      <span className="font-medium" style={{ color: accentColor }}>Cài đặt tài khoản</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Bằng cách nhấn &quot;Xác nhận&quot;, bạn đồng ý nhận email bản tin từ RetroLab theo{' '}
                  <a href="/chinh-sach-bao-mat" className="font-medium hover:underline" style={{ color: accentColor }}>Chính sách bảo mật</a>{' '}
                  của chúng tôi.
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-xs mb-3 text-center">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 hover:brightness-110"
                style={{ backgroundColor: accentColor }}
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</>
                ) : (
                  <><CheckCircle2 size={14} /> Xác nhận đăng ký</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full text-white text-[10px] font-bold py-3 uppercase tracking-widest rounded-lg transition-all hover:brightness-110"
        style={{
          backgroundColor: accentColor,
          boxShadow: `0 10px 15px -3px ${accentColor}40`,
        }}
      >
        {buttonText || 'Đăng ký ngay'}
      </button>
      {modal}
    </>
  );
}
