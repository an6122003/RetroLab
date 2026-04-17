import { ChevronUp, ChevronDown } from 'lucide-react';

export default function Ticker({ category = "Xem xong mua", text = "Sau Tết vẫn còn deal ngon: UGREEN giảm giá sâu hàng loạt phụ kiện công nghệ mới nhất dịp 3/3" }: any) {
  return (
    <div className="bg-[#f8f9fa] border border-gray-200 p-2 flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <span className="bg-[#ef4444] text-white text-xs font-bold px-3 py-1.5 uppercase tracking-wider">{category}</span>
        <span className="text-[15px] font-serif font-medium text-gray-800">{text}</span>
      </div>
      <div className="flex gap-1">
        <button className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"><ChevronUp size={16} /></button>
        <button className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"><ChevronDown size={16} /></button>
      </div>
    </div>
  );
}
