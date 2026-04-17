import { useState } from 'react';
import { User, Heart, MessageSquare, Settings, LogOut, Clock, Trash2, Bookmark, Bell, Lock } from 'lucide-react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'saved' | 'liked' | 'comments' | 'settings'>('saved');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 w-full flex flex-col md:flex-row gap-8 pb-20 md:pb-8">
      {/* Sidebar / Top Nav for Mobile */}
      <div className="w-full md:w-1/4 shrink-0 flex flex-col gap-6">
        {/* User Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-4 relative border-4 border-white shadow-sm">
            <User size={32} className="md:hidden" />
            <User size={40} className="hidden md:block" />
            <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full absolute bottom-1 right-1"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Nguyễn Văn A</h2>
          <p className="text-sm text-gray-500 mb-4">nguyenvana@example.com</p>
          <div className="w-full flex justify-between text-sm border-t border-gray-100 pt-4 mt-2 px-2">
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-lg">12</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Đã lưu</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-lg">34</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Đã thích</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-900 text-lg">48</span>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Bình luận</span>
            </div>
          </div>
        </div>

        {/* Navigation - Sidebar for Desktop, Horizontal Scroll for Mobile */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex md:flex-col overflow-x-auto no-scrollbar shadow-sm">
          <TabButton 
            active={activeTab === 'saved'} 
            onClick={() => setActiveTab('saved')} 
            icon={<Bookmark size={18} className={activeTab === 'saved' ? 'fill-[#2563eb]' : ''} />}
            label="Đã lưu"
            desktopLabel="Bài viết đã lưu"
          />
          <TabButton 
            active={activeTab === 'liked'} 
            onClick={() => setActiveTab('liked')} 
            icon={<Heart size={18} className={activeTab === 'liked' ? 'fill-[#ef4444]' : ''} />}
            label="Đã thích"
            desktopLabel="Bài viết đã thích"
            activeColor="text-[#ef4444]"
            activeBg="bg-red-50"
            activeBorder="border-[#ef4444]"
          />
          <TabButton 
            active={activeTab === 'comments'} 
            onClick={() => setActiveTab('comments')} 
            icon={<MessageSquare size={18} className={activeTab === 'comments' ? 'fill-[#2563eb]' : ''} />}
            label="Bình luận"
            desktopLabel="Bình luận của tôi"
          />
          <TabButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={18} />}
            label="Cài đặt"
            desktopLabel="Cài đặt tài khoản"
          />
          <button className="hidden md:flex items-center gap-3 px-6 py-4 text-red-500 hover:bg-red-50 font-medium text-sm text-left transition-colors border-t border-gray-100">
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'saved' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Bookmark className="text-[#2563eb]" size={24} fill="#2563eb" />
                Bài viết đã lưu
              </h1>
              <span className="text-xs md:text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">12 bài viết</span>
            </div>
            <div className="flex flex-col gap-4">
              <ArticleCard 
                category="Góc nhìn"
                title="Giải đáp các câu hỏi thường gặp về Privacy Display trên Galaxy S26 Ultra"
                excerpt="Ngay từ khi ra mắt, Galaxy S26 Ultra nhanh chóng nhận được sự chú ý lớn từ cộng đồng người dùng công nghệ..."
                time="Đã lưu 2 ngày trước"
                image="https://picsum.photos/seed/s26/400/225"
                actionIcon={<Trash2 size={18} />}
                actionTitle="Bỏ lưu"
                actionHoverClass="hover:text-red-500 hover:bg-red-50"
              />
              <ArticleCard 
                category="Tin tức"
                title="Apple kỷ niệm 50 năm thành lập và triết lý Think Different"
                excerpt="Nửa thế kỷ trôi qua, triết lý Think Different vẫn là kim chỉ nam cho mọi sản phẩm của Apple..."
                time="Đã lưu 5 ngày trước"
                image="https://picsum.photos/seed/apple50/400/225"
                actionIcon={<Trash2 size={18} />}
                actionTitle="Bỏ lưu"
                actionHoverClass="hover:text-red-500 hover:bg-red-50"
              />
            </div>
          </>
        )}

        {activeTab === 'liked' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Heart className="text-[#ef4444]" size={24} fill="#ef4444" />
                Bài viết đã thích
              </h1>
              <span className="text-xs md:text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">34 bài viết</span>
            </div>
            <div className="flex flex-col gap-4">
              <ArticleCard 
                category="Vật vờ đánh giá"
                title="Trải nghiệm Side Screen: Biến tablet Android thành màn phụ MacBook miễn phí"
                excerpt="Làm thế nào để tận dụng chiếc tablet Android cũ làm màn hình phụ cho MacBook một cách mượt mà nhất?"
                time="Đã thích 1 tuần trước"
                image="https://picsum.photos/seed/sidescreen/400/225"
                actionIcon={<Heart size={18} fill="currentColor" />}
                actionTitle="Bỏ thích"
                actionHoverClass="text-[#ef4444] hover:bg-red-50"
              />
              <ArticleCard 
                category="Tin tức"
                title="MacBook Neo có thể chạy Windows qua Parallels nhưng không tối ưu"
                excerpt="Mặc dù có thể cài đặt Windows thông qua máy ảo, hiệu năng thực tế của MacBook Neo khi chạy các ứng dụng này vẫn còn nhiều hạn chế..."
                time="Đã thích 2 tuần trước"
                image="https://picsum.photos/seed/macneo/400/225"
                actionIcon={<Heart size={18} fill="currentColor" />}
                actionTitle="Bỏ thích"
                actionHoverClass="text-[#ef4444] hover:bg-red-50"
              />
            </div>
          </>
        )}

        {activeTab === 'comments' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="text-[#2563eb]" size={24} fill="#2563eb" />
                Bình luận của tôi
              </h1>
              <span className="text-xs md:text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">48 bình luận</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 shadow-sm">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Tính năng quản lý bình luận đang được phát triển.</p>
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Settings className="text-gray-700" size={24} />
                Cài đặt tài khoản
              </h1>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {/* Profile Info Section */}
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={18} className="text-[#2563eb]" />
                  Thông tin cá nhân
                </h3>
                <div className="flex flex-col sm:flex-row gap-6 mb-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-100 flex items-center justify-center relative border border-gray-200 overflow-hidden">
                      <User size={32} className="text-gray-400" />
                    </div>
                    <button className="text-sm text-[#2563eb] font-medium hover:underline">Thay đổi ảnh</button>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                      <input type="text" defaultValue="Nguyễn Văn A" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" defaultValue="nguyenvana@example.com" disabled className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
                      <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiểu sử</label>
                  <textarea rows={3} placeholder="Giới thiệu ngắn về bản thân..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"></textarea>
                </div>
              </div>

              {/* Security Section */}
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock size={18} className="text-[#2563eb]" />
                  Bảo mật
                </h3>
                <div className="flex flex-col gap-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                    <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent" />
                  </div>
                </div>
              </div>

              {/* Notifications Section */}
              <div className="p-4 md:p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell size={18} className="text-[#2563eb]" />
                  Thông báo
                </h3>
                <div className="flex flex-col gap-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" />
                    <span className="text-sm text-gray-700">Nhận email thông báo khi có bài viết mới từ tác giả yêu thích</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" />
                    <span className="text-sm text-gray-700">Nhận email khi có người trả lời bình luận của tôi</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-4 h-4 text-[#2563eb] rounded border-gray-300 focus:ring-[#2563eb]" />
                    <span className="text-sm text-gray-700">Đăng ký nhận bản tin tổng hợp hàng tuần (Newsletter)</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-md hover:bg-blue-700 transition-colors">
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, desktopLabel, activeColor = 'text-[#2563eb]', activeBg = 'bg-blue-50', activeBorder = 'border-[#2563eb]' }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 font-medium text-sm text-left transition-colors whitespace-nowrap md:whitespace-normal shrink-0 ${
        active 
          ? `${activeBg} ${activeColor} border-b-2 md:border-b-0 md:border-l-4 ${activeBorder}` 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-b-2 md:border-b-0 md:border-l-4 border-transparent'
      }`}
    >
      {icon}
      <span className="md:hidden">{label}</span>
      <span className="hidden md:block">{desktopLabel}</span>
    </button>
  );
}

function ArticleCard({ category, title, excerpt, time, image, actionIcon, actionTitle, actionHoverClass }: any) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 md:gap-6 bg-white border border-gray-200 rounded-lg p-3 md:p-4 group cursor-pointer hover:shadow-md transition-shadow relative shadow-sm">
      <div className="w-full sm:w-[200px] md:w-[240px] shrink-0 aspect-[16/9] rounded-md overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      </div>
      <div className="flex flex-col justify-center flex-1 pr-8">
        <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest mb-1">{category}</span>
        <h3 className="text-base md:text-lg font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-1">
          {title}
        </h3>
        <p className="text-gray-600 text-[13px] md:text-[14px] leading-relaxed line-clamp-2 mb-2">
          {excerpt}
        </p>
        <div className="flex items-center text-[11px] text-gray-400 gap-1 mt-auto">
          <Clock size={12} /> {time}
        </div>
      </div>
      <button className={`absolute top-2 right-2 md:top-4 md:right-4 p-2 text-gray-400 rounded-full transition-colors ${actionHoverClass}`} title={actionTitle}>
        {actionIcon}
      </button>
    </div>
  );
}
