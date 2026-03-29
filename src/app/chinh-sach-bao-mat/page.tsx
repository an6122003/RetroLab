import { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật | RetroLab',
  description: 'Chính sách bảo mật thông tin và dữ liệu người dùng tại nền tảng RetroLab.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white py-14 lg:py-16">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/15 blur-[100px]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm font-medium mb-5 border border-white/10">
            <Shield size={16} className="text-[#facc15]" />
            Quyền riêng tư của bạn
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-4">
            Chính sách bảo mật thông tin
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
            Không rườm rà, không đánh đố — bạn biết chính xác những gì xảy ra với dữ liệu của mình.
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <p className="text-lg text-gray-600 leading-relaxed mb-12">
            Tại <span className="font-semibold text-gray-900">RetroLab</span>, chúng mình đam mê công nghệ, nhưng chúng mình không hề hứng thú với việc lạm dụng dữ liệu cá nhân. Chính sách bảo mật này được viết bằng ngôn ngữ thông thường để bạn biết chính xác những gì xảy ra khi bạn lướt web và tạo tài khoản tại đây.
          </p>

          <article className="space-y-12">

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                1. Chúng mình thu thập những gì?
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Với độc giả vãng lai:</strong> Bạn có thể đọc tin tức thoải mái mà không cần tạo tài khoản. Chúng mình chỉ thu thập các thông số ẩn danh cơ bản thông qua các công cụ thống kê (như Google Analytics) để biết nội dung nào (IT, AI, Giả lập...) đang được quan tâm nhất.
                </p>
                <p>
                  <strong className="text-gray-900">Với thành viên đăng ký:</strong> Để sử dụng các tính năng nâng cao (Lưu bài viết, Thích, Bình luận), bạn cần tạo một tài khoản. Khi đó, hệ thống sẽ lưu trữ:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-gray-600">
                  <li>Tên hiển thị và Địa chỉ Email của bạn.</li>
                  <li>Mật khẩu (đã được mã hóa an toàn trên hệ thống).</li>
                  <li>Lịch sử tương tác: Các bài viết bạn đã lưu/thích và những bình luận bạn đã đăng tải.</li>
                  <li>Các tùy chọn cài đặt thông báo của bạn.</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                2. Dữ liệu của bạn được dùng để làm gì?
              </h2>
              <ul className="space-y-4 text-gray-600 leading-relaxed">
                <li>
                  <strong className="text-gray-900">Cá nhân hóa trải nghiệm:</strong> Giúp bạn quản lý thư viện bài viết yêu thích và lưu giữ các cuộc thảo luận của riêng mình.
                </li>
                <li>
                  <strong className="text-gray-900">Liên lạc & Thông báo:</strong> Dựa trên "Cài đặt tài khoản" của bạn, chúng mình có thể gửi email thông báo khi có bài viết mới, khi có người trả lời bình luận, hoặc gửi bản tin tổng hợp hàng tuần (Newsletter). Bạn có thể bật/tắt các thông báo này bất cứ lúc nào.
                </li>
                <li>
                  <strong className="text-gray-900">Cải thiện hệ thống:</strong> Những con số thống kê ẩn danh giúp chúng mình biết cộng đồng đang quan tâm đến chủ đề nào, từ đó tinh chỉnh thuật toán chắt lọc nội dung ngày một tốt hơn.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                3. Về Cookie và Bảo mật
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Cookie:</strong> RetroLab sử dụng cookie để "nhớ" trạng thái đăng nhập của bạn, giúp bạn không phải gõ lại email và mật khẩu mỗi lần truy cập. Chúng mình không dùng cookie để theo dõi chéo bạn sang các trang web khác.
                </p>
                <p>
                  <strong className="text-gray-900">Bảo mật:</strong> Mật khẩu của bạn được mã hóa một chiều. Ngay cả đội ngũ quản trị của RetroLab cũng không thể nhìn thấy mật khẩu gốc của bạn. Chúng mình cam kết <strong>tuyệt đối không</strong> bán, trao đổi hay chia sẻ dữ liệu người dùng cho bất kỳ bên thứ ba nào.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                4. Quyền kiểm soát hoàn toàn thuộc về bạn
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Tài khoản của bạn, quyền quyết định là của bạn. Bạn có thể:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 leading-relaxed">
                <li>Chỉnh sửa thông tin cá nhân và thay đổi mật khẩu trực tiếp trong mục "Cài đặt tài khoản".</li>
                <li>Tùy chỉnh việc nhận email thông báo một cách chủ động.</li>
                <li>
                  <strong className="text-gray-900">Tự động xóa tài khoản:</strong> Nếu không còn nhu cầu sử dụng, bạn có thể sử dụng tính năng "Xóa tài khoản" ngay trong phần Cài đặt. Ngay khi xác nhận, toàn bộ dữ liệu cá nhân, bình luận và lịch sử tương tác của bạn sẽ được xóa vĩnh viễn khỏi hệ thống của RetroLab.
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                5. Liên kết ra bên ngoài
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Trong mỗi bài viết, chúng mình luôn trích dẫn liên kết trỏ về nguồn bài gốc. Khi bạn click vào những liên kết này và rời khỏi RetroLab, bạn sẽ chịu sự chi phối bởi Chính sách bảo mật của trang web đó.
              </p>
            </section>

          </article>

          {/* Contact */}
          <div className="mt-14 p-8 bg-gray-50 rounded-2xl text-center border border-gray-100">
            <p className="text-gray-600 mb-2">Mọi thắc mắc về quyền riêng tư hoặc yêu cầu hỗ trợ tài khoản, bạn có thể liên hệ với chúng mình qua:</p>
            <a href="mailto:contact@retrolab.com.vn" className="text-xl font-bold text-[#2563eb] hover:underline">
              contact@retrolab.com.vn
            </a>
          </div>

        </div>
      </section>
    </div>
  );
}
