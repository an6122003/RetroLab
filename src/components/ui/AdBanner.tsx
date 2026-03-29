import Link from 'next/link';
import { Target } from 'lucide-react';

/**
 * Ad banner placeholder component.
 * Renders a stylized placeholder inviting sponsorships when no actual ad is present.
 */

const sizes = {
  leaderboard: { height: 90,  width: 728 },
  banner:      { height: 60,  width: 468 },
  rectangle:   { height: 250, width: 300 },
  sidebar:     { height: 400, width: 300 },
} as const;

type AdSize = keyof typeof sizes;

export default function AdBanner({ size = 'leaderboard' }: { size?: AdSize }) {
  const cfg = sizes[size];
  const isSmall = size === 'banner';
  const isRect = size === 'rectangle';
  const isSidebar = size === 'sidebar';
  
  return (
    <div className="w-full flex flex-col items-center mt-0 mb-4 relative z-10">
      <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-2 select-none">
        Quảng cáo
      </span>
      <Link
        href="/lien-he-quang-cao"
        style={{ maxWidth: cfg.width, height: cfg.height }}
        className="w-full relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50/50 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow group"
      >
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-xl group-hover:bg-yellow-400/10 transition-colors"></div>

        {isSidebar ? (
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 group-hover:scale-110 transition-transform mb-4">
              <Target size={24} />
            </div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-loose group-hover:text-blue-600 transition-colors">
              Không gian <br/> Quảng cáo <br/> 300x400
            </span>
          </div>
        ) : (
          <div className={`relative z-10 flex items-center ${isRect ? 'flex-col gap-3 text-center px-4' : 'gap-3 md:gap-4 px-4'}`}>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 group-hover:scale-110 transition-transform">
              <Target size={isSmall ? 18 : 20} />
            </div>
            <div>
              <h4 className={`font-bold text-gray-900 ${isSmall ? 'text-sm' : 'text-base'} group-hover:text-blue-600 transition-colors`}>
                Lan tỏa thương hiệu của bạn
              </h4>
              {!isSmall && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Tiếp cận cộng đồng tech chất lượng tại RetroLab. 
                  <span className="hidden sm:inline"> Xem báo giá →</span>
                </p>
              )}
              {isSmall && (
                <p className="text-xs text-gray-500 mt-0.5">Đặt quảng cáo tại đây →</p>
              )}
            </div>
          </div>
        )}
      </Link>
    </div>
  );
}
