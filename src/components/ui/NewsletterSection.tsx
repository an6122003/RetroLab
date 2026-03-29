"use client";

import { Mail } from 'lucide-react';

export default function NewsletterSection() {
  return (
    <div className="bg-[#2563eb] rounded-lg p-8 md:p-10 text-center flex flex-col items-center shadow-xl mb-12">
      <div className="w-12 h-12 bg-[#facc15] rounded-lg flex items-center justify-center mb-4 shadow-lg">
        <Mail size={24} className="text-[#2563eb]" />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        Đừng bỏ lỡ bất kỳ cập nhật nào
      </h2>
      <p className="text-blue-100 text-base max-w-2xl mb-6">
        Nhận bản tin công nghệ hàng tuần, đánh giá sản phẩm mới nhất và các thủ thuật AI độc quyền trực tiếp vào hộp thư của bạn.
      </p>
      
      <form className="w-full max-w-md flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
        <input 
          type="email" 
          placeholder="Email của bạn..." 
          className="flex-grow px-5 py-3 rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-400"
          required
        />
        <button 
          type="submit" 
          className="bg-[#facc15] text-gray-900 font-bold px-6 py-3 rounded-full hover:bg-yellow-500 transition-colors whitespace-nowrap"
        >
          Đăng ký ngay
        </button>
      </form>
      <p className="text-blue-200 text-xs mt-4 italic">
        Chúng tôi tôn trọng quyền riêng tư của bạn. Không bao giờ spam.
      </p>
    </div>
  );
}
