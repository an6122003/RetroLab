'use client';

import { ArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="hidden md:flex fixed bottom-8 right-8 p-2.5 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 transition-all z-50 rounded-sm items-center justify-center"
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
