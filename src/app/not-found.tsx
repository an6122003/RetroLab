import Link from 'next/link';
import type { Metadata } from 'next';
import { Home, Search, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Decorative background — matches site gradient style */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fafbff] via-white to-blue-50/40" />
        <div className="absolute top-20 -left-32 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 -right-32 w-96 h-96 bg-indigo-200/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/10 to-purple-100/10 rounded-full blur-3xl" />
      </div>

      <div className="text-center max-w-lg relative z-10">
        {/* Glitch-style 404 */}
        <div className="relative mb-6 select-none">
          <div className="text-[160px] md:text-[200px] font-black leading-none tracking-tighter bg-gradient-to-b from-gray-200 to-gray-100 bg-clip-text text-transparent">
            404
          </div>
          {/* Accent line through the number */}
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#2563eb] to-transparent opacity-60" />
        </div>

        {/* Icon badge */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563eb] to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
          <Search size={24} className="text-white" />
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
          Không tìm thấy nội dung
        </h1>
        <p className="text-gray-500 mb-10 text-sm md:text-base leading-relaxed max-w-sm mx-auto">
          Trang bạn đang tìm kiếm có thể đã bị gỡ bỏ, đổi tên, hoặc tạm thời không khả dụng.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#2563eb] to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            <Home size={16} />
            Về trang chủ
          </Link>
          <Link
            href="/category/tin-tuc"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-700 text-sm font-bold rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all hover:shadow-sm active:scale-[0.98]"
          >
            Đọc tin mới nhất
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Suggested categories */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">Khám phá chuyên mục</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Tin tức', slug: 'tin-tuc' },
              { label: 'AI', slug: 'ai' },
              { label: 'Công Nghệ', slug: 'cong-nghe' },
              { label: 'IT', slug: 'it' },
              { label: 'Game & Giả Lập', slug: 'game-gia-lap' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-full hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] transition-all duration-200"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
