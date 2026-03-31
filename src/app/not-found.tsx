import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-gray-200 mb-4 select-none">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Không tìm thấy nội dung
        </h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên, hoặc tạm thời không khả dụng.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563eb] text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
        >
          ← Về trang chủ
        </Link>
      </div>
    </main>
  );
}
