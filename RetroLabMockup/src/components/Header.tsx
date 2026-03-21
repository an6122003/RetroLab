import { Search, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center relative">
            <div className="w-2 h-2 bg-[#facc15] rounded-full absolute top-1.5 right-1.5"></div>
          </div>
          <div className="text-xl font-black tracking-tighter flex items-center">
            <span className="text-gray-900">Retro</span>
            <span className="text-[#2563eb]">Lab</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex gap-8 h-full items-center text-sm font-bold text-gray-900 uppercase tracking-wider">
          <a href="#" className="hover:text-[#2563eb] transition-colors">Tin tức</a>
          <a href="#" className="text-[#2563eb] border-b-2 border-[#2563eb] h-full flex items-center">AI</a>
          <a href="#" className="hover:text-[#2563eb] transition-colors">Đánh giá</a>
          <a href="#" className="hover:text-[#2563eb] transition-colors">Góc nhìn</a>
          <a href="#" className="hover:text-[#2563eb] transition-colors">Tips & Tricks</a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center bg-gray-100 rounded-full px-4 py-2 border border-gray-200">
            <Search size={16} className="text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="bg-transparent border-none outline-none text-sm w-32 focus:w-48 transition-all duration-300 text-gray-900 placeholder-gray-500"
            />
          </div>
          <button className="w-10 h-10 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center hover:bg-blue-100 transition-colors">
            <User size={18} />
          </button>
        </div>

      </div>
    </header>
  );
}
