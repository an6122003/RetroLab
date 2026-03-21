import { Clock, Folder } from 'lucide-react';

export default function ArticlePage() {
  return (
    <div className="bg-white font-sans text-gray-800">
      {/* Full-width Hero Image */}
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-12">
        <img 
          src="https://picsum.photos/seed/apple50hero/1920/1080" 
          alt="Apple 50 years" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      </div>

      {/* Article Content Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Header Info */}
        <div className="text-center mb-10">
          <div className="mb-4">
            <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest border-b border-[#2563eb] pb-1">Tin tức</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-[42px] font-sans font-bold leading-tight mb-6 text-gray-900">
            Apple kỷ niệm 50 năm thành lập và triết lý Think Different
          </h1>
          <div className="flex items-center justify-center text-[11px] text-gray-500 gap-3 uppercase tracking-wide">
            <div className="flex items-center gap-2">
              <img src="https://picsum.photos/seed/avatar/32/32" alt="Author" className="w-8 h-8 rounded-full" />
              <span>By <span className="font-bold text-gray-700">MINH NGỌC</span></span>
            </div>
            <span className="flex items-center gap-1.5"><Clock size={12} /> 6 hours ago</span>
          </div>
        </div>

        {/* Article Body */}
        <div className="prose prose-lg max-w-none text-gray-800">
          <p className="text-lg leading-relaxed mb-8">
            Mới đây, <span className="text-[#2563eb]">Apple</span> vừa công bố kế hoạch kỷ niệm 50 năm thành lập, đánh dấu chặng đường nửa thế kỷ theo đuổi triết lý Think Different cùng những đổi mới công nghệ trong việc kết nối và sáng tạo.
          </p>

          <figure className="mb-8">
            <img src="https://picsum.photos/seed/timcook/800/450" alt="Tim Cook Hello" className="w-full rounded-lg" />
          </figure>

          <h2 className="text-2xl font-sans font-bold mt-10 mb-4 text-gray-900">Hành trình từ gara đến đế chế công nghệ</h2>
          
          <p className="leading-relaxed mb-8">
            Được thành lập vào ngày 1 tháng 4 năm 1976, Apple duy trì niềm tin rằng sự tiến bộ xuất phát từ những cá nhân dám thay đổi các chuẩn mực cũ. Tinh thần này là nền tảng dẫn dắt công ty trong suốt nhiều thập kỷ, tạo ra nhiều dòng sản phẩm tác động đến ngành công nghệ toàn cầu.
          </p>

          {/* Tweet Placeholder */}
          <div className="border border-gray-200 rounded-xl p-4 max-w-[500px] mx-auto mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img src="https://picsum.photos/seed/timcookavatar/40/40" alt="Tim Cook" className="w-10 h-10 rounded-full" />
                <div>
                  <div className="font-bold text-sm flex items-center gap-1">Tim Cook <span className="text-blue-500 text-xs">✔</span></div>
                  <div className="text-gray-500 text-xs">@tim_cook · <span className="text-blue-500 font-medium">Follow</span></div>
                </div>
              </div>
              <div className="text-gray-400 font-bold">X</div>
            </div>
            <p className="text-sm mb-3">
              April 1st marks 50 years of Apple. Thank you to everyone who's been a part of our journey. <a href="#" className="text-blue-500 hover:underline">apple.com/50-years-of-th...</a>
            </p>
            <p className="text-sm text-blue-500 hover:underline mb-3">#Apple50</p>
            <div className="border border-gray-100 rounded-lg h-32 bg-gray-50"></div>
          </div>

          <p className="leading-relaxed mb-6">
            Trong thời gian tới, công ty dự định tiếp tục phát triển các dòng chip Apple Silicon, giới thiệu phần mềm mới và mở rộng dịch vụ. <span className="text-[#2563eb]">Apple</span> cũng nhấn mạnh các cam kết dài hạn liên quan đến môi trường và giáo dục trong định hướng phát triển những năm tới.
          </p>

          <div className="text-right italic text-gray-600 mb-8">
            Theo: Apple
          </div>

          {/* YouTube Video Placeholder */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-10 group cursor-pointer">
            <img src="https://picsum.photos/seed/youtube/800/450" alt="Video thumbnail" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-12 bg-red-600 rounded-xl flex items-center justify-center">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
            </div>
            <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">VV</div>
              <span className="text-white font-medium truncate">Đánh giá One UI 8.5 trên Galaxy S26 Ultra: Thay đổi nhiều, nhưng có ổn định...</span>
            </div>
          </div>

          {/* Ad Banner */}
          <div className="w-full mb-10 cursor-pointer hover:opacity-95 transition-opacity">
            <img src="https://picsum.photos/seed/adbanner/800/150" alt="Advertisement" className="w-full rounded-lg object-cover h-[120px]" />
          </div>

          {/* Footer Category */}
          <div className="flex items-center gap-2 border-t border-gray-200 pt-6 mt-10 mb-10">
            <Folder size={16} className="text-gray-400" />
            <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest border-b border-[#2563eb] pb-0.5">Tin tức</span>
          </div>

        </div>
      </div>
    </div>
  );
}
