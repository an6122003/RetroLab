import { useState } from 'react';
import { Search, Clock, SlidersHorizontal, ChevronDown } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('Galaxy S26');

  return (
    <div className="bg-white font-sans text-gray-800 min-h-screen">
      {/* Search Header */}
      <div className="bg-[#f8f9fa] border-b border-gray-200 py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-sans font-black tracking-tight text-gray-900 mb-8">
            Tìm kiếm
          </h1>
          <div className="relative max-w-2xl mx-auto px-2">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..." 
              className="w-full pl-12 md:pl-14 pr-24 md:pr-32 py-3.5 md:py-5 text-base md:text-lg border-2 border-gray-300 rounded-full focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all shadow-sm"
            />
            <Search className="absolute left-6 md:left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <button className="absolute right-4 md:right-2 top-1/2 -translate-y-1/2 bg-[#2563eb] text-white px-5 md:px-6 py-1.5 md:py-3 rounded-full font-bold text-xs md:text-sm hover:bg-blue-700 transition-colors">
              Tìm
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters & Count */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-4 border-b border-gray-200 gap-4">
          <p className="text-gray-600 text-lg">
            Tìm thấy <span className="font-bold text-gray-900">12</span> kết quả cho <span className="font-bold text-gray-900">"{query}"</span>
          </p>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-[#2563eb] transition-colors px-4 py-2 border border-gray-200 rounded-md bg-white shadow-sm">
              <SlidersHorizontal size={16} /> Lọc
            </button>
            <button className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-[#2563eb] transition-colors px-4 py-2 border border-gray-200 rounded-md bg-white shadow-sm">
              Mới nhất <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex flex-col gap-10">
          <SearchResultItem 
            category="Góc nhìn"
            title="Giải đáp các câu hỏi thường gặp về Privacy Display trên Galaxy S26 Ultra"
            excerpt="Tính năng Privacy Display mới trên Galaxy S26 Ultra đang nhận được nhiều sự quan tâm. Bài viết này sẽ giải đáp chi tiết cách hoạt động và hiệu quả thực tế của nó."
            author="ĐỨC TRỊNH"
            time="2 days ago"
            image="https://picsum.photos/seed/s26ultra/400/250"
          />
          <SearchResultItem 
            category="Tin tức"
            title="Samsung chính thức xác nhận ngày ra mắt Galaxy S26 Series tại Việt Nam"
            excerpt="Sau nhiều đồn đoán, Samsung cuối cùng đã công bố sự kiện Unpacked tiếp theo sẽ diễn ra vào tháng tới, hứa hẹn mang đến dòng Galaxy S26 với nhiều nâng cấp AI."
            author="MINH NGỌC"
            time="3 days ago"
            image="https://picsum.photos/seed/s26event/400/250"
          />
          <SearchResultItem 
            category="Vật vờ đánh giá"
            title="Đánh giá chi tiết camera Galaxy S26 Plus: Có thực sự thua kém bản Ultra?"
            excerpt="Mặc dù không sở hữu cảm biến 200MP như bản Ultra, Galaxy S26 Plus vẫn chứng tỏ khả năng nhiếp ảnh ấn tượng nhờ thuật toán AI mới."
            author="TRỊNH LÊ HOÀNG"
            time="1 week ago"
            image="https://picsum.photos/seed/s26plus/400/250"
          />
          <SearchResultItem 
            category="Tips & Tricks"
            title="5 mẹo tùy biến màn hình khóa cực đẹp trên Galaxy S26"
            excerpt="One UI 8.1 trên Galaxy S26 mang đến vô vàn khả năng tùy biến màn hình khóa. Hãy cùng khám phá những cách thiết lập độc đáo nhất."
            author="LONG NGUYEN"
            time="2 weeks ago"
            image="https://picsum.photos/seed/s26tips/400/250"
          />
        </div>

        {/* Pagination / Load More */}
        <div className="mt-16 text-center">
          <button className="bg-white border-2 border-gray-900 text-gray-900 font-bold uppercase tracking-widest text-sm px-10 py-4 hover:bg-gray-900 hover:text-white transition-colors rounded-full">
            Tải thêm kết quả
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({ category, title, excerpt, author, time, image }: any) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 group cursor-pointer">
      <div className="w-full sm:w-[300px] shrink-0 relative overflow-hidden rounded-lg aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-3 left-3">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{category}</span>
        </div>
      </div>
      <div className="flex flex-col justify-center flex-1 py-2">
        <h3 className="text-xl md:text-2xl font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{title}</h3>
        <p className="text-gray-500 text-[15px] leading-relaxed mb-4 line-clamp-2">{excerpt}</p>
        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
          <span>By <span className="font-bold text-gray-700">{author}</span></span>
          <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
        </div>
      </div>
    </div>
  )
}
