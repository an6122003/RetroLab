import { Clock } from 'lucide-react';

export default function CategoryPageAlternate() {
  return (
    <div className="bg-white font-sans text-gray-800">
      {/* Editorial Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-[#2563eb] font-bold tracking-widest uppercase text-sm mb-4 block">Chuyên mục</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-black tracking-tighter uppercase text-gray-900">
              Vật Vờ Đánh Giá
            </h1>
          </div>
          <p className="text-gray-500 max-w-md text-[15px] leading-relaxed">
            Những bài đánh giá chi tiết, khách quan và chuyên sâu nhất về các sản phẩm công nghệ mới nhất trên thị trường.
          </p>
        </div>
      </div>

      {/* Bento Grid Featured */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-[500px]">
          {/* Main Large Card */}
          <div className="md:col-span-2 relative group overflow-hidden rounded-lg cursor-pointer h-[400px] md:h-full">
            <img src="https://picsum.photos/seed/review1/1000/800" alt="Review" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
              <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block">Vật vờ đánh giá</span>
              <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-sans font-bold leading-tight mb-4">Đánh giá chi tiết iPhone 15 Pro Max sau 6 tháng: Vẫn là "Vua" của thế giới smartphone?</h2>
              <div className="flex items-center text-[11px] text-gray-300 gap-3 uppercase tracking-wide">
                <span>By <span className="font-bold text-white">MINH NGỌC</span></span>
                <span className="flex items-center gap-1"><Clock size={12} /> 2 days ago</span>
              </div>
            </div>
          </div>

          {/* Right Column Stack */}
          <div className="flex flex-col gap-6 h-[500px] md:h-full">
            <div className="flex-1 relative group overflow-hidden rounded-lg cursor-pointer">
              <img src="https://picsum.photos/seed/review2/500/400" alt="Review" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-5 w-full">
                <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-3 inline-block">Vật vờ đánh giá</span>
                <h3 className="text-white text-lg md:text-xl font-sans font-bold leading-tight mb-2">Trên tay nhanh Galaxy Z Fold 6: Mỏng hơn, nhẹ hơn, nếp gấp tàng hình</h3>
                <div className="flex items-center text-[10px] text-gray-300 gap-2 uppercase tracking-wide">
                  <span>By <span className="font-bold text-white">ĐỨC TRỊNH</span></span>
                </div>
              </div>
            </div>
            <div className="flex-1 relative group overflow-hidden rounded-lg cursor-pointer">
              <img src="https://picsum.photos/seed/review3/500/400" alt="Review" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-5 w-full">
                <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-3 inline-block">Vật vờ đánh giá</span>
                <h3 className="text-white text-lg md:text-xl font-sans font-bold leading-tight mb-2">Sony WF-1000XM5: Chống ồn đỉnh cao, nhưng cảm giác đeo đã tốt hơn?</h3>
                <div className="flex items-center text-[10px] text-gray-300 gap-2 uppercase tracking-wide">
                  <span>By <span className="font-bold text-white">LONG NGUYEN</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Grid List */}
      <div className="py-8 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
            <h2 className="text-xl font-sans font-bold uppercase tracking-widest text-gray-900">Bài viết mới nhất</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            <AltCard 
              category="Vật vờ đánh giá"
              title="Đánh giá chi tiết Xiaomi 14 Ultra: Nhiếp ảnh gia thực thụ trong túi quần"
              excerpt="Xiaomi 14 Ultra mang đến một hệ thống camera Leica đỉnh cao, kết hợp cùng hiệu năng mạnh mẽ từ Snapdragon 8 Gen 3..."
              author="TRỊNH LÊ HOÀNG"
              time="2 days ago"
              image="https://picsum.photos/seed/xiaomi14/400/250"
            />
            <AltCard 
              category="Vật vờ đánh giá"
              title="MacBook Air M3 15-inch: Lựa chọn hoàn hảo cho sinh viên và dân văn phòng?"
              excerpt="Với con chip M3 mới, MacBook Air 15-inch không chỉ giữ được thiết kế mỏng nhẹ mà còn nâng cấp đáng kể về sức mạnh xử lý..."
              author="MINH NGỌC"
              time="3 days ago"
              image="https://picsum.photos/seed/macbookm3/400/250"
            />
            <AltCard 
              category="Vật vờ đánh giá"
              title="Đánh giá ASUS ROG Zephyrus G14 (2024): Laptop gaming đẹp nhất hiện nay"
              excerpt="Thiết kế nhôm nguyên khối, màn hình OLED rực rỡ và hiệu năng ấn tượng khiến Zephyrus G14 trở thành một cỗ máy đáng mơ ước..."
              author="ĐỨC TRỊNH"
              time="4 days ago"
              image="https://picsum.photos/seed/rog/400/250"
            />
            <AltCard 
              category="Vật vờ đánh giá"
              title="Review iPad Pro M4: Sức mạnh dư thừa, màn hình OLED tuyệt đỉnh"
              excerpt="Chiếc iPad mỏng nhất từ trước đến nay của Apple mang trong mình sức mạnh khủng khiếp từ chip M4, nhưng liệu iPadOS có theo kịp?"
              author="LONG NGUYEN"
              time="5 days ago"
              image="https://picsum.photos/seed/ipadpro/400/250"
            />
            <AltCard 
              category="Vật vờ đánh giá"
              title="Đánh giá tai nghe AirPods Pro 2 (USB-C): Vẫn là chân ái cho người dùng Apple"
              excerpt="Phiên bản cập nhật cổng USB-C mang đến một vài thay đổi nhỏ nhưng đáng giá, củng cố vị trí tai nghe không dây tốt nhất cho hệ sinh thái Apple..."
              author="MINH NGỌC"
              time="1 week ago"
              image="https://picsum.photos/seed/airpods/400/250"
            />
            <AltCard 
              category="Vật vờ đánh giá"
              title="Garmin Epix Pro Gen 2: Đồng hồ thông minh thể thao toàn diện nhất"
              excerpt="Màn hình AMOLED rực rỡ kết hợp cùng thời lượng pin ấn tượng và các tính năng theo dõi sức khỏe chuyên sâu..."
              author="TRỊNH LÊ HOÀNG"
              time="1 week ago"
              image="https://picsum.photos/seed/garmin/400/250"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AltCard({ category, title, excerpt, author, time, image }: any) {
  return (
    <div className="group cursor-pointer flex flex-col h-full">
      <div className="relative overflow-hidden rounded-lg mb-4 aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-3 left-3">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{category}</span>
        </div>
      </div>
      <h3 className="text-[18px] font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{title}</h3>
      <p className="text-gray-500 text-[14px] leading-relaxed mb-4 line-clamp-2 flex-grow">{excerpt}</p>
      <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
        <span>By <span className="font-bold text-gray-700">{author}</span></span>
        <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
      </div>
    </div>
  )
}
