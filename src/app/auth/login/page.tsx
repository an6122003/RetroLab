'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import { signInWithOAuth, signInWithEmail, signUpWithEmail } from '@/lib/services/auth.service';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [animating, setAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');

  const switchMode = (newMode: Mode) => {
    if (newMode === mode || animating) return;
    setSlideDir(newMode === 'signup' ? 'left' : 'right');
    setAnimating(true);

    // Short delay to let exit animation play
    setTimeout(() => {
      setMode(newMode);
      setError('');
      setSuccess('');
      // Re-trigger enter animation
      requestAnimationFrame(() => {
        setAnimating(false);
      });
    }, 200);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError('');
    setLoading(true);
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        window.location.href = '/';
      } else {
        await signUpWithEmail(email, password);
        setSuccess('Kiểm tra email để xác nhận tài khoản!');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 -right-32 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/10 to-purple-100/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Về trang chủ</span>
        </Link>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 overflow-hidden">
          {/* Mode tabs */}
          <div className="flex border-b border-gray-100 relative">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors relative z-10 ${
                mode === 'login'
                  ? 'text-[#2563eb]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors relative z-10 ${
                mode === 'signup'
                  ? 'text-[#2563eb]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Tạo tài khoản
            </button>
            {/* Animated underline indicator */}
            <div
              className="absolute bottom-0 h-0.5 bg-[#2563eb] transition-all duration-300 ease-out"
              style={{
                left: mode === 'login' ? '0%' : '50%',
                width: '50%',
              }}
            />
          </div>

          {/* Animated content area */}
          <div className="relative overflow-hidden">
            <div
              className="transition-all duration-300 ease-out"
              style={{
                opacity: animating ? 0 : 1,
                transform: animating
                  ? `translateX(${slideDir === 'left' ? '-20px' : '20px'})`
                  : 'translateX(0)',
              }}
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563eb] to-indigo-600 flex items-center justify-center mx-auto mb-4 relative shadow-lg shadow-blue-500/20">
                  <div className="w-3 h-3 bg-[#facc15] rounded-full absolute -top-0.5 -right-0.5 ring-2 ring-white" />
                  <Mail size={24} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-gray-900">
                  {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
                </h1>
                <p className="text-sm text-gray-500 mt-1.5">
                  {mode === 'login'
                    ? 'Đăng nhập để lưu bài viết yêu thích'
                    : 'Tham gia cộng đồng công nghệ RetroLab'}
                </p>
              </div>

              <div className="px-8 pb-8">
                {/* OAuth buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    id="login-google-btn"
                    onClick={() => handleOAuth('google')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-sm font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm hover:border-gray-300 active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Tiếp tục với Google</span>
                  </button>

                  <button
                    id="login-github-btn"
                    onClick={() => handleOAuth('github')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-sm font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm hover:border-gray-300 active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>Tiếp tục với GitHub</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">hoặc</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#2563eb] focus:bg-white transition-all"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#2563eb] focus:bg-white transition-all"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {mode === 'signup' && (
                      <p className="text-xs text-gray-400 mt-1.5">Tối thiểu 6 ký tự</p>
                    )}
                  </div>

                  {/* Error / Success messages */}
                  {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2 animate-shake">
                      <span className="shrink-0 mt-0.5">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">✅</span>
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    id="login-email-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563eb] to-indigo-600 text-white text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang xử lý...
                      </span>
                    ) : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                  </button>
                </form>

                {/* Toggle mode link */}
                <p className="text-center text-sm text-gray-500 mt-6">
                  {mode === 'login' ? (
                    <>
                      Chưa có tài khoản?{' '}
                      <button
                        onClick={() => switchMode('signup')}
                        className="text-[#2563eb] font-semibold hover:underline transition-colors"
                      >
                        Đăng ký ngay
                      </button>
                    </>
                  ) : (
                    <>
                      Đã có tài khoản?{' '}
                      <button
                        onClick={() => switchMode('login')}
                        className="text-[#2563eb] font-semibold hover:underline transition-colors"
                      >
                        Đăng nhập
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Bằng việc đăng nhập, bạn đồng ý với{' '}
          <Link href="/dieu-khoan-su-dung" className="text-gray-500 hover:text-[#2563eb] underline transition-colors">
            Điều khoản sử dụng
          </Link>{' '}
          và{' '}
          <Link href="/chinh-sach-bao-mat" className="text-gray-500 hover:text-[#2563eb] underline transition-colors">
            Chính sách bảo mật
          </Link>
        </p>
      </div>

      {/* shake animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-4px); }
          30% { transform: translateX(4px); }
          45% { transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>
    </main>
  );
}
