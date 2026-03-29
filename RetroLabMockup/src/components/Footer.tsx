import { Facebook, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white text-gray-600 pt-16 pb-8 font-sans border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* About Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 bg-[#2563eb] rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-[#facc15] rounded-full absolute top-1.5 right-1.5"></div>
              </div>
              <span className="text-2xl font-black tracking-tight">
                <span className="text-[#2563eb]">Retro</span>
                <span className="text-[#facc15]">Lab</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Bắt trọn mọi chuyển động của thế giới số tại RetroLab. Trạm tin tức tổng hợp đa nguồn về Công Nghệ, AI cho đến thế giới Game và Giả Lập.
            </p>
            <div className="flex gap-3 mt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#2563eb] flex items-center justify-center hover:bg-[#2563eb] hover:text-white transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#2563eb] flex items-center justify-center hover:bg-[#2563eb] hover:text-white transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#2563eb] flex items-center justify-center hover:bg-[#2563eb] hover:text-white transition-colors">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-gray-900 font-bold text-lg mb-6">Chuyên mục</h3>
            <ul className="flex flex-col gap-4 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Trí tuệ nhân tạo</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Review Sản phẩm</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Góc nhìn Công nghệ</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Thủ thuật & Mẹo vặt</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Retro Computing</a></li>
            </ul>
          </div>

          {/* About Us */}
          <div>
            <h3 className="text-gray-900 font-bold text-lg mb-6">Về chúng tôi</h3>
            <ul className="flex flex-col gap-4 text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Giới thiệu</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Đội ngũ RetroLab</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Chính sách bảo mật</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Điều khoản sử dụng</a></li>
              <li><a href="#" className="hover:text-[#2563eb] transition-colors">Liên hệ quảng cáo</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-gray-900 font-bold text-lg mb-6">Liên hệ</h3>
            <ul className="flex flex-col gap-5 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[#2563eb] shrink-0 mt-0.5" />
                <span className="text-gray-500">Tầng 5, Tòa nhà TechHub, Cầu Giấy, Hà Nội</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[#2563eb] shrink-0" />
                <span className="text-gray-500">contact@retrolab.com.vn</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-[#2563eb] shrink-0" />
                <span className="text-gray-500">+84 24 1234 5678</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© 2024 RetroLab.com.vn. All rights reserved.</p>
          <p>Designed with <span className="text-blue-500">♥</span> for the Tech Community</p>
        </div>
      </div>
    </footer>
  );
}
