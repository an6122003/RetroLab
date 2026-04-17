import { Clock } from 'lucide-react';

export default function CategoryPageMagazine() {
  return (
    <div className="bg-white font-sans text-gray-800">
      {/* Minimalist Bordered Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="border-y-2 border-gray-900 py-12 text-center">
          <span className="text-[#2563eb] font-bold tracking-widest uppercase text-xs mb-3 block">Chuyên mục</span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-black tracking-widest uppercase text-gray-900">
            Tips & Tricks
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto mt-6 text-[15px] leading-relaxed">
            Tổng hợp những thủ thuật công nghệ, mẹo sử dụng phần mềm và hướng dẫn tối ưu hóa thiết bị của bạn một cách hiệu quả nhất.
          </p>
        </div>
      </div>

      {/* Magazine Layout: Main Content (Left) + Sidebar (Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Content Area (2/3 width) */}
          <div className="w-full lg:w-2/3 flex flex-col gap-12">
            <LargeMagCard 
              category="Tips & Tricks"
              title="Hướng dẫn tối ưu hóa pin trên iOS 18: 5 cài đặt bạn cần thay đổi ngay lập tức"
              excerpt="iOS 18 mang đến nhiều tính năng mới nhưng cũng đi kèm với việc hao pin hơn. Dưới đây là những tinh chỉnh giúp iPhone của bạn trụ được cả ngày dài mà không ảnh hưởng đến trải nghiệm."
              author="MINH NGỌC"
              time="4 hours ago"
              image="https://picsum.photos/seed/ios18/800/500"
            />
            <LargeMagCard 
              category="Tips & Tricks"
              title="Cách sử dụng Copilot trong Windows 11 để tăng gấp đôi hiệu suất làm việc"
              excerpt="Trợ lý AI của Microsoft đã được tích hợp sâu vào hệ điều hành. Hãy cùng khám phá những câu lệnh và thủ thuật giúp bạn tự động hóa các tác vụ nhàm chán hàng ngày."
              author="TRỊNH LÊ HOÀNG"
              time="1 day ago"
              image="https://picsum.photos/seed/copilot/800/500"
            />
            <LargeMagCard 
              category="Tips & Tricks"
              title="Mẹo chụp ảnh chân dung đẹp như máy cơ bằng Galaxy S26 Ultra"
              excerpt="Không cần thiết bị đắt tiền, chỉ với vài thao tác điều chỉnh thông số camera và góc chụp, bạn hoàn toàn có thể tạo ra những bức ảnh chân dung xóa phông hoàn hảo."
              author="ĐỨC TRỊNH"
              time="2 days ago"
              image="https://picsum.photos/seed/s26cam/800/500"
            />
            <LargeMagCard 
              category="Tips & Tricks"
              title="Khôi phục dữ liệu đã xóa trên macOS: Đừng vội bỏ cuộc!"
              excerpt="Lỡ tay xóa nhầm file quan trọng? Đừng lo lắng, bài viết này sẽ hướng dẫn bạn 3 cách khôi phục dữ liệu trên Mac từ cơ bản đến nâng cao."
              author="LONG NGUYEN"
              time="3 days ago"
              image="https://picsum.photos/seed/macos/800/500"
            />
          </div>

          {/* Sticky Sidebar Area (1/3 width) */}
          <div className="w-full lg:w-1/3">
            <div className="sticky top-8">
              <div className="border-b-2 border-gray-900 pb-2 mb-6">
                <h2 className="text-xl font-sans font-bold uppercase tracking-widest text-gray-900">Đọc nhiều nhất</h2>
              </div>
              
              <div className="flex flex-col gap-6">
                <SidebarCard 
                  number="01"
                  category="Tips & Tricks"
                  title="5 tính năng ẩn trên Android 15 mà Google không nói cho bạn biết"
                  author="MINH NGỌC"
                  time="1 week ago"
                  image="https://picsum.photos/seed/android15/200/200"
                />
                <SidebarCard 
                  number="02"
                  category="Tips & Tricks"
                  title="Cách chặn quảng cáo triệt để trên YouTube Smart TV năm 2026"
                  author="TRỊNH LÊ HOÀNG"
                  time="2 weeks ago"
                  image="https://picsum.photos/seed/youtubead/200/200"
                />
                <SidebarCard 
                  number="03"
                  category="Tips & Tricks"
                  title="Hướng dẫn vệ sinh bàn phím cơ đúng cách không làm hỏng switch"
                  author="ĐỨC TRỊNH"
                  time="1 month ago"
                  image="https://picsum.photos/seed/keyboard/200/200"
                />
                <SidebarCard 
                  number="04"
                  category="Tips & Tricks"
                  title="Tăng tốc độ mạng Wi-Fi tại nhà chỉ với 3 bước đơn giản"
                  author="LONG NGUYEN"
                  time="1 month ago"
                  image="https://picsum.photos/seed/wifi/200/200"
                />
              </div>

              {/* Newsletter Promo in Sidebar */}
              <div className="mt-10 bg-[#f8f9fa] p-6 rounded-lg text-center border border-gray-200">
                <h3 className="font-sans font-bold text-lg mb-2">Đăng ký nhận tin</h3>
                <p className="text-gray-500 text-sm mb-4">Nhận những thủ thuật công nghệ mới nhất mỗi tuần.</p>
                <input type="email" placeholder="Email của bạn..." className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md mb-3 focus:outline-none focus:border-gray-500" />
                <button className="w-full bg-[#2563eb] text-white font-bold text-sm py-2 rounded-md hover:bg-blue-700 transition-colors">Đăng Ký</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function LargeMagCard({ category, title, excerpt, author, time, image }: any) {
  return (
    <div className="group cursor-pointer flex flex-col">
      <div className="relative overflow-hidden rounded-lg mb-5 aspect-[16/9] md:aspect-[2/1]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-4 left-4">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{category}</span>
        </div>
      </div>
      <h3 className="text-2xl md:text-3xl font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{title}</h3>
      <p className="text-gray-500 text-[15px] leading-relaxed mb-4">{excerpt}</p>
      <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
        <span>By <span className="font-bold text-gray-700">{author}</span></span>
        <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
      </div>
    </div>
  )
}

function SidebarCard({ number, category, title, author, time, image }: any) {
  return (
    <div className="group cursor-pointer flex gap-4 items-center">
      <div className="text-3xl font-sans font-black text-gray-200 italic">{number}</div>
      <div className="flex-1">
        <span className="text-[#2563eb] text-[9px] font-bold uppercase tracking-wider mb-1 block">{category}</span>
        <h3 className="text-[15px] font-sans font-bold leading-snug mb-2 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-2">{title}</h3>
        <div className="flex items-center text-[10px] text-gray-400 gap-2 uppercase tracking-wide">
          <span><span className="font-bold text-gray-700">{author}</span></span>
          <span className="flex items-center gap-1"><Clock size={10} /> {time}</span>
        </div>
      </div>
      <div className="w-20 h-20 shrink-0 overflow-hidden rounded-lg">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      </div>
    </div>
  )
}
