import { getPosts, formatDate } from "@/lib/notion";
import type { ArticleData } from "@/lib/notion";
import Link from "next/link";
import Image from "next/image";
import { Clock, PlayCircle, ArrowRight, ShieldCheck, MonitorPlay, BrainCircuit } from "lucide-react";
import Ticker from "@/components/ui/Ticker";
import NewsletterSection from "@/components/ui/NewsletterSection";
import * as Cards from "@/components/ui/ArticleCards";

export const revalidate = 3600;

/**
 * Circular data selector to ensure the UI is always "full" even with limited Notion data.
 */
function getCircular(arr: any[], start: number, count: number) {
  if (arr.length === 0) return [];
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[(start + i) % arr.length]);
  }
  return result;
}

export default async function Home() {
  const allPosts = await getPosts();

  if (allPosts.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Chào mừng đến với RetroLab</h1>
        <p className="text-gray-500">Chưa có bài viết nào. Hãy thêm bài viết vào Notion database để bắt đầu.</p>
      </main>
    );
  }

  // --- Mockup Pane Distribution ---
  const heroLarge = getCircular(allPosts, 0, 2);
  const heroSmall = getCircular(allPosts, 2, 3);
  const ticker1 = allPosts[5] || allPosts[0];
  
  // Magazine Section
  const magTop = allPosts[6] || allPosts[0];
  const magHero = allPosts[7] || allPosts[1];
  const magGrid = getCircular(allPosts, 8, 4);
  
  // Asymmetric Section
  const asymLarge = allPosts[12] || allPosts[2];
  const asymList = getCircular(allPosts, 13, 3);
  
  // Notable Section
  const notableGrid = getCircular(allPosts, 16, 3);
  
  // Video Section
  const videoGrid = getCircular(allPosts, 19, 4);
  
  // Editor's Picks
  const editorPicks = getCircular(allPosts, 23, 2);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col w-full">
      
      {/* 1. TOP HERO GRID (2 Large / 3 Small) */}
      <div className="flex flex-col gap-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {heroLarge.map(post => <Cards.HeroGridCard key={`hero-l-${post.id}`} article={post} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {heroSmall.map(post => <Cards.SmallGridCard key={`hero-s-${post.id}`} article={post} />)}
        </div>
      </div>

      {/* 2. TICKER 1 */}
      <Ticker article={ticker1} />

      {/* 3. FEATURED MAGAZINE LAYOUT */}
      <div className="flex flex-col w-full mb-16 border-b border-gray-200 pb-12">
        {/* Mag Top Item */}
        <Link href={`/article/${magTop.slug}`} className="flex flex-col md:flex-row gap-6 mb-10 group cursor-pointer">
          <div className="w-full md:w-[380px] shrink-0 aspect-[16/9] rounded-lg overflow-hidden relative border border-gray-100">
            <Image src={magTop.coverImage} alt={magTop.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="380px" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3">
              <span className="text-[#ef4444] text-[11px] font-bold uppercase tracking-widest border-b-2 border-[#ef4444] pb-1">Đặc biệt</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-3">
              {magTop.title}
            </h2>
            <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2 mb-4">
              {magTop.excerpt}
            </p>
            <div className="flex items-center text-[12px] text-gray-400 gap-3">
              <span>By <span className="font-bold text-gray-700">{magTop.author.toUpperCase()}</span></span>
              <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(magTop.date)}</span>
            </div>
          </div>
        </Link>

        {/* Mag Hero (Full Width Style) */}
        <Link href={`/article/${magHero.slug}`} className="relative w-full aspect-[16/9] md:aspect-[2.5/1] rounded-lg overflow-hidden mb-12 group cursor-pointer block">
          <Image src={magHero.coverImage} alt={magHero.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end items-center pb-10 px-4 text-center">
            <span className="bg-[#ef4444] text-white text-[11px] font-bold px-3 py-1 uppercase tracking-widest mb-4">{magHero.category}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-4xl leading-tight drop-shadow-lg">
              {magHero.title}
            </h2>
          </div>
        </Link>

        {/* Mag 4-Col Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {magGrid.map(post => <Cards.MagazineGridCard key={`mag-g-${post.id}`} article={post} />)}
        </div>
      </div>

      {/* 4. ASYMMETRIC LAYOUT (List + Sidebar) */}
      <div className="flex flex-col lg:flex-row gap-10 mb-16">
        <div className="flex-1 flex flex-col gap-8">
          
          {/* Asymmetric Large Post */}
          <Link href={`/article/${asymLarge.slug}`} className="flex flex-col gap-4 border-b border-gray-200 pb-8 group cursor-pointer">
            <div className="w-full aspect-[16/9] rounded-lg overflow-hidden relative border border-gray-100">
              <Image src={asymLarge.coverImage} alt={asymLarge.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 1024px) 100vw, 65vw" />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest">{asymLarge.category}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors">
                {asymLarge.title}
              </h2>
              <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2 mt-2">
                {asymLarge.excerpt}
              </p>
              <div className="flex items-center text-[12px] text-gray-400 gap-2 mt-2">
                <span>By <span className="font-bold text-gray-700">{asymLarge.author.toUpperCase()}</span></span>
                <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(asymLarge.date)}</span>
              </div>
            </div>
          </Link>

          {/* Standard List Posts */}
          {asymList.map(post => <Cards.ListCard key={`asym-l-${post.id}`} article={post} />)}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-[300px] shrink-0">
          <div className="sticky top-28">
            <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-2 text-center font-bold">Advertisement</div>
            <div className="w-full rounded-lg overflow-hidden bg-gray-50 border border-gray-100 aspect-[3/4] flex items-center justify-center grayscale opacity-50 relative">
               {/* Mockup Ad Style */}
               <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-center p-6">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-loose">
                    Không gian <br/> Quảng cáo <br/> 300x400
                  </span>
               </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 5. NOTABLE GRID WITH TABS ("Đáng chú ý") */}
      <div className="mb-16">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">Đáng chú ý</h2>
          <div className="hidden md:flex gap-8 overflow-x-auto whitespace-nowrap">
            <button className="text-[#2563eb] font-bold border-b-2 border-[#2563eb] pb-4 -mb-[17px] px-1">Tất cả</button>
            <button className="text-gray-500 font-semibold hover:text-gray-900 pb-4 -mb-[17px] px-1 transition-colors">AI</button>
            <button className="text-gray-500 font-semibold hover:text-gray-900 pb-4 -mb-[17px] px-1 transition-colors">Đánh giá</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {notableGrid.map((post, idx) => {
            const icons = [<ShieldCheck key="i1" size={14} />, <MonitorPlay key="i2" size={14} />, <BrainCircuit key="i3" size={14} />];
            return (
              <div key={`notable-${post.id}`} className="flex flex-col">
                <Cards.GridCard article={post} />
                {/* Manual icon injection for visual parity with mockup */}
                <div className="flex items-center gap-2 text-[11px] text-gray-400 uppercase tracking-wider -mt-10 mb-12">
                   {icons[idx % 3]} <span>{post.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. DARK MODE VIDEO PANE ("Video Mới") */}
      <div className="mb-16 bg-gray-950 rounded-xl p-6 md:p-10 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-10">
          <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-3">
            <PlayCircle className="text-[#2563eb]" size={28} /> Video Mới
          </h2>
          <Link href="/category/video" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors">
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {videoGrid.map(post => <Cards.VideoCard key={`video-${post.id}`} article={post} />)}
        </div>
      </div>

      {/* 7. EDITOR'S PICKS ("Lựa chọn của Editor") */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-4 mb-10">
          Lựa chọn của Editor
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {editorPicks.map(post => <Cards.EditorCard key={`editor-${post.id}`} article={post} />)}
        </div>
      </div>

      {/* 8. NEWSLETTER SECTION */}
      <NewsletterSection />
      
    </main>
  );
}
