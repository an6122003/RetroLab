import { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng | RetroLab',
  description: 'Điều khoản sử dụng dịch vụ tại nền tảng tin tức công nghệ RetroLab.',
};

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white py-14 lg:py-16">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/15 blur-[100px]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm font-medium mb-5 border border-white/10">
            <FileText size={16} className="text-[#facc15]" />
            Luật chơi chung
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-4">
            Điều khoản sử dụng
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
            Ngắn gọn, dễ hiểu — để bạn biết rõ "luật chơi" khi lướt đọc và tạo tài khoản tại RetroLab.
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <p className="text-lg text-gray-600 leading-relaxed mb-12">
            Chào mừng bạn đến với <span className="font-semibold text-gray-900">RetroLab</span>! Khi bạn lướt đọc tin tức hay tạo tài khoản tại đây, đồng nghĩa với việc bạn đã đồng ý với những "luật chơi" chung của chúng mình. Đừng lo, các điều khoản này được viết rất ngắn gọn và dễ hiểu thôi.
          </p>

          <article className="space-y-12">

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                1. Bản quyền và Nội dung bài viết
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Nguồn gốc nội dung:</strong> RetroLab là một trạm tổng hợp thông tin tự động bằng AI (LLM) và được kiểm duyệt lại bởi con người. Chúng mình luôn cố gắng truyền tải thông tin gốc một cách gãy gọn và chính xác nhất. Tuy nhiên, nội dung mang tính chất tham khảo và cập nhật xu hướng, chúng mình không chịu trách nhiệm pháp lý tuyệt đối cho từng chi tiết nhỏ lẻ trong bài báo gốc.
                </p>
                <p>
                  <strong className="text-gray-900">Tôn trọng tác giả:</strong> Chúng mình luôn đính kèm link gốc và tên tác giả. Nếu bạn muốn trích dẫn lại bài viết từ RetroLab, vui lòng để lại nguồn. Ngược lại, nếu bạn là tác giả gốc và muốn gỡ bỏ nội dung của mình khỏi hệ thống RetroLab, chỉ cần liên hệ, chúng mình sẽ xử lý ngay lập tức.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                2. Tài khoản của bạn
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Khi đăng ký tài khoản để sử dụng các tính năng cá nhân hóa như <strong className="text-gray-900">Lưu bài</strong> và <strong className="text-gray-900">Thích bài viết</strong>, bạn có trách nhiệm tự bảo mật thông tin đăng nhập (mật khẩu) của mình.
                </p>
                <p>
                  Bạn có toàn quyền quản lý tài khoản: từ việc chỉnh sửa thông tin cá nhân, cho đến việc sử dụng tính năng <strong className="text-gray-900">Tự động xóa tài khoản</strong> (xóa vĩnh viễn mọi dữ liệu và lịch sử tương tác) bất cứ khi nào bạn muốn.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                3. Giới hạn trách nhiệm & Vấn đề giả lập
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Miễn trừ rủi ro:</strong> Các thủ thuật IT, hướng dẫn vọc vạch hệ thống hay cài đặt phần mềm được chia sẻ trên RetroLab mang tính chất tham khảo. Bạn hoàn toàn tự chịu trách nhiệm với những rủi ro (nếu có) khi áp dụng chúng lên thiết bị cá nhân của mình.
                </p>
                <p>
                  <strong className="text-gray-900">Bản quyền phần mềm/game:</strong> Đặc thù là một trang có chuyên mục Giả Lập, chúng mình chỉ bàn luận về công nghệ, phần cứng, mã nguồn mở và cập nhật tin tức về các trình giả lập. <strong className="text-gray-900">RetroLab không lưu trữ, không chia sẻ và không khuyến khích việc sử dụng các tệp tin game (ROMs/ISOs) vi phạm bản quyền hay phần mềm bẻ khóa (crack).</strong>
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                4. Cập nhật điều khoản
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Sân chơi nào cũng cần nâng cấp. Chúng mình có thể sẽ cập nhật các điều khoản này trong tương lai để phù hợp với sự phát triển của trang web. Mọi thay đổi lớn sẽ được cập nhật trực tiếp trên trang này.
              </p>
            </section>

          </article>

          {/* Contact */}
          <div className="mt-14 p-8 bg-gray-50 rounded-2xl text-center border border-gray-100">
            <p className="text-gray-600 mb-2">Nếu có bất kỳ câu hỏi nào, bạn cứ thoải mái liên hệ với chúng mình qua:</p>
            <a href="mailto:contact@retrolab.com.vn" className="text-xl font-bold text-[#2563eb] hover:underline">
              contact@retrolab.com.vn
            </a>
          </div>

        </div>
      </section>
    </div>
  );
}
