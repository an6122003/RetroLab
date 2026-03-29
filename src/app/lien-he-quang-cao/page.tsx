import { Metadata } from 'next';
import { Handshake } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Liên hệ Hợp tác & Quảng cáo | RetroLab',
  description: 'Hợp tác quảng cáo, bài viết tài trợ và đánh giá sản phẩm cùng RetroLab — trạm tin tức công nghệ.',
};

export default function AdvertisingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white py-14 lg:py-16">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/15 blur-[100px]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm font-medium mb-5 border border-white/10">
            <Handshake size={16} className="text-[#facc15]" />
            Đồng hành cùng RetroLab
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-4">
            Liên hệ Hợp tác & Quảng cáo
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
            Đưa thông điệp của bạn đến đúng người, đúng thời điểm — trong cộng đồng tech thực thụ.
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="space-y-6 text-gray-600 leading-relaxed text-lg mb-12">
            <p>
              Chào bạn, cảm ơn bạn đã quan tâm đến việc đồng hành cùng <span className="font-semibold text-gray-900">RetroLab</span>!
            </p>
            <p>
              RetroLab không chỉ là một trạm cập nhật tin tức, mà còn là điểm đến mỗi ngày của một cộng đồng chung đam mê: những lập trình viên, những người làm IT, những người yêu thích trí tuệ nhân tạo (AI) và cả những game thủ hệ hoài cổ.
            </p>
            <p>
              Nếu sản phẩm, dịch vụ hoặc thương hiệu của bạn hướng tới tệp người dùng yêu thích công nghệ và kỹ thuật, chúng mình rất sẵn lòng hợp tác để đưa thông điệp của bạn đến đúng người, đúng thời điểm.
            </p>
          </div>

          <article className="space-y-12">

            {/* Hình thức hợp tác */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                Chúng mình có thể hợp tác qua các hình thức nào?
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Đặt Banner quảng cáo:</strong> Các vị trí hiển thị tối ưu trên trang chủ và trang bài viết. Chúng mình cam kết các banner được sắp xếp tinh tế, không chèn ép nội dung và tuyệt đối không dùng pop-up gây khó chịu cho trải nghiệm đọc của anh em.
                </p>
                <p>
                  <strong className="text-gray-900">Bài viết tài trợ (Sponsored Post / PR):</strong> Bạn có thể gửi bài viết chuẩn bị sẵn, hoặc đội ngũ RetroLab sẽ hỗ trợ biên tập lại nội dung sao cho gãy gọn, đúng với văn phong ngắn gọn, trực quan của trang web để độc giả dễ đón nhận nhất.
                </p>
                <p>
                  <strong className="text-gray-900">Đánh giá sản phẩm (Review):</strong> Trải nghiệm và đánh giá thực tế các phần cứng, phần mềm, thiết bị công nghệ hoặc các phụ kiện chơi game/giả lập.
                </p>
              </div>
            </section>

            {/* Nguyên tắc */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3 mb-5">
                Nguyên tắc hợp tác của RetroLab
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Để giữ gìn một sân chơi "sạch" cho cộng đồng tech, chúng mình <strong className="text-gray-900">từ chối</strong> nhận quảng cáo cho các dịch vụ cá cược, cờ bạc, vay họ, nội dung 18+, hoặc các phần mềm/trang web vi phạm bản quyền, chứa mã độc. Sự tin tưởng của độc giả là ưu tiên số 1 của RetroLab.
              </p>
            </section>

          </article>

          {/* CTA */}
          <div className="mt-14 p-8 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Bắt đầu kết nối nhé!</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Để nhận báo giá chi tiết, các số liệu thống kê (Traffic, Pageviews) hoặc thảo luận về một ý tưởng hợp tác sáng tạo hơn, bạn cứ thoải mái nhắn cho chúng mình qua:
            </p>
            <a href="mailto:ads@retrolab.com.vn" className="text-xl font-bold text-[#2563eb] hover:underline">
              ads@retrolab.com.vn
            </a>
            <p className="text-sm text-gray-500 mt-4">
              Chúng mình sẽ check mail và phản hồi bạn nhanh nhất có thể (thường là trong vòng 24 giờ làm việc). Rất mong được hợp tác cùng bạn!
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
