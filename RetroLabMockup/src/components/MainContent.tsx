import { Clock, ShieldCheck, MonitorPlay, BrainCircuit, PlayCircle, ArrowRight, MessageSquare } from 'lucide-react';
import Ticker from './Ticker';

export default function MainContent() {
  return (
    <div className="flex flex-col w-full">
      
      {/* NEW Section: Top Featured Grid */}
      <div className="flex flex-col gap-6 mb-12">
        {/* 2 Large Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HeroGridCard 
            category="Vật vờ đánh giá"
            title="Trải nghiệm Side Screen: Biến tablet Android thành màn phụ MacBook miễn phí, nhiều ưu điểm vượt trội"
            image="https://picsum.photos/seed/sidescreen/800/450"
          />
          <HeroGridCard 
            category="Tin tức"
            title="Apple kỷ niệm 50 năm thành lập và triết lý Think Different"
            image="https://picsum.photos/seed/apple50/800/450"
          />
        </div>
        
        {/* 3 Small Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SmallGridCard 
            category="Chưa phân loại"
            title="Rộ tin đồn HONOR muốn phá kỷ lục pin với dung lượng 13.080mAh trên smartphone"
            time="15 hours ago"
            image="https://picsum.photos/seed/honorpin/400/225"
          />
          <SmallGridCard 
            category="Tin tức"
            title="Cựu lãnh đạo Microsoft hối tiếc khi nhìn vào thành công của MacBook Neo"
            time="15 hours ago"
            image="https://picsum.photos/seed/msneo/400/225"
          />
          <SmallGridCard 
            category="Tin tức"
            title="Google đang giúp điện thoại Android nhanh hơn và cải thiện thời lượng pin với thay đổi này"
            time="15 hours ago"
            image="https://picsum.photos/seed/android/400/225"
          />
        </div>
      </div>

      <Ticker category="Xem xong mua" text="5 mẫu máy HONOR xách tay đáng mua nhất dịp Tết này" />

      {/* Section 0: Featured Magazine Layout */}
      <div className="flex flex-col w-full mb-16 border-b border-gray-200 pb-12">
        {/* Top Single Post */}
        <div className="flex flex-col md:flex-row gap-6 mb-10 group cursor-pointer">
          <div className="w-full md:w-[380px] shrink-0 aspect-[16/9] rounded-lg overflow-hidden">
            <img src="https://picsum.photos/seed/honor/600/337" alt="HONOR" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3">
              <span className="text-[#ef4444] text-[11px] font-bold uppercase tracking-widest border-b-2 border-[#ef4444] pb-1">Xem xong mua</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-3">
              5 mẫu máy HONOR xách tay đáng mua nhất dịp Tết này
            </h2>
            <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2 mb-4">
              Trong thị trường điện thoại xách tay đầu năm 2026, HONOR đang dần khẳng định vị thế vững chắc nhờ sự cân bằng ...
            </p>
            <div className="flex items-center text-[12px] text-gray-400 gap-3">
              <span>By <span className="font-bold text-gray-700">LONG NGUYEN</span></span>
              <span className="flex items-center gap-1"><Clock size={12} /> 08/02/2026</span>
              <span className="flex items-center gap-1"><MessageSquare size={12} /> 0</span>
            </div>
          </div>
        </div>

        {/* Middle Hero Post */}
        <div className="relative w-full aspect-[16/9] md:aspect-[2.5/1] rounded-lg overflow-hidden mb-12 group cursor-pointer">
          <img src="https://picsum.photos/seed/s26hero/1200/480" alt="Galaxy S26 Ultra" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end items-center pb-10 px-4 text-center">
            <span className="bg-[#ef4444] text-white text-[11px] font-bold px-3 py-1 uppercase tracking-widest mb-4">Góc nhìn</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-4xl leading-tight drop-shadow-lg">
              Giải đáp các câu hỏi thường gặp về Privacy Display trên Galaxy S26 Ultra
            </h2>
          </div>
        </div>

        {/* Bottom 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          <MagazineGridCard 
            category="Góc nhìn"
            title="Chiến lược chiếm lĩnh thị trường giáo dục đại học của MacBook Neo"
            time="12 hours ago"
            comments="0"
            image="https://picsum.photos/seed/macneo2/400/225"
          />
          <MagazineGridCard 
            category="Góc nhìn"
            title="Tại sao tắt máy không giúp laptop hết lỗi như nhiều người nghĩ?"
            time="5 days ago"
            comments="0"
            image="https://picsum.photos/seed/laptop/400/225"
          />
          <MagazineGridCard 
            category="AI"
            title="PewDiePie tự huấn luyện AI và đã vượt qua ChatGPT trong bài kiểm tra"
            time="6 days ago"
            comments="0"
            image="https://picsum.photos/seed/pewdiepie/400/225"
          />
          <MagazineGridCard 
            category="Góc nhìn"
            title="Yadea khánh thành nhà máy mới tại Việt Nam, vốn đầu tư hơn 100 triệu USD: Người mua xe máy điện sẽ hưởng lợi như thế nào?"
            time="05/03/2026"
            comments="0"
            image="https://picsum.photos/seed/yadea/400/225"
          />
        </div>
      </div>

      {/* Section 1: Asymmetric Layout */}
      <div className="flex flex-col lg:flex-row gap-10 mb-16">
        {/* Left Column - Articles */}
        <div className="flex-1 flex flex-col gap-8">
          
          {/* Asymmetric Large Post */}
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-8 group cursor-pointer">
            <div className="w-full aspect-[16/9] rounded-lg overflow-hidden">
              <img src="https://picsum.photos/seed/s26/800/450" alt="Galaxy S26" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest">Góc nhìn</span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors">
                Giải đáp các câu hỏi thường gặp về Privacy Display trên Galaxy S26 Ultra
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2 mt-2">
                Ngay từ khi ra mắt, Galaxy S26 Ultra nhanh chóng nhận được sự chú ý lớn từ cộng đồng người dùng công nghệ, ...
              </p>
              <div className="flex items-center text-[12px] text-gray-400 gap-2 mt-2">
                <span>By <span className="font-bold text-gray-700">LONG NGUYEN</span></span>
                <span className="flex items-center gap-1"><Clock size={12} /> 11 hours ago</span>
              </div>
            </div>
          </div>

          {/* Standard List Posts */}
          <ListPost 
            category="Góc nhìn"
            title="Chiến lược chiếm lĩnh thị trường giáo dục đại học của MacBook Neo"
            excerpt="Vừa qua, Apple chính thức ra mắt MacBook Neo, qua đó phần nào thay đổi cục diện thị trường máy tính giáo dục ..."
            author="ĐỨC TRỊNH"
            time="12 hours ago"
            image="https://picsum.photos/seed/macneo/400/225"
          />
          <ListPost 
            category="AI"
            title="Anthropic cập nhật cho Claude tính năng tạo biểu đồ và hình ảnh trực quan"
            excerpt="Việc đọc các đoạn văn bản dài từ chatbot AI đôi khi khiến người dùng gặp khó khăn trong việc nắm bắt thông ..."
            author="TRỊNH LÊ HOÀNG"
            time="12 hours ago"
            image="https://picsum.photos/seed/claude/400/225"
          />
          <ListPost 
            category="Tin tức"
            title="Người dùng Apple Music sắp được nghe trọn vẹn bài hát ngay trên TikTok"
            excerpt="Thông qua một thỏa thuận hợp tác mới, những người đăng ký dịch vụ Apple Music sẽ có khả năng nghe toàn bộ ..."
            author="MINH NGỌC"
            time="12 hours ago"
            image="https://picsum.photos/seed/tiktok/400/225"
          />
        </div>

        {/* Right Column - Ad Banner */}
        <div className="w-full lg:w-[300px] shrink-0">
          <div className="sticky top-28">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 text-center font-medium">Advertisement</div>
            <div className="w-full rounded-lg overflow-hidden bg-gray-50 border border-gray-200 aspect-[3/4] cursor-pointer hover:opacity-95 transition-opacity">
              <img src="https://picsum.photos/seed/wintel/600/800" alt="Advertisement" className="w-full h-full object-cover opacity-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 3-Column Grid Layout (Restored) */}
      <div className="mb-16">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">Đáng chú ý</h2>
          <div className="hidden md:flex gap-8 overflow-x-auto whitespace-nowrap">
            <button className="text-[#2563eb] font-bold border-b-2 border-[#2563eb] pb-4 -mb-[17px] px-1">Tất cả</button>
            <button className="text-gray-500 font-semibold hover:text-gray-900 pb-4 -mb-[17px] px-1 transition-colors">Trí tuệ nhân tạo (AI)</button>
            <button className="text-gray-500 font-semibold hover:text-gray-900 pb-4 -mb-[17px] px-1 transition-colors">Phần cứng</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <GridCard 
            badge="BREAKING"
            badgeColor="bg-[#ef4444]"
            icon={<ShieldCheck size={14} />}
            meta="15 tháng 10, 2024"
            title="Cảnh báo lỗ hổng bảo mật nghiêm trọng trên các dòng chip ARM mới"
            excerpt="Chuyên gia bảo mật vừa phát hiện một phương thức tấn công mới nhắm vào kiến trúc nhân của các vi xử lý ARM thế hệ mới nhất..."
            image="https://picsum.photos/seed/security/600/337"
          />
          <GridCard 
            badge="REVIEW"
            badgeColor="bg-[#facc15]"
            badgeTextColor="text-gray-900"
            icon={<MonitorPlay size={14} />}
            meta="Đánh giá nhanh"
            title="Góc làm việc 'Retro-Modern': Khi hoài cổ kết hợp cùng công nghệ 2024"
            excerpt="Làm thế nào để phối hợp những chiếc bàn phím cơ vintage với màn hình OLED 240Hz? Hãy cùng khám phá setup độc đáo này..."
            image="https://picsum.photos/seed/setup/600/337"
          />
          <GridCard 
            badge=""
            icon={<BrainCircuit size={14} />}
            meta="Deep Dive"
            title="OpenAI Sora: Khi phim ảnh và thực tế không còn ranh giới"
            excerpt="Sức mạnh của Sora không chỉ dừng lại ở việc tạo video ngắn, nó là một cuộc cách mạng về mô phỏng thế giới vật lý..."
            image="https://picsum.photos/seed/brain/600/337"
          />
        </div>
      </div>

      {/* Section 3: Dark Mode Video/Multimedia Pane */}
      <div className="mb-16 bg-gray-900 rounded-lg p-6 md:p-10 text-white">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
            <PlayCircle className="text-[#2563eb]" size={28} /> Video Mới
          </h2>
          <button className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors">
            Xem tất cả <ArrowRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <VideoCard 
            title="Đánh giá chi tiết iPhone 16 Pro Max sau 1 tháng"
            time="1 ngày trước"
            image="https://picsum.photos/seed/vid1/400/225"
          />
          <VideoCard 
            title="Top 5 laptop sinh viên đáng mua nhất 2024"
            time="2 ngày trước"
            image="https://picsum.photos/seed/vid2/400/225"
          />
          <VideoCard 
            title="Trải nghiệm kính Vision Pro: Tương lai là đây?"
            time="3 ngày trước"
            image="https://picsum.photos/seed/vid3/400/225"
          />
          <VideoCard 
            title="Build PC 15 triệu chơi mượt Black Myth: Wukong"
            time="4 ngày trước"
            image="https://picsum.photos/seed/vid4/400/225"
          />
        </div>
      </div>

      {/* Section 4: 2-Column Editor's Picks */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-4 mb-8">
          Lựa chọn của Editor
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EditorCard 
            category="Phân tích"
            title="Sự trỗi dậy của các mô hình AI mã nguồn mở: Mối đe dọa thực sự đối với OpenAI?"
            excerpt="Trong khi GPT-4 vẫn đang thống trị, Llama 3 và Mistral đang âm thầm thu hẹp khoảng cách với tốc độ đáng kinh ngạc. Liệu thế độc quyền có bị phá vỡ?"
            image="https://picsum.photos/seed/opensource/800/450"
            author="TRỊNH LÊ HOÀNG"
            time="14 hours ago"
          />
          <EditorCard 
            category="Xu hướng"
            title="Thị trường xe điện Việt Nam 2024: Cuộc đua khốc liệt giữa các ông lớn"
            excerpt="Từ VinFast đến BYD, thị trường xe điện Việt Nam đang chứng kiến sự cạnh tranh chưa từng có. Người tiêu dùng sẽ được hưởng lợi gì từ cuộc chiến này?"
            image="https://picsum.photos/seed/ev/800/450"
            author="LONG NGUYEN"
            time="16 hours ago"
          />
        </div>
      </div>

    </div>
  );
}

function ListPost({ category, title, excerpt, author, time, image }: any) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 border-b border-gray-200 pb-8 last:border-0 group cursor-pointer">
      <div className="w-full sm:w-[280px] shrink-0 aspect-[16/9] rounded-lg overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      </div>
      <div className="flex flex-col justify-center gap-2">
        <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest">{category}</span>
        <h3 className="text-xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2">
          {excerpt}
        </p>
        <div className="flex items-center text-[12px] text-gray-400 gap-2 mt-auto pt-2">
          <span>By <span className="font-bold text-gray-700">{author}</span></span>
          <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
        </div>
      </div>
    </div>
  );
}

