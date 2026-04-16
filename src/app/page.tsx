import { getPosts, formatDate } from "@/lib/notion";
import type { ArticleData } from "@/lib/notion";
import { getLatestYoutubeVideos } from "@/lib/youtube";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import Link from "next/link";
import SafeImage from "@/components/ui/SafeImage";
import { Clock, PlayCircle, ArrowRight, ShieldCheck, MonitorPlay, BrainCircuit } from "lucide-react";
import Ticker from "@/components/ui/Ticker";
import NewsletterSection from "@/components/ui/NewsletterSection";
import LoadMorePosts from "@/components/ui/LoadMorePosts";
import AdBanner from "@/components/ui/AdBanner";
import YoutubeCarousel from "@/components/ui/YoutubeCarousel";
import * as Cards from "@/components/ui/ArticleCards";
import { Suspense } from "react";

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

// ── Skeleton placeholders for streamed sections ──

function SectionSkeleton({ height = "h-96" }: { height?: string }) {
  return (
    <div className={`${height} rounded-2xl bg-gray-100/60 animate-pulse mb-12`} />
  );
}

// ── Below-fold sections loaded lazily ──

async function MagazineSection({ allPosts }: { allPosts: ArticleData[] }) {
  const magTop = allPosts[6] || allPosts[0];
  const magHero = allPosts[7] || allPosts[1];
  const magGrid = getCircular(allPosts, 8, 4);

  return (
    <div className="flex flex-col w-full mb-16 pb-12 relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      <Link href={`/article/${magTop.slug}`} className="flex flex-col md:flex-row gap-6 mb-10 group cursor-pointer">
        <div className="w-full md:w-[380px] shrink-0 aspect-[16/9] rounded-lg overflow-hidden relative border border-gray-100">
          <SafeImage src={magTop.coverImage} alt={magTop.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="380px" fallbackSrc={magTop.contentFirstImage} />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-3">
            <span className="text-[#ef4444] text-[11px] font-bold uppercase tracking-widest border-b-2 border-[#ef4444] pb-1">Đặc biệt</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-3">
            {magTop.title}
          </h2>
          <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2 mb-4">
            {stripMarkdown(magTop.excerpt)}
          </p>
          <div className="flex items-center text-[12px] text-gray-400 gap-3">
            <span>By <span className="font-bold text-gray-700">{magTop.author.toUpperCase()}</span></span>
            <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(magTop.date)}</span>
          </div>
        </div>
      </Link>

      <Link href={`/article/${magHero.slug}`} className="relative w-full aspect-[16/9] md:aspect-[2.5/1] rounded-lg overflow-hidden mb-12 group cursor-pointer block">
        <SafeImage src={magHero.coverImage} alt={magHero.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="100vw" fallbackSrc={magHero.contentFirstImage} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end items-center pb-10 px-4 text-center">
          <span className="bg-[#ef4444] text-white text-[11px] font-bold px-3 py-1 uppercase tracking-widest mb-4">{magHero.category}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-4xl leading-tight drop-shadow-lg">
            {magHero.title}
          </h2>
        </div>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {magGrid.map(post => <Cards.MagazineGridCard key={`mag-g-${post.id}`} article={post} />)}
      </div>
    </div>
  );
}

async function AsymmetricSection({ allPosts }: { allPosts: ArticleData[] }) {
  const asymLarge = allPosts[12] || allPosts[2];
  const asymList = getCircular(allPosts, 13, 3);

  return (
    <div className="flex flex-col lg:flex-row gap-10 mb-16">
      <div className="flex-1 flex flex-col gap-8">
        <Link href={`/article/${asymLarge.slug}`} className="flex flex-col gap-4 border-b border-gray-200 pb-8 group cursor-pointer">
          <div className="w-full aspect-[16/9] rounded-lg overflow-hidden relative border border-gray-100">
            <SafeImage src={asymLarge.coverImage} alt={asymLarge.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 1024px) 100vw, 65vw" fallbackSrc={asymLarge.contentFirstImage} />
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest">{asymLarge.category}</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors">
              {asymLarge.title}
            </h2>
            <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2 mt-2">
              {stripMarkdown(asymLarge.excerpt)}
            </p>
            <div className="flex items-center text-[12px] text-gray-400 gap-2 mt-2">
              <span>By <span className="font-bold text-gray-700">{asymLarge.author.toUpperCase()}</span></span>
              <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(asymLarge.date)}</span>
            </div>
          </div>
        </Link>
        {asymList.map(post => <Cards.ListCard key={`asym-l-${post.id}`} article={post} />)}
      </div>
      <aside className="w-full lg:w-[300px] shrink-0">
        <div className="sticky top-28">
          <AdBanner size="sidebar" slotId="home-sidebar" />
        </div>
      </aside>
    </div>
  );
}

