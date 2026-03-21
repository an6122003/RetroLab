export default function YouMayAlsoLike() {
  return (
    <div className="w-full bg-[#f8f9fa] py-16 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-sans font-bold uppercase tracking-widest mb-8 text-gray-800">You May Also Like</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          <SmallCard 
            category="AI"
            title="Anthropic cập nhật cho Claude tính năng tạo biểu đồ và hình ảnh trực quan"
            author="TRỊNH LÊ HOÀNG"
            time="3 hours ago"
            image="https://picsum.photos/seed/claude2/400/250"
          />
          <SmallCard 
            category="Tin tức"
            title="Người dùng Apple Music sắp được nghe trọn vẹn bài hát ngay trên TikTok"
            author="MINH NGỌC"
            time="3 hours ago"
            image="https://picsum.photos/seed/tiktok2/400/250"
          />
          <SmallCard 
            category="Tin tức"
            title="MacBook Neo có thể chạy Windows qua Parallels nhưng không tối ưu"
            author="MINH NGỌC"
            time="3 hours ago"
            image="https://picsum.photos/seed/macneo2/400/250"
          />
          <SmallCard 
            category="Tin tức"
            title="Samsung cập nhật Good Lock phiên bản mới mang đến 3 thay đổi đáng chú ý"
            author="MINH NGỌC"
            time="3 hours ago"
            image="https://picsum.photos/seed/goodlock/400/250"
          />
          <SmallCard 
            category="Tin tức"
            title="9 tính năng đáng chú ý sẽ có trên iPhone Fold của Apple"
            author="MINH NGỌC"
            time="3 hours ago"
            image="https://picsum.photos/seed/fold/400/250"
          />
          <SmallCard 
            category="Tin tức"
            title="Intel ra mắt Core Ultra 5 250K Plus và Core Ultra 7 270K Plus"
            author="MINH NGỌC"
            time="3 hours ago"
            image="https://picsum.photos/seed/intel/400/250"
          />
        </div>
      </div>
    </div>
  );
}

function SmallCard({ category, title, author, time, image }: any) {
  return (
    <div className="group cursor-pointer flex flex-col h-full">
      <div className="relative overflow-hidden rounded-lg mb-4 aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-3 left-3">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{category}</span>
        </div>
      </div>
      <h3 className="text-[18px] font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{title}</h3>
      <div className="flex items-center text-[11px] text-gray-400 gap-2 uppercase tracking-wide mt-auto">
        <span>By <span className="font-bold text-gray-700">{author}</span></span>
        <span>🕒 {time}</span>
      </div>
    </div>
  )
}
