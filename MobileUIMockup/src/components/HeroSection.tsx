export default function HeroSection() {
  return (
    <div className="mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Hero */}
        <div className="relative group cursor-pointer overflow-hidden rounded-lg aspect-[16/9] lg:aspect-auto lg:h-[420px]">
          <img src="https://picsum.photos/seed/macbook1/800/600" alt="MacBook" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6 w-full">
            <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-3 inline-block">Vật vờ đánh giá</span>
            <h2 className="text-white text-2xl md:text-[28px] font-sans font-bold leading-tight">Trải nghiệm Side Screen: Biến tablet Android thành màn phụ MacBook miễn phí, nhiều ưu điểm vượt trội</h2>
          </div>
        </div>
        {/* Right Hero */}
        <div className="relative group cursor-pointer overflow-hidden rounded-lg aspect-[16/9] lg:aspect-auto lg:h-[420px]">
          <img src="https://picsum.photos/seed/apple50/800/600" alt="Apple 50 years" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6 w-full">
            <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-3 inline-block">Tin tức</span>
            <h2 className="text-white text-2xl md:text-[28px] font-sans font-bold leading-tight">Apple kỷ niệm 50 năm thành lập và triết lý Think Different</h2>
          </div>
        </div>
      </div>
      
      {/* 3 Columns below hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ArticleCard 
          category="Chưa phân loại"
          title="Rộ tin đồn HONOR muốn phá kỷ lục pin với dung lượng 13.080mAh trên smartphone"
          image="https://picsum.photos/seed/honor/400/250"
          time="8 hours ago"
        />
        <ArticleCard 
          category="Tin tức"
          title="Cựu lãnh đạo Microsoft hối tiếc khi nhìn vào thành công của MacBook Neo"
          image="https://picsum.photos/seed/msft/400/250"
          time="8 hours ago"
        />
        <ArticleCard 
          category="Tin tức"
          title="Google đang giúp điện thoại Android nhanh hơn và cải thiện thời lượng pin với thay đổi này"
          image="https://picsum.photos/seed/android/400/250"
          time="8 hours ago"
        />
      </div>
    </div>
  );
}

function ArticleCard({ category, title, image, time }: { category: string, title: string, image: string, time: string }) {
  return (
    <div className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-lg mb-4 aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-3 left-3">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{category}</span>
        </div>
      </div>
      <h3 className="text-[17px] font-sans font-bold leading-snug mb-2 group-hover:text-[#2563eb] transition-colors text-gray-900">{title}</h3>
      <div className="flex items-center text-[11px] text-gray-400 gap-2">
        <span>🕒 {time}</span>
      </div>
    </div>
  )
}