function GridCard({ badge, badgeColor, badgeTextColor = "text-white", icon, meta, title, excerpt, image }: any) {
  return (
    <div className="group cursor-pointer flex flex-col h-full">
      <div className="relative overflow-hidden rounded-lg mb-4 aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {badge && (
          <div className="absolute top-3 left-3">
            <span className={`${badgeColor} ${badgeTextColor} text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider`}>{badge}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500 uppercase tracking-wider mb-3">
        {icon}
        <span>{meta}</span>
      </div>
      <h3 className="text-xl font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{title}</h3>
      <p className="text-gray-600 text-[14px] leading-relaxed line-clamp-2 flex-grow">{excerpt}</p>
      <div className="mt-4 flex items-center text-[#2563eb] font-semibold text-sm group-hover:underline">
        Xem thêm <ArrowRight size={16} className="ml-1" />
      </div>
    </div>
  );
}

function VideoCard({ title, time, image }: any) {
  return (
    <div className="group cursor-pointer flex flex-col">
      <div className="relative overflow-hidden rounded-lg mb-3 aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-[#2563eb] transition-colors">
            <PlayCircle className="text-white" size={24} />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded font-mono">
          10:24
        </div>
      </div>
      <h3 className="text-[15px] font-bold leading-snug mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">{title}</h3>
      <div className="text-[12px] text-gray-400">{time}</div>
    </div>
  );
}