async function NotableSection({ allPosts }: { allPosts: ArticleData[] }) {
  const notableGrid = getCircular(allPosts, 16, 3);

  return (
    <div className="mb-4 bg-white/70 backdrop-blur-md rounded-2xl p-6 md:p-10 border border-gray-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-gray-200/70 pb-4 mb-10">
        <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">Đáng chú ý</h2>
        <div className="hidden md:flex gap-8 overflow-x-auto whitespace-nowrap">
          <button className="text-[#2563eb] font-bold border-b-2 border-[#2563eb] pb-4 -mb-[17px] px-1">Tất cả</button>
          <button className="text-gray-500 font-semibold hover:text-gray-900 pb-4 -mb-[17px] px-1 transition-colors">AI</button>
          <button className="text-gray-500 font-semibold hover:text-gray-900 pb-4 -mb-[17px] px-1 transition-colors">Công Nghệ</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {notableGrid.map((post, idx) => {
          const icons = [<ShieldCheck key="i1" size={14} />, <MonitorPlay key="i2" size={14} />, <BrainCircuit key="i3" size={14} />];
          return (
            <div key={`notable-${post.id}`} className="flex flex-col h-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex-grow">
                <Cards.GridCard article={post} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 uppercase tracking-wider mt-5">
                 {icons[idx % 3]} <span>{post.category}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function VideoSection() {
  const youtubeVideos = await getLatestYoutubeVideos();

  return (
    <div className="mb-16 bg-gray-950 rounded-xl p-6 md:p-10 text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-10">
        <h2 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-3">
          <PlayCircle className="text-[#ff0000]" size={28} /> Video Mới
        </h2>
        <a href="#" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors">
          Xem tất cả <ArrowRight size={16} />
        </a>
      </div>
      {youtubeVideos.length > 0 ? (
        <YoutubeCarousel videos={youtubeVideos} />
      ) : (
        <div className="text-gray-500 py-10 text-center flex flex-col items-center">
           <PlayCircle size={48} className="mb-4 opacity-20" />
           <p>Chưa có video nào. Hãy thêm Kênh YouTube ở giao diện Publisher.</p>
        </div>
      )}
    </div>
  );
}

async function EditorPicksSection({ allPosts }: { allPosts: ArticleData[] }) {
  const editorPicks = getCircular(allPosts, 23, 2);

  return (
    <div className="mb-4 bg-white/70 backdrop-blur-md rounded-2xl p-6 md:p-10 border border-gray-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest border-b border-gray-200/70 pb-4 mb-10">
        Lựa chọn của Editor
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {editorPicks.map(post => <Cards.EditorCard key={`editor-${post.id}`} article={post} />)}
      </div>
    </div>
  );
}

// ── Main Page ──

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

  // --- Above-the-fold data (renders immediately) ---
  const heroLarge = getCircular(allPosts, 0, 2);
  const heroSmall = getCircular(allPosts, 2, 3);
  const tickerArticles = getCircular(allPosts, 5, Math.min(5, allPosts.length));

  return (
    <main className="relative min-h-screen">
      {/* Visible gradient background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#ede9fe]"></div>
      {/* Visible floating gradient orbs */}
      <div className="fixed -z-10 top-[10%] -left-[5%] w-[700px] h-[700px] bg-[#2563eb]/[0.12] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed -z-10 top-[40%] -right-[5%] w-[600px] h-[600px] bg-[#7c3aed]/[0.10] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed -z-10 bottom-[5%] left-[20%] w-[500px] h-[500px] bg-[#06b6d4]/[0.08] rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col w-full">
      
      {/* ═══ ABOVE THE FOLD — renders immediately ═══ */}

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
      <Ticker articles={tickerArticles} />

      {/* Ad: Leaderboard after ticker */}
      <AdBanner size="leaderboard" slotId="home-after-ticker" />

      {/* ═══ BELOW THE FOLD — streamed with Suspense ═══ */}

      {/* 3. FEATURED MAGAZINE LAYOUT */}
      <Suspense fallback={<SectionSkeleton height="h-[600px]" />}>
        <MagazineSection allPosts={allPosts} />
      </Suspense>

      {/* Gradient section divider */}
      <div className="w-full flex items-center gap-4 mb-12">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#2563eb]/20 to-transparent"></div>
        <div className="w-2 h-2 rounded-full bg-[#2563eb]/20"></div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#2563eb]/20 to-transparent"></div>
      </div>

      {/* 4. ASYMMETRIC LAYOUT (List + Sidebar) */}
      <Suspense fallback={<SectionSkeleton height="h-[500px]" />}>
        <AsymmetricSection allPosts={allPosts} />
      </Suspense>

      {/* 5. NOTABLE GRID */}
      <Suspense fallback={<SectionSkeleton height="h-[400px]" />}>
        <NotableSection allPosts={allPosts} />
      </Suspense>

      {/* Ad: Leaderboard between Notable and Video */}
      <AdBanner size="leaderboard" slotId="home-before-video" />

      {/* 6. VIDEO SECTION */}
      <Suspense fallback={<SectionSkeleton height="h-[350px]" />}>
        <VideoSection />
      </Suspense>

      {/* 7. EDITOR'S PICKS */}
      <Suspense fallback={<SectionSkeleton height="h-[400px]" />}>
        <EditorPicksSection allPosts={allPosts} />
      </Suspense>

      {/* Ad: Banner before newsletter */}
      <AdBanner size="banner" slotId="home-before-newsletter" />

      {/* 8. NEWSLETTER SECTION */}
      <NewsletterSection />

      {/* 9. LOAD MORE POSTS — Infinite browse */}
      <LoadMorePosts />
      
      </div>
    </main>
  );
}
