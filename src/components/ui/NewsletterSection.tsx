"use client";

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, X, CheckCircle2, Shield, Bell, Loader2, CalendarDays, CalendarClock, PartyPopper } from 'lucide-react';

type Frequency = 'daily' | 'weekly';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [showModal, setShowModal] = useState(false);
  const [modalPhase, setModalPhase] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setError('');
    setShowModal(true);
    setModalPhase('form');
  };

  const handleConfirmSubscribe = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, frequency }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đã xảy ra lỗi. Vui lòng thử lại.');
        return;
      }

      // Show success phase in modal
      setModalPhase('success');

      // Auto-close after 3s
      setTimeout(() => {
        setShowModal(false);
        setModalPhase('form');
        setShowSuccess(true);
        setEmail('');
        setTimeout(() => setShowSuccess(false), 5000);
      }, 3000);
    } catch {
      setError('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (modalPhase === 'success') return; // don't close during celebration
    setShowModal(false);
    setModalPhase('form');
    setError('');
  };

  const frequencyLabel = frequency === 'daily' ? 'hàng ngày' : 'hàng tuần';

  return (
    <>
      <div className="bg-[#2563eb] rounded-lg p-8 md:p-10 text-center flex flex-col items-center shadow-xl mb-12 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-[#facc15] rounded-lg flex items-center justify-center mb-4 shadow-lg">
            <Mail size={24} className="text-[#2563eb]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Đừng bỏ lỡ bất kỳ cập nhật nào
          </h2>
          <p className="text-blue-100 text-base max-w-2xl mb-6">
            Nhận bản tin công nghệ, đánh giá sản phẩm mới nhất và các thủ thuật AI độc quyền trực tiếp vào hộp thư của bạn.
          </p>

          {showSuccess ? (
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm text-white px-6 py-4 rounded-full animate-fade-in">
              <CheckCircle2 size={24} className="text-[#facc15]" />
              <span className="font-semibold">Đăng ký thành công! Kiểm tra hộp thư của bạn.</span>
            </div>
          ) : (
            <form className="w-full max-w-md flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="Email của bạn..."
                className="flex-grow px-5 py-3 rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-400"
                required
              />
              <button
                type="submit"
                className="bg-[#facc15] text-gray-900 font-bold px-6 py-3 rounded-full hover:bg-yellow-500 transition-colors whitespace-nowrap"
              >
                Đăng ký ngay
              </button>
            </form>
          )}

          {error && !showModal && (
            <p className="text-red-200 text-sm mt-3 animate-fade-in">{error}</p>
          )}

          <p className="text-blue-200 text-xs mt-4 italic">
            Chúng tôi tôn trọng quyền riêng tư của bạn. Không bao giờ spam.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          Confirmation Modal (via Portal)
          ═══════════════════════════════════════════ */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in"
          style={{ zIndex: 99999 }}
          onClick={handleClose}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>

            {modalPhase === 'success' ? (
              /* ═══ SUCCESS CELEBRATION ═══ */
              <div className="p-10 text-center">
                {/* Animated checkmark */}
                <div className="relative mx-auto mb-6 w-24 h-24">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#2563eb]" />
                  <div className="absolute inset-0 rounded-full opacity-10 bg-[#2563eb]" />
                  <div className="relative w-24 h-24 rounded-full bg-[#2563eb] flex items-center justify-center">
                    <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="flex justify-center mb-3">
                  <PartyPopper size={32} className="text-yellow-500 animate-bounce" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Đăng ký thành công! 🎉
                </h3>
                <p className="text-sm text-gray-500 mb-1">
                  Bạn sẽ nhận bản tin <span className="font-semibold text-[#2563eb]">{frequencyLabel}</span> tại
                </p>
                <p className="text-base font-semibold text-gray-800 mb-5">
                  {email}
                </p>

                {/* Auto-close progress bar */}
                <div className="w-48 mx-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2563eb]"
                    style={{ animation: 'shrinkBar 3s linear forwards' }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Tự động đóng...</p>

                <style>{`
                  @keyframes shrinkBar {
                    from { width: 100%; }
                    to { width: 0%; }
                  }
                `}</style>
              </div>
            ) : (
              /* ═══ FORM PHASE ═══ */
              <>
                {/* Modal Header */}
                <div className="relative bg-gradient-to-r from-[#2563eb] to-[#4f46e5] p-6 pb-8">
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    aria-label="Đóng"
                  >
                    <X size={20} />
                  </button>
                  <div className="w-12 h-12 bg-[#facc15] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <Mail size={24} className="text-[#2563eb]" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    Xác nhận đăng ký bản tin
                  </h3>
                  <p className="text-blue-200 text-sm">
                    Bạn đang đăng ký bản tin với email:
                  </p>
                  <p className="text-white font-semibold mt-1 bg-white/10 px-4 py-2 rounded-lg inline-block">
                    {email}
                  </p>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  {/* Frequency Selection */}
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    Chọn tần suất nhận bản tin:
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => setFrequency('daily')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        frequency === 'daily'
                          ? 'border-[#2563eb] bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        frequency === 'daily' ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <CalendarDays size={20} />
                      </div>
                      <span className={`text-sm font-bold ${frequency === 'daily' ? 'text-[#2563eb]' : 'text-gray-700'}`}>
                        Hàng ngày
                      </span>
                      <span className="text-[11px] text-gray-500 text-center leading-tight">
                        Tin mới mỗi sáng
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFrequency('weekly')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        frequency === 'weekly'
                          ? 'border-[#2563eb] bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        frequency === 'weekly' ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <CalendarClock size={20} />
                      </div>
                      <span className={`text-sm font-bold ${frequency === 'weekly' ? 'text-[#2563eb]' : 'text-gray-700'}`}>
                        Hàng tuần
                      </span>
                      <span className="text-[11px] text-gray-500 text-center leading-tight">
                        Tổng hợp cuối tuần
                      </span>
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    Khi đăng ký, bạn sẽ nhận được:
                  </h4>

                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell size={16} className="text-[#2563eb]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Bản tin {frequencyLabel}
                        </p>
                        <p className="text-xs text-gray-500">
                          {frequency === 'daily'
                            ? 'Tin tức công nghệ, AI và sản phẩm nổi bật mới nhất mỗi sáng.'
                            : 'Tổng hợp tin tức công nghệ, AI, và đánh giá sản phẩm nổi bật nhất trong tuần.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Shield size={16} className="text-[#2563eb]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Bảo vệ quyền riêng tư</p>
                        <p className="text-xs text-gray-500">
                          Email của bạn không bao giờ được chia sẻ với bên thứ ba. Bạn có thể hủy đăng ký hoặc đổi tần suất bất cứ lúc nào trong{' '}
                          <span className="font-medium text-[#2563eb]">Cài đặt tài khoản</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Consent */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Bằng cách nhấn &quot;Xác nhận đăng ký&quot;, bạn đồng ý nhận email bản tin {frequencyLabel} từ RetroLab theo{' '}
                      <a href="/chinh-sach-bao-mat" className="text-[#2563eb] hover:underline font-medium">Chính sách bảo mật</a>{' '}
                      và{' '}
                      <a href="/dieu-khoan-su-dung" className="text-[#2563eb] hover:underline font-medium">Điều khoản sử dụng</a>{' '}
                      của chúng tôi. Bạn có thể hủy đăng ký bất cứ lúc nào.
                    </p>
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm mb-4 text-center animate-fade-in">{error}</p>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmSubscribe}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-[#2563eb] rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Xác nhận đăng ký
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