function EditorCard({ category, title, excerpt, image, author, time }: any) {
  return (
    <div className="group cursor-pointer flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="w-full aspect-[16/9] overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest mb-2">{category}</span>
        <h3 className="text-2xl font-bold text-gray-900 leading-snug mb-3 group-hover:text-[#2563eb] transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-3 mb-6 flex-grow">
          {excerpt}
        </p>
        <div className="flex items-center justify-between text-[12px] text-gray-400 mt-auto pt-4 border-t border-gray-100">
          <span>By <span className="font-bold text-gray-700">{author}</span></span>
          <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
        </div>
      </div>
    </div>
  );
}

function MagazineGridCard({ category, title, time, comments, image }: any) {
  return (
    <div className="flex flex-col items-center text-center group cursor-pointer">
      <div className="relative w-full aspect-[16/9] rounded-lg mb-6">
        <div className="w-full h-full rounded-lg overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider whitespace-nowrap shadow-sm">
            {category}
          </span>
        </div>
      </div>
      <h3 className="text-[17px] font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-3 line-clamp-4 px-2">
        {title}
      </h3>
      <div className="flex items-center justify-center text-[12px] text-gray-400 gap-3 mt-auto">
        <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
        <span className="flex items-center gap-1"><MessageSquare size={12} /> {comments}</span>
      </div>
    </div>
  );
}

function HeroGridCard({ category, title, image }: any) {
  return (
    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden group cursor-pointer">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-between p-6">
        <div className="self-start">
          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">{category}</span>
        </div>
        <h3 className="text-xl md:text-2xl font-serif font-bold text-white leading-snug drop-shadow-md">
          {title}
        </h3>
      </div>
    </div>
  );
}

function SmallGridCard({ category, title, time, image }: any) {
  return (
    <div className="flex flex-col group cursor-pointer">
      <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-4">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute top-3 left-3">
          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">{category}</span>
        </div>
      </div>
      <h3 className="text-[16px] font-serif font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-2">
        {title}
      </h3>
      <div className="flex items-center text-[12px] text-gray-400 gap-1 mt-auto">
        <Clock size={12} /> {time}
      </div>
    </div>
  );
}
