import { Metadata } from 'next';
import Link from 'next/link';
import { Scale, ArrowRight, Cpu } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Giới thiệu | RetroLab',
  description:
    'RetroLab - Trạm tin tức tổng hợp đa nguồn từ IT, AI cho đến thế giới Game và Giả Lập.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white py-14 lg:py-16">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/15 blur-[100px]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm font-medium mb-5 border border-white/10">
            <Cpu size={16} className="text-[#facc15]" />
            Trạm tin tức tổng hợp đa nguồn
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-4">
            Giới thiệu{' '}
            <span className="text-[#2563eb]">Retro</span>
            <span className="text-[#facc15]">Lab</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
            Bắt trọn dòng chảy thông tin — từ IT, AI cho đến thế giới Game và Giả Lập.
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <article className="prose prose-lg max-w-none text-gray-600 space-y-6 leading-relaxed">
            <p>
              Mỗi ngày, thế giới công nghệ tạo ra hàng vạn tin tức mới. Từ một bản cập nhật AI chớp nhoáng, một framework vừa ra mắt, cho đến những trình giả lập console đang được cộng đồng bàn tán rôm rả. Nhưng để theo dõi hết luồng thông tin khổng lồ đó, bạn thường phải mở hàng chục tab trình duyệt và "bơi" trong vô số những bài viết dài lê thê.
            </p>

            <p className="text-xl font-bold text-gray-900">
              RetroLab được chúng mình tạo ra từ một nhu cầu rất thực tế của chính dân tech:{' '}
              <span className="text-[#2563eb]">Làm sao để đọc tin công nghệ nhanh hơn, sạch hơn và không bị nhiễu?</span>
            </p>

            <p>
              Chúng mình không hoạt động như một trang báo truyền thống. Thay vào đó, RetroLab giống như một "bộ lọc" thông minh. Hệ thống tự động quét và thu thập dữ liệu từ những nguồn công nghệ uy tín nhất toàn cầu. Sau đó, nhờ sức mạnh của các mô hình ngôn ngữ lớn (LLM), hàng ngàn trang tài liệu được chắt lọc, biên tập lại cho thật gãy gọn, loại bỏ hoàn toàn những chi tiết rườm rà hay tiêu đề câu view (clickbait).
            </p>

            <p>
              Nhưng bạn yên tâm, máy móc không làm hết tất cả đâu. Tại RetroLab, không có bất kỳ bài viết nào được tự động đăng tải 100% bởi AI. Mọi nội dung sau khi được LLM xử lý đều phải qua khâu đọc duyệt và tinh chỉnh cuối cùng từ chính con người. Chúng mình muốn đảm bảo mỗi bản tin bạn đọc không chỉ nhanh, gọn mà còn phải <strong className="text-gray-900">chuẩn xác</strong> và giữ được <strong className="text-gray-900">văn phong tự nhiên nhất</strong>.
            </p>
          </article>

          {/* Copyright callout */}
          <div className="mt-12 bg-gray-50 border border-gray-200 rounded-2xl p-8 md:p-10 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Tôn trọng bản quyền</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Vì là một trạm tổng hợp thông tin, chúng mình cực kỳ tôn trọng bản quyền và chất xám của những người sáng tạo gốc. RetroLab luôn ghi nhận và trích dẫn rõ ràng nguồn bài viết cùng tên tác giả trong mọi bản tin.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Nếu bạn là tác giả hoặc đại diện trang tin và không muốn nội dung của mình được tổng hợp tại đây, chỉ cần nhắn một tiếng. Chúng mình cam kết sẽ gỡ bỏ toàn bộ các bài viết liên quan ngay lập tức một cách vui vẻ và hợp tác nhất.
            </p>
          </div>

          {/* Closing paragraph */}
          <p className="mt-10 text-lg text-gray-600 leading-relaxed">
            Dù bạn là một lập trình viên đang tìm kiếm xu hướng IT mới, một người đam mê vọc vạch hệ thống, hay đơn giản là một game thủ muốn sống lại ký ức qua các hệ máy giả lập — RetroLab sẽ gói gọn tất cả vào một màn hình duy nhất cho bạn.
          </p>

        </div>
      </section>

      {/* ── CTA Footer ── */}
      <section className="bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <p className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
            Bắt trọn dòng chảy thông tin tại RetroLab.
          </p>
          <p className="text-blue-200 text-lg mb-8">
            Trạm tin tức tổng hợp đa nguồn từ IT, AI cho đến thế giới Game và Giả Lập.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#2563eb] font-bold rounded-full hover:bg-blue-50 transition-colors text-lg shadow-lg shadow-blue-900/30"
          >
            Khám phá ngay
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
