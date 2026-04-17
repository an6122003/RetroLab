import { Clock } from 'lucide-react';

export default function CategoryPageNews() {
  return (
    <div className="bg-white font-sans text-gray-800">
      {/* Immersive Parallax-style Header */}
      <div className="relative w-full h-[350px] md:h-[450px] flex items-center justify-center mb-16">
        <img 
          src="https://picsum.photos/seed/aiheader/1920/1080" 
          alt="AI Category" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center px-4">
          <span className="text-[#2563eb] font-bold tracking-widest uppercase text-sm mb-4 block">Chuyên mục</span>
          <h1 className="text-5xl md:text-7xl font-sans font-black tracking-widest uppercase text-white mb-4">
            Trí Tuệ Nhân Tạo
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-[16px] leading-relaxed">
            Cập nhật những tin tức, xu hướng và đột phá mới nhất trong lĩnh vực AI trên toàn cầu.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        
        {/* Alternating Checkerboard Layout for Top Stories */}
        <div className="mb-20">
          <div className="border-b border-gray-200 pb-4 mb-10">
            <h2 className="text-2xl font-sans font-bold uppercase tracking-widest text-gray-900">Tiêu điểm</h2>
          </div>

          <div className="flex flex-col gap-12 md:gap-16">
            {/* Block 1: Image Left, Text Right */}
            <div className="flex flex-col md:flex-row gap-8 items-center group cursor-pointer">
              <div className="w-full md:w-1/2 relative overflow-hidden rounded-lg aspect-[16/9]">
                <img src="https://picsum.photos/seed/openai/800/500" alt="News" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-4 left-4">
                  <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">AI</span>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex flex-col justify-center md:pl-8">
                <h3 className="text-2xl md:text-4xl font-sans font-bold leading-snug mb-4 group-hover:text-[#2563eb] transition-colors text-gray-900">OpenAI chính thức ra mắt GPT-5: Khả năng suy luận vượt xa con người?</h3>
                <p className="text-gray-500 text-[16px] leading-relaxed mb-6">Mô hình ngôn ngữ lớn thế hệ tiếp theo của OpenAI mang đến những cải tiến đột phá về khả năng giải quyết vấn đề phức tạp, lập trình và hiểu ngữ cảnh đa phương thức.</p>
                <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                  <span>By <span className="font-bold text-gray-700">TRỊNH LÊ HOÀNG</span></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> 2 hours ago</span>
                </div>
              </div>
            </div>

            {/* Block 2: Text Left, Image Right */}
            <div className="flex flex-col md:flex-row-reverse gap-8 items-center group cursor-pointer">
              <div className="w-full md:w-1/2 relative overflow-hidden rounded-lg aspect-[16/9]">
                <img src="https://picsum.photos/seed/gemini/800/500" alt="News" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-4 right-4">
                  <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">AI</span>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex flex-col justify-center md:pr-8">
                <h3 className="text-2xl md:text-4xl font-sans font-bold leading-snug mb-4 group-hover:text-[#2563eb] transition-colors text-gray-900">Google Gemini 2.0 tích hợp sâu vào Android: Trợ lý ảo thực sự đã xuất hiện</h3>
                <p className="text-gray-500 text-[16px] leading-relaxed mb-6">Bản cập nhật mới nhất cho phép Gemini thấu hiểu nội dung trên màn hình, tương tác với các ứng dụng bên thứ ba và thực hiện chuỗi tác vụ phức tạp chỉ bằng một câu lệnh.</p>
                <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                  <span>By <span className="font-bold text-gray-700">MINH NGỌC</span></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> 5 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dense 4-Column Grid for Latest News */}
        <div>
          <div className="border-b border-gray-200 pb-4 mb-8">
            <h2 className="text-xl font-sans font-bold uppercase tracking-widest text-gray-900">Tin vắn AI</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            <DenseCard 
              category="AI"
              title="Anthropic cập nhật cho Claude tính năng tạo biểu đồ và hình ảnh trực quan"
              author="TRỊNH LÊ HOÀNG"
              time="3 hours ago"
              image="https://picsum.photos/seed/claude2/400/250"
            />
            <DenseCard 
              category="AI"
              title="Midjourney v7 ra mắt: Chân thực đến mức khó tin, hỗ trợ tạo video ngắn"
              author="ĐỨC TRỊNH"
              time="6 hours ago"
              image="https://picsum.photos/seed/midjourney/400/250"
            />
            <DenseCard 
              category="AI"
              title="Apple Intelligence chính thức hỗ trợ tiếng Việt trên iOS 18.2"
              author="LONG NGUYEN"
              time="8 hours ago"
              image="https://picsum.photos/seed/appleai/400/250"
            />
            <DenseCard 
              category="AI"
              title="Nvidia công bố chip Blackwell thế hệ mới, hiệu năng AI tăng gấp 30 lần"
              author="MINH NGỌC"
              time="12 hours ago"
              image="https://picsum.photos/seed/nvidia/400/250"
            />
            <DenseCard 
              category="AI"
              title="Meta ra mắt Llama 4 mã nguồn mở, thách thức trực tiếp GPT-4"
              author="TRỊNH LÊ HOÀNG"
              time="1 day ago"
              image="https://picsum.photos/seed/meta/400/250"
            />
            <DenseCard 
              category="AI"
              title="Sora của OpenAI chính thức mở cửa cho người dùng phổ thông"
              author="ĐỨC TRỊNH"
              time="1 day ago"
              image="https://picsum.photos/seed/sora/400/250"
            />
            <DenseCard 
              category="AI"
              title="AI tạo sinh đang thay đổi ngành công nghiệp game như thế nào?"
              author="LONG NGUYEN"
              time="2 days ago"
              image="https://picsum.photos/seed/gameai/400/250"
            />
            <DenseCard 
              category="AI"
              title="Châu Âu thông qua đạo luật AI toàn diện đầu tiên trên thế giới"
              author="MINH NGỌC"
              time="2 days ago"
              image="https://picsum.photos/seed/euai/400/250"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function DenseCard({ category, title, author, time, image }: any) {
  return (
    <div className="group cursor-pointer flex flex-col h-full">
      <div className="relative overflow-hidden rounded-lg mb-3 aspect-[16/9]">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute top-2 left-2">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{category}</span>
        </div>
      </div>
      <h3 className="text-[16px] font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-3">{title}</h3>
      <div className="flex items-center text-[10px] text-gray-400 gap-2 uppercase tracking-wide mt-auto">
        <span>By <span className="font-bold text-gray-700">{author}</span></span>
        <span className="flex items-center gap-1"><Clock size={10} /> {time}</span>
      </div>
    </div>
  )
}
