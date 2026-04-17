import { Search, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Header({ onProfileClick }: { onProfileClick?: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        
        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center relative">
            <div className="w-2 h-2 bg-[#facc15] rounded-full absolute top-1.5 right-1.5"></div>
          </div>
          <div className="text-xl font-black tracking-tighter flex items-center">
            <span className="text-gray-900">Retro</span>
            <span className="text-[#2563eb]">Lab</span>
          </div>
        </div>

        {/* Navigation - Desktop */}
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
          <button 
            onClick={onProfileClick}
            className="w-10 h-10 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center hover:bg-blue-100 transition-colors"
            title="Hồ sơ cá nhân"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center relative">
                    <div className="w-2 h-2 bg-[#facc15] rounded-full absolute top-1.5 right-1.5"></div>
                  </div>
                  <div className="text-xl font-black tracking-tighter">
                    <span className="text-gray-900">Retro</span>
                    <span className="text-[#2563eb]">Lab</span>
                  </div>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-4 flex-grow overflow-y-auto">
                <div className="flex flex-col gap-1">
                  <MobileNavLink label="Tin tức" />
                  <MobileNavLink label="AI" active />
                  <MobileNavLink label="Đánh giá" />
                  <MobileNavLink label="Góc nhìn" />
                  <MobileNavLink label="Tips & Tricks" />
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                        </motion.div>
                      </div>
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">Chế độ tối</span>
                    </div>
                    <button className="w-12 h-6 bg-gray-300 rounded-full relative p-1 transition-colors">
                      <motion.div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <div className="flex items-center bg-gray-100 rounded-lg px-4 py-3 border border-gray-200 mb-4">
                    <Search size={18} className="text-gray-500 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm..." 
                      className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button 
                  onClick={() => {
                    onProfileClick?.();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-[#2563eb] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <User size={18} />
                  Hồ sơ cá nhân
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileNavLink({ label, active }: { label: string; active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
        active ? 'bg-blue-50 text-[#2563eb]' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </a>
  );
}
