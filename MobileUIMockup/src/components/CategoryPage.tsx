import { Clock, MessageSquare } from 'lucide-react';

export default function CategoryPage() {
  return (
    <div className="bg-white font-sans text-gray-800">
      
      {/* Category Header & Featured Grid */}
      <div className="bg-[#1a1f2e] text-white py-12 relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px'
        }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-sans font-bold uppercase tracking-widest mb-4">Góc nhìn</h1>
            <p className="text-sm text-gray-300 max-w-2xl mx-auto">
              Nơi chia sẻ những quan điểm, góc nhìn khác biệt về thế giới công nghệ dựa trên những trải nghiệm với rất nhiều các sản phẩm công nghệ mới.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Left Column - 2 small items */}
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              <FeaturedSmallCard 
                category="Góc nhìn"
                title="Chiến lược chiếm lĩnh thị trường giáo dục đại học của MacBook Neo"
                image="https://picsum.photos/seed/macbookneo/400/250"
              />
              <FeaturedSmallCard 
                category="Góc nhìn"
                title="Tại sao tắt máy không giúp laptop hết lỗi như nhiều người nghĩ?"
                image="https://picsum.photos/seed/laptop/400/250"
              />
            </div>

            {/* Center Column - 1 large item */}
            <div className="sm:col-span-2 order-1 lg:order-2">
              <div className="group cursor-pointer h-full flex flex-col items-center text-center">
                <div className="relative w-full mb-4 h-full min-h-[200px] md:min-h-[300px]">
                  <div className="overflow-hidden rounded-lg w-full h-full shadow-lg">
                    <img src="https://picsum.photos/seed/s26ultra/800/500" alt="Galaxy S26 Ultra" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-[#2563eb] text-white text-[9px] md:text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">Góc nhìn</span>
                  </div>
                </div>
                <h3 className="text-lg md:text-2xl font-sans font-bold leading-snug mt-2 group-hover:text-gray-300 transition-colors px-4">Giải đáp các câu hỏi thường gặp về Privacy Display trên Galaxy S26 Ultra</h3>
              </div>
            </div>

            {/* Right Column - 2 small items */}
            <div className="flex flex-col gap-6 order-3">
              <FeaturedSmallCard 
                category="AI"
                title="PewDiePie tự huấn luyện AI và đã vượt qua ChatGPT trong bài kiểm tra"
                image="https://picsum.photos/seed/pewdiepie/400/250"
              />
              <FeaturedSmallCard 
                category="Góc nhìn"
                title="Yadea khánh thành nhà máy mới tại Việt Nam, vốn đầu tư hơn 100 triệu USD: Người mua xe máy điện sẽ hưởng lợi như thế nào?"
                image="https://picsum.photos/seed/yadea/400/250"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col gap-10">
          <CategoryListItem 
            category="Góc nhìn"
            title="Đây là lý do vì sao Galaxy S26 Ultra và Galaxy Buds 4 Pro là “trợ thủ đắc lực” cho dân văn phòng"
            excerpt="Với người làm công việc văn phòng, áp lực chốn công sở luôn bủa vây với những cuộc họp kéo dài, núi tài ..."
            author="LONG NGUYEN"
            time="04/03/2026"
            comments="0"
            image="https://picsum.photos/seed/s26buds/400/250"
          />
          <CategoryListItem 
            category="Góc nhìn"
            title="Lý do Galaxy S26 Ultra nhận được nhiều lời khen từ các Reviewer công nghệ Việt"
            excerpt="Hôm nay, dòng Galaxy S26 Series đã chính thức có mặt tại thị trường Việt Nam, thu hút sự quan tâm lớn từ ..."
            author="ĐỨC TRỊNH"
            time="01/03/2026"
            comments="0"
            image="https://picsum.photos/seed/s26review/400/250"
          />
        </div>
      </div>
    </div>
  );
}

function FeaturedSmallCard({ category, title, image }: { category: string, title: string, image: string }) {
  return (
    <div className="group cursor-pointer flex flex-col items-center text-center">
      <div className="relative w-full mb-4">
        <div className="overflow-hidden rounded-lg aspect-[16/9]">
          <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">{category}</span>
        </div>
      </div>
      <h3 className="text-[14px] font-sans font-bold leading-snug mt-1 group-hover:text-gray-300 transition-colors px-2">{title}</h3>
    </div>
  )
}

function CategoryListItem({ category, title, excerpt, author, time, comments, image }: any) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 group cursor-pointer border-b border-gray-100 pb-10 last:border-0">
      <div className="w-full sm:w-[320px] shrink-0 relative overflow-hidden rounded-lg aspect-[16/9] sm:aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-wider mb-2">{category}</span>
        <h3 className="text-xl md:text-2xl font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{title}</h3>
        <p className="text-gray-500 text-[15px] leading-relaxed mb-4 line-clamp-2">{excerpt}</p>
        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
          <span>By <span className="font-bold text-gray-700">{author}</span></span>
          <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
          <span className="flex items-center gap-1"><MessageSquare size={12} /> {comments}</span>
        </div>
      </div>
    </div>
  )
}
