import { Clock, MessageSquare } from 'lucide-react';

export default function FeaturedCategory() {
  return (
    <div className="mb-16 border-t border-gray-200 pt-10">
      {/* Large Featured Article */}
      <div className="relative group cursor-pointer overflow-hidden rounded-lg mb-10 aspect-[16/9] md:aspect-[2.5/1]">
        <img 
          src="https://picsum.photos/seed/s26ultra/1200/500" 
          alt="Galaxy S26 Ultra" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 flex flex-col items-center text-center">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Góc nhìn</span>
          <h2 className="text-white text-2xl md:text-4xl font-sans font-bold leading-tight max-w-4xl">
            Giải đáp các câu hỏi thường gặp về Privacy Display trên Galaxy S26 Ultra
          </h2>
        </div>
      </div>

      {/* 4 Smaller Articles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        <CategoryCard 
          category="Góc nhìn"
          title="Chiến lược chiếm lĩnh thị trường giáo dục đại học của MacBook Neo"
          time="5 hours ago"
          comments="0"
          image="https://picsum.photos/seed/macbookneo/400/250"
        />
        <CategoryCard 
          category="Góc nhìn"
          title="Tại sao tắt máy không giúp laptop hết lỗi như nhiều người nghĩ?"
          time="4 days ago"
          comments="0"
          image="https://picsum.photos/seed/laptop/400/250"
        />
        <CategoryCard 
          category="AI"
          title="PewDiePie tự huấn luyện AI và đã vượt qua ChatGPT trong bài kiểm tra"
          time="5 days ago"
          comments="0"
          image="https://picsum.photos/seed/pewdiepie/400/250"
        />
        <CategoryCard 
          category="Góc nhìn"
          title="Yadea khánh thành nhà máy mới tại Việt Nam, vốn đầu tư hơn 100 triệu USD: Người mua xe máy điện sẽ hưởng lợi như thế nào?"
          time="05/03/2026"
          comments="0"
          image="https://picsum.photos/seed/yadea/400/250"
        />
      </div>
    </div>
  );
}

function CategoryCard({ category, title, time, comments, image }: { category: string, title: string, time: string, comments: string, image: string }) {
  return (
    <div className="group cursor-pointer flex flex-col items-center text-center">
      <div className="relative w-full mb-6">
        <div className="overflow-hidden rounded-lg aspect-[16/9]">
          <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">{category}</span>
        </div>
      </div>
      <h3 className="text-[16px] font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900 px-2">{title}</h3>
      <div className="flex items-center justify-center text-[11px] text-gray-400 gap-3 mt-auto">
        <span className="flex items-center gap-1.5"><Clock size={12} /> {time}</span>
        <span className="flex items-center gap-1.5"><MessageSquare size={12} /> {comments}</span>
      </div>
    </div>
  )
}
