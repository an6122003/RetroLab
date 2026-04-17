import React from 'react';
import { Home, Search, Bookmark, User, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: any) => void;
}

export default function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50 px-6 py-2 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <NavItem 
        icon={<Home size={22} />} 
        label="Home" 
        active={currentPage === 'home'} 
        onClick={() => onPageChange('home')} 
      />
      <NavItem 
        icon={<LayoutGrid size={22} />} 
        label="Categories" 
        active={currentPage.startsWith('category')} 
        onClick={() => onPageChange('category')} 
      />
      <NavItem 
        icon={<Search size={22} />} 
        label="Search" 
        active={currentPage === 'search'} 
        onClick={() => onPageChange('search')} 
      />
      <NavItem 
        icon={<User size={22} />} 
        label="Profile" 
        active={currentPage === 'profile'} 
        onClick={() => onPageChange('profile')} 
      />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button 
      whileTap={{ scale: 0.9, y: 2 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors relative py-1 ${active ? 'text-[#2563eb]' : 'text-gray-400'}`}
    >
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-2 w-1 h-1 bg-[#2563eb] rounded-full"
        />
      )}
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </motion.button>
  );
}
