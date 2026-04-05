import { ArticleData, formatDate } from "@/lib/notion";
import SafeImage from "@/components/ui/SafeImage";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import CategorySubscribeButton from "@/components/ui/CategorySubscribeButton";
import Link from "next/link";
import { Clock, Cpu, Terminal, Smartphone, Wifi, Zap, Monitor, Brain, Sparkles, Bot, Network, Newspaper, Globe, TrendingUp, Flame, Radio } from "lucide-react";
import AdBanner from "@/components/ui/AdBanner";

interface LayoutProps {
  categoryName: string;
  slug: string;
  posts: ArticleData[];
}

/**
 * Layout 1: Tin Tức / News Style (Breaking news header + hero + sidebar)
 */
export function NewsLayout({ categoryName, slug, posts }: LayoutProps) {
  const heroPost = posts[0];
  const featuredStrip = posts.slice(1, 4);
  const editorPick = posts[4];
  const gridPosts = posts.slice(5, 9);
  const sidebarPosts = posts.slice(9, 14);
  const remainingPosts = posts.slice(14);

  return (
    <div className="relative font-sans text-gray-800">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#fef2f2] via-[#faf8f6] to-[#fffbeb]"></div>
      <div className="fixed -z-10 top-[15%] -left-[5%] w-[600px] h-[600px] bg-[#dc2626]/[0.08] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed -z-10 top-[50%] -right-[5%] w-[500px] h-[500px] bg-[#f59e0b]/[0.07] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed -z-10 bottom-[10%] left-[25%] w-[400px] h-[400px] bg-[#ea580c]/[0.05] rounded-full blur-[100px] pointer-events-none"></div>

      {/* Crimson newspaper header */}
      <div className="relative bg-gradient-to-br from-[#1a0505] via-[#2a0a0a] to-[#120303] overflow-hidden">
        {/* Headline-style horizontal lines */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, #ef4444, #ef4444 1px, transparent 1px, transparent 8px)`,
          backgroundSize: '100% 8px'
        }}></div>
        {/* Accent orbs */}
        <div className="absolute -top-20 right-[20%] w-96 h-96 bg-[#dc2626]/15 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-0 left-[10%] w-72 h-72 bg-[#f59e0b]/8 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#dc2626]/5 rounded-full blur-[120px]"></div>

        {/* Floating news icon badges */}
        <div className="absolute top-8 right-[14%] w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center backdrop-blur-sm">
          <Newspaper size={20} className="text-[#fca5a5]/50" />
        </div>
        <div className="absolute bottom-10 right-[28%] w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Globe size={16} className="text-[#f59e0b]/40" />
        </div>
        <div className="absolute top-14 left-[8%] w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center">
          <Radio size={15} className="text-[#fca5a5]/40" />
        </div>
        <div className="absolute bottom-8 left-[18%] w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center">
          <TrendingUp size={14} className="text-[#f59e0b]/35" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#dc2626]/20 border border-[#dc2626]/30 flex items-center justify-center">
                  <Newspaper size={20} className="text-[#fca5a5]" />
                </div>
                <span className="text-[#fca5a5] font-bold tracking-[0.25em] uppercase text-[11px]">Chuyên mục</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase text-white leading-none">
                {categoryName}
              </h1>
              <p className="text-[#fca5a5]/60 text-[13px] mt-3 font-mono tracking-wide">{'>'} Breaking News & Headlines</p>
            </div>
            <p className="text-gray-400 max-w-md text-[14px] leading-relaxed border-l-2 border-[#dc2626] pl-5 pb-1">
              Cập nhật nhanh nhất những tin tức nóng hổi, thời sự và xu hướng đang được quan tâm.
            </p>
          </div>
        </div>
      </div>

      {/* BREAKING ticker bar */}
      <div className="bg-gradient-to-r from-[#1a0505] to-[#2a0a0a] border-b border-[#dc2626]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 py-3 overflow-x-auto scrollbar-hide text-[11px] uppercase tracking-widest">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse"></div>
              <span className="text-[#dc2626] font-bold">Breaking</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Flame size={12} className="text-[#f59e0b]" />
              <span className="text-gray-400"><span className="text-white font-bold">{posts.length}</span> bài viết</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Globe size={12} className="text-[#fca5a5]" />
              <span className="text-gray-500">Thời sự</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TrendingUp size={12} className="text-[#22c55e]" />
              <span className="text-gray-500">Xu hướng</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Radio size={12} className="text-[#60a5fa]" />
              <span className="text-gray-500">Phân tích</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Hero Post */}
      {heroPost && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href={`/article/${heroPost.slug}`} className="group cursor-pointer flex flex-col md:flex-row bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md hover:shadow-xl transition-all">
            <div className="w-full md:w-[58%] relative aspect-[16/10] md:aspect-auto md:min-h-[380px] overflow-hidden shrink-0">
              <SafeImage src={heroPost.coverImage} alt={heroPost.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#dc2626] via-[#f59e0b] to-transparent"></div>
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="bg-[#dc2626] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-red-500/30 flex items-center gap-1.5"><Flame size={12} /> Nóng</span>
              </div>
            </div>
            <div className="p-7 md:p-10 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper size={14} className="text-[#dc2626]" />
                <span className="text-[#dc2626] text-[10px] font-bold uppercase tracking-widest">Tiêu điểm</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black leading-snug mb-4 group-hover:text-[#dc2626] transition-colors text-gray-900">{heroPost.title}</h2>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-5 line-clamp-3">{stripMarkdown(heroPost.excerpt)}</p>
              <div className="flex items-center text-[11px] text-gray-400 gap-4 uppercase tracking-wide">
                <span>By <span className="font-bold text-gray-700">{heroPost.author.toUpperCase()}</span></span>
                <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(heroPost.date)}</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* 3-Card Featured Strip */}
      {featuredStrip.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-7 bg-[#dc2626] rounded-full"></div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">🔥 Tin nóng</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredStrip.map((post, idx) => {
              const accents = ['#dc2626', '#f59e0b', '#ea580c'];
              return (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${accents[idx]}, transparent)` }}></div>
                    <div className="absolute top-3 left-3">
                      <span className="text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg" style={{ backgroundColor: accents[idx] }}>{post.category}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[16px] font-bold leading-snug text-gray-900 line-clamp-2 group-hover:text-[#dc2626] transition-colors mb-2">{post.title}</h3>
                    <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                      <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                      <span>• {formatDate(post.date)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad: Leaderboard after Tin nóng */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdBanner size="leaderboard" slotId={`${slug}-top`} />
      </div>

      {/* Main Content + Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Column */}
          <div className="flex-1 min-w-0">
            {/* Editor's Pick — horizontal spotlight */}
            {editorPick && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-[#f59e0b] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">📰 Editor&apos;s Pick</h2>
                </div>
                <Link href={`/article/${editorPick.slug}`} className="group cursor-pointer flex flex-col md:flex-row bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#dc2626]/30 transition-all">
                  <div className="w-full md:w-[55%] relative aspect-[16/10] md:aspect-auto md:min-h-[260px] overflow-hidden shrink-0">
                    <SafeImage src={editorPick.coverImage} alt={editorPick.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#f59e0b] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center gap-1"><TrendingUp size={11} /> {editorPick.category}</span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-center">
                    <h3 className="text-xl md:text-2xl font-bold leading-snug mb-3 group-hover:text-[#dc2626] transition-colors text-gray-900">{editorPick.title}</h3>
                    <p className="text-gray-500 text-[14px] leading-relaxed mb-4 line-clamp-3">{stripMarkdown(editorPick.excerpt)}</p>
                    <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                      <span>By <span className="font-bold text-gray-700">{editorPick.author.toUpperCase()}</span></span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(editorPick.date)}</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* 2-Column Card Grid */}
            {gridPosts.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-[#ea580c] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">Mới nhất</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {gridPosts.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#dc2626]/20 transition-all">
                      <div className="relative overflow-hidden aspect-[16/9]">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 50vw" />
                        <div className="absolute top-3 left-3">
                          <span className="bg-[#dc2626] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-red-500/20">{post.category}</span>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#dc2626] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <p className="text-gray-500 text-[14px] leading-relaxed mb-3 line-clamp-2 flex-grow">{stripMarkdown(post.excerpt)}</p>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
                          <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                          <span>• {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Ad: Leaderboard between grid and list */}
            <AdBanner size="leaderboard" slotId={`${slug}-mid`} />

            {/* Remaining Posts — compact list */}
            {remainingPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-gray-300 rounded-full"></div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">Tin vắn</h2>
                </div>
                <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {remainingPosts.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-5 py-4 px-5 items-center hover:bg-red-50/30 transition-colors">
                      <div className="w-[120px] md:w-[160px] shrink-0 relative aspect-[16/10] rounded-lg overflow-hidden border border-gray-100">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="160px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] md:text-[18px] font-bold leading-snug mb-1.5 group-hover:text-[#dc2626] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <p className="text-gray-500 text-[14px] leading-relaxed line-clamp-1 mb-2 hidden md:block">{stripMarkdown(post.excerpt)}</p>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                          <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                          <span>• {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-[300px] shrink-0">
            <div className="sticky top-28 flex flex-col gap-8">
              {/* Most Read / Hot */}
              {sidebarPosts.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-7 bg-[#dc2626] rounded-full"></div>
                    <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">🔥 Đọc nhiều</h2>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {sidebarPosts.map((post, idx) => (
                      <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-3.5 p-4 items-center border-b border-gray-50 last:border-0 hover:bg-red-50/30 transition-colors">
                        <div className="text-2xl font-black leading-none select-none w-7 text-center shrink-0" style={{
                          color: idx === 0 ? '#dc2626' : idx === 1 ? '#f59e0b' : idx === 2 ? '#ea580c' : '#d4d4d8'
                        }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-bold leading-snug mb-1 group-hover:text-[#dc2626] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                          <span className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">{formatDate(post.date)}</span>
                        </div>
                        <div className="w-14 h-14 shrink-0 overflow-hidden rounded-lg border border-gray-100">
                          <SafeImage src={post.coverImage} alt={post.title} width={56} height={56} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Ad: Sidebar rectangle */}
              <AdBanner size="sidebar" slotId={`${slug}-sidebar`} />

              {/* News Topics Tag Cloud */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 bg-[#f59e0b] rounded-full"></div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">Chủ đề</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Thời sự', 'Kinh tế', 'Thế giới', 'Xã hội', 'Giáo dục', 'Pháp luật', 'Sức khỏe', 'Văn hóa', 'Thể thao', 'Giải trí', 'Đời sống', 'Khoa học'].map(tag => (
                    <span key={tag} className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-[#dc2626] hover:text-white hover:border-[#dc2626] transition-all cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* News Newsletter CTA */}
              <div className="bg-gradient-to-br from-[#1a0505] via-[#2a0a0a] to-[#3a0e0e] rounded-xl p-6 text-center border border-[#dc2626]/20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.05]" style={{
                  backgroundImage: `repeating-linear-gradient(0deg, #fca5a5, #fca5a5 1px, transparent 1px, transparent 10px)`,
                  backgroundSize: '100% 10px'
                }}></div>
                <div className="relative z-10">
                  <div className="text-3xl mb-3">📰</div>
                  <h4 className="font-bold mb-2 text-white text-sm uppercase tracking-widest">Tin tức hàng ngày</h4>
                  <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">Nhận tin nóng và phân tích chuyên sâu mỗi sáng.</p>
                  <CategorySubscribeButton categorySlug="tin-tuc" categoryName="Tin tức" accentColor="#dc2626" />
                </div>
              </div>

              {/* Editor's Quote Widget */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#dc2626]/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#dc2626]/10 flex items-center justify-center">
                      <span className="text-sm">✍️</span>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">Từ Ban biên tập</h3>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed italic">&ldquo;Báo chí không chỉ là ghi lại sự kiện — mà là <span className="font-bold text-[#dc2626] not-italic">soi sáng sự thật</span> đằng sau mỗi câu chuyện.&rdquo;</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Layout 2: Game & Giả Lập Style (Cinematic hero + featured strip + sidebar layout)
 */
export function AlternateLayout({ categoryName, slug, posts }: LayoutProps) {
  const heroPost = posts[0];
  const stripPosts = posts.slice(1, 5);
  const spotlightPost = posts[5];
  const gridPosts = posts.slice(6, 10);
  const sidebarPosts = posts.slice(10, 15);
  const remainingPosts = posts.slice(15);

  return (
    <div className="relative font-sans text-gray-800">
      {/* Gaming ambient — diagonal purple streak + bottom neon glow */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#f5f3ff] via-[#faf9fc] to-[#f0ebfa]"></div>
      <div className="fixed -z-10 -top-[10%] left-[40%] w-[800px] h-[400px] bg-[#7c3aed]/[0.12] rounded-full blur-[140px] pointer-events-none rotate-[-20deg]"></div>
      <div className="fixed -z-10 bottom-[5%] -left-[10%] w-[700px] h-[350px] bg-[#8b5cf6]/[0.09] rounded-full blur-[130px] pointer-events-none rotate-[15deg]"></div>
      <div className="fixed -z-10 bottom-[20%] right-[10%] w-[300px] h-[300px] bg-[#c084fc]/[0.07] rounded-full blur-[80px] pointer-events-none"></div>
      <div className="fixed -z-10 top-[60%] left-[50%] -translate-x-1/2 w-[900px] h-[200px] bg-[#6d28d9]/[0.04] rounded-full blur-[100px] pointer-events-none"></div>

      {/* Cinematic Full-Width Hero */}
      {heroPost && (
        <div className="relative">
          <Link href={`/article/${heroPost.slug}`} className="block relative w-full h-[400px] md:h-[520px] overflow-hidden group cursor-pointer">
            <SafeImage src={heroPost.coverImage} alt={heroPost.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-105" priority />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a2e] via-[#1a0a2e]/50 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a0a2e]/60 via-transparent to-transparent"></div>
            {/* Pixel grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `linear-gradient(90deg, #a78bfa 1px, transparent 1px), linear-gradient(#a78bfa 1px, transparent 1px)`,
              backgroundSize: '32px 32px'
            }}></div>
            {/* Neon glow */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8b5cf6]/10 rounded-full blur-[120px]"></div>

            <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 max-w-7xl mx-auto relative z-10">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-[#8b5cf6] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/40">🎮 {heroPost.category}</span>
                  <span className="bg-[#ec4899] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-pink-500/30">Tiêu điểm</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 drop-shadow-lg">{heroPost.title}</h1>
                <p className="text-gray-300 text-[15px] leading-relaxed line-clamp-2 mb-4 max-w-xl">{stripMarkdown(heroPost.excerpt)}</p>
                <div className="flex items-center text-[11px] text-gray-400 gap-4 uppercase tracking-wide">
                  <span>By <span className="font-bold text-white">{heroPost.author.toUpperCase()}</span></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(heroPost.date)}</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Horizontal Featured Strip — overlapping hero */}
      {stripPosts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stripPosts.map((post, idx) => {
              const accentColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b'];
              const accent = accentColors[idx % 4];
              return (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all overflow-hidden">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: accent }}></div>
                  </div>
                  <div className="p-3.5">
                    <h3 className="text-[16px] font-bold leading-snug text-gray-900 line-clamp-2 group-hover:text-[#7c3aed] transition-colors">{post.title}</h3>
                    <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-2">
                      <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                      <span>• {formatDate(post.date)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad: Leaderboard after featured strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdBanner size="leaderboard" slotId={`${slug}-top`} />
      </div>

      {/* Main Content: 2-Column + Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Column */}
          <div className="flex-1 min-w-0">
            {/* Spotlight Post — large horizontal card */}
            {spotlightPost && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-[#8b5cf6] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">Nổi bật</h2>
                </div>
                <Link href={`/article/${spotlightPost.slug}`} className="group cursor-pointer flex flex-col md:flex-row bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#8b5cf6]/30 transition-all">
                  <div className="w-full md:w-[55%] relative aspect-[16/10] md:aspect-auto md:min-h-[280px] overflow-hidden shrink-0">
                    <SafeImage src={spotlightPost.coverImage} alt={spotlightPost.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#8b5cf6] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/25">{spotlightPost.category}</span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-center">
                    <h3 className="text-xl md:text-2xl font-bold leading-snug mb-3 group-hover:text-[#7c3aed] transition-colors text-gray-900">{spotlightPost.title}</h3>
                    <p className="text-gray-500 text-[14px] leading-relaxed mb-4 line-clamp-3">{stripMarkdown(spotlightPost.excerpt)}</p>
                    <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                      <span>By <span className="font-bold text-gray-700">{spotlightPost.author.toUpperCase()}</span></span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(spotlightPost.date)}</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* 2-Column Mini Grid */}
            {gridPosts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-[#ec4899] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">Mới nhất</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {gridPosts.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#8b5cf6]/30 transition-all">
                      <div className="relative overflow-hidden aspect-[16/9]">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 50vw" />
                        <div className="absolute top-3 left-3">
                          <span className="bg-[#ec4899] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-pink-500/25">{post.category}</span>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#7c3aed] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <p className="text-gray-500 text-[14px] leading-relaxed mb-3 line-clamp-2 flex-grow">{stripMarkdown(post.excerpt)}</p>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
                          <span>By <span className="font-bold text-gray-700">{post.author.toUpperCase()}</span></span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Ad: Leaderboard between grid and list */}
            <AdBanner size="leaderboard" slotId={`${slug}-mid`} />

            {/* Remaining Posts — compact horizontal cards */}
            {remainingPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-gray-300 rounded-full"></div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">Xem thêm</h2>
                </div>
                <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {remainingPosts.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-4 p-4 hover:bg-purple-50/50 transition-colors items-center">
                      <div className="w-[120px] md:w-[160px] shrink-0 relative aspect-[16/10] rounded-lg overflow-hidden border border-gray-100">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="160px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] md:text-[18px] font-bold leading-snug mb-1.5 group-hover:text-[#7c3aed] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                          <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                          <span>• {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-[300px] shrink-0">
            <div className="sticky top-28 flex flex-col gap-8">
              {/* Trending in Gaming */}
              {sidebarPosts.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-7 bg-[#8b5cf6] rounded-full"></div>
                    <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">🔥 Hot</h2>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {sidebarPosts.map((post, idx) => (
                      <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-3.5 p-4 items-center border-b border-gray-50 last:border-0 hover:bg-purple-50/50 transition-colors">
                        <div className="text-2xl font-black leading-none select-none w-7 text-center shrink-0" style={{
                          color: idx === 0 ? '#8b5cf6' : idx === 1 ? '#ec4899' : idx === 2 ? '#06b6d4' : '#d4d4d8'
                        }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-bold leading-snug mb-1 group-hover:text-[#7c3aed] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                          <span className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">{formatDate(post.date)}</span>
                        </div>
                        <div className="w-14 h-14 shrink-0 overflow-hidden rounded-lg border border-gray-100">
                          <SafeImage src={post.coverImage} alt={post.title} width={56} height={56} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Ad: Sidebar rectangle */}
              <AdBanner size="sidebar" slotId={`${slug}-sidebar`} />

              {/* Gaming Newsletter CTA */}
              <div className="bg-gradient-to-br from-[#1a0a2e] to-[#2d1650] rounded-xl p-6 text-center border border-[#8b5cf6]/20">
                <div className="text-3xl mb-3">🎮</div>
                <h4 className="font-bold mb-2 text-white text-sm uppercase tracking-widest">Game Newsletter</h4>
                <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">Nhận tin game & giả lập mới nhất vào email mỗi tuần.</p>
                <CategorySubscribeButton categorySlug="game-gia-lap" categoryName="Game & Giả Lập" accentColor="#8b5cf6" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Layout 3: Technology / Dense News Style (Hero Bento + Dense Grid + Sidebar)
 */
export function MagazineLayout({ categoryName, slug, posts }: LayoutProps) {
  const heroMain = posts[0];
  const heroSide = posts.slice(1, 3);
  const gridPosts = posts.slice(3, 9);
  const sidebarPosts = posts.slice(9, 14);
  const listPosts = posts.slice(14);

  const techIcons = [Smartphone, Monitor, Wifi, Zap, Cpu];

  return (
    <div className="relative font-sans text-gray-800">
      {/* Tech ambient — wide horizontal blue band + corner accent */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-r from-[#eff6ff] via-[#f8fafc] to-[#eff6ff]"></div>
      <div className="fixed -z-10 top-[30%] left-[50%] -translate-x-1/2 w-[1200px] h-[300px] bg-[#2563eb]/[0.08] rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed -z-10 -top-[5%] -right-[10%] w-[500px] h-[500px] bg-[#0ea5e9]/[0.10] rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed -z-10 bottom-[5%] -left-[8%] w-[400px] h-[400px] bg-[#3b82f6]/[0.06] rounded-full blur-[90px] pointer-events-none"></div>
      <div className="fixed -z-10 inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      {/* Tech-themed Hero Banner */}
      <div className="relative bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0c1222] overflow-hidden">
        {/* Circuit-line pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `
            linear-gradient(90deg, #3b82f6 1px, transparent 1px),
            linear-gradient(#3b82f6 1px, transparent 1px),
            radial-gradient(circle, #3b82f6 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px, 48px 48px, 16px 16px',
          backgroundPosition: '0 0, 0 0, 8px 8px'
        }}></div>
        {/* Accent orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#2563eb]/20 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-32 -left-20 w-64 h-64 bg-[#06b6d4]/15 rounded-full blur-[80px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7c3aed]/8 rounded-full blur-[120px]"></div>

        {/* Floating tech icon badges */}
        <div className="absolute top-8 right-[15%] w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center backdrop-blur-sm">
          <Smartphone size={18} className="text-[#60a5fa]/60" />
        </div>
        <div className="absolute bottom-12 right-[25%] w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Wifi size={16} className="text-[#06b6d4]/50" />
        </div>
        <div className="absolute top-16 left-[12%] w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center">
          <Monitor size={14} className="text-[#a78bfa]/50" />
        </div>
        <div className="absolute bottom-8 left-[8%] w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Cpu size={15} className="text-[#60a5fa]/40" />
        </div>
        <div className="absolute top-20 right-[8%] w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center">
          <Zap size={13} className="text-[#f59e0b]/40" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center">
                  <Zap size={20} className="text-[#60a5fa]" />
                </div>
                <span className="text-[#60a5fa] font-bold tracking-[0.2em] uppercase text-[11px]">Chuyên mục</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase text-white leading-none">
                {categoryName}
              </h1>
            </div>
            <p className="text-gray-400 max-w-md text-[14px] leading-relaxed pb-1 border-l-2 border-[#2563eb] pl-5">
              Cập nhật tin tức, xu hướng và những đột phá mới nhất trong thế giới công nghệ từ đội ngũ RetroLab.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Ticker Bar */}
      <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 py-3 overflow-x-auto scrollbar-hide text-[11px] uppercase tracking-widest">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></div>
              <span className="text-[#22c55e] font-bold">Live</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Zap size={12} className="text-[#60a5fa]" />
              <span className="text-gray-400"><span className="text-white font-bold">{posts.length}</span> bài viết</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Monitor size={12} className="text-[#06b6d4]" />
              <span className="text-gray-400">Gadgets & Devices</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Smartphone size={12} className="text-[#a78bfa]" />
              <span className="text-gray-400">Smartphones</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Wifi size={12} className="text-[#f59e0b]" />
              <span className="text-gray-400">Smart Home</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Cpu size={12} className="text-[#ec4899]" />
              <span className="text-gray-400">Chips & Hardware</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Bento: 1 Large Hero + 2 Side */}
        {heroMain && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-4">
            {/* Large Hero */}
            <Link href={`/article/${heroMain.slug}`} className="lg:col-span-3 relative group overflow-hidden rounded-xl cursor-pointer h-[320px] md:h-[420px] border border-gray-200 shadow-md">
              <SafeImage src={heroMain.coverImage} alt={heroMain.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
              {/* Blue accent bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb] via-[#06b6d4] to-[#8b5cf6]"></div>
              <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-3 inline-block shadow-lg shadow-blue-500/30">⚡ Nổi bật</span>
                <h2 className="text-white text-2xl md:text-3xl font-bold leading-tight mb-3 line-clamp-3">{heroMain.title}</h2>
                <p className="text-gray-300 text-[14px] leading-relaxed line-clamp-2 mb-3 max-w-xl">{stripMarkdown(heroMain.excerpt)}</p>
                <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                  <span>By <span className="font-bold text-white">{heroMain.author.toUpperCase()}</span></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(heroMain.date)}</span>
                </div>
              </div>
            </Link>

            {/* 2 Side Posts */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {heroSide.map(post => (
                <Link key={post.id} href={`/article/${post.slug}`} className="flex-1 relative group overflow-hidden rounded-xl cursor-pointer border border-gray-200 shadow-md min-h-[195px]">
                  <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
                  <div className="absolute top-3 left-3">
                    <span className="bg-[#06b6d4] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-cyan-500/25">{post.category}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 p-5 w-full">
                    <h3 className="text-white text-lg font-bold leading-snug line-clamp-2 mb-2">{post.title}</h3>
                    <div className="flex items-center text-[11px] text-gray-400 gap-2 uppercase tracking-wide">
                      <span className="font-bold text-gray-300">{post.author.toUpperCase()}</span>
                      <span>• {formatDate(post.date)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ad: Leaderboard after bento */}
        <AdBanner size="leaderboard" slotId={`${slug}-top`} />

        {/* Main Content + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main: Card Grid */}
          <div className="flex-1 min-w-0">
            {gridPosts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-7 bg-[#2563eb] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">Mới nhất</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {gridPosts.map((post, idx) => {
                    const IconComp = techIcons[idx % techIcons.length];
                    return (
                      <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#2563eb]/30 transition-all">
                        <div className="relative overflow-hidden aspect-[16/10]">
                          <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 50vw" />
                          <div className="absolute top-3 left-3">
                            <span className="bg-[#2563eb] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-blue-500/25">{post.category}</span>
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <IconComp size={14} className="text-[#2563eb]/50" />
                            <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest">{post.category}</span>
                          </div>
                          <h3 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                          <p className="text-gray-500 text-[14px] leading-relaxed mb-3 line-clamp-2 flex-grow">{stripMarkdown(post.excerpt)}</p>
                          <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
                            <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                            <span>• {formatDate(post.date)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ad: Leaderboard between grid and list */}
            <AdBanner size="leaderboard" slotId={`${slug}-mid`} />

            {/* Compact List for Remaining Posts */}
            {listPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-gray-300 rounded-full"></div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">Xem thêm</h2>
                </div>
                <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {listPosts.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-5 py-4 px-5 items-center hover:bg-blue-50/50 transition-colors">
                      <div className="w-[120px] md:w-[160px] shrink-0 relative aspect-[16/10] rounded-lg overflow-hidden border border-gray-100">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="160px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] md:text-[18px] font-bold leading-snug mb-1.5 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <p className="text-gray-500 text-[14px] leading-relaxed line-clamp-1 mb-2 hidden md:block">{stripMarkdown(post.excerpt)}</p>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                          <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                          <span>• {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-[300px] shrink-0">
            <div className="sticky top-28 flex flex-col gap-8">
              {/* Trending Tech */}
              {sidebarPosts.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-7 bg-[#2563eb] rounded-full"></div>
                    <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">📱 Trending</h2>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {sidebarPosts.map((post, idx) => {
                      const SideIcon = techIcons[idx % techIcons.length];
                      return (
                        <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-3.5 p-4 items-center border-b border-gray-50 last:border-0 hover:bg-blue-50/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center shrink-0">
                            <SideIcon size={16} className="text-[#2563eb]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold leading-snug mb-1 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                            <span className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">{formatDate(post.date)}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ad: Sidebar rectangle */}
              <AdBanner size="sidebar" slotId={`${slug}-sidebar`} />

              {/* Tech Newsletter CTA */}
              <div className="bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] rounded-xl p-6 text-center border border-[#2563eb]/20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: `radial-gradient(circle, #3b82f6 1px, transparent 1px)`,
                  backgroundSize: '16px 16px'
                }}></div>
                <div className="relative z-10">
                  <div className="text-3xl mb-3">⚡</div>
                  <h4 className="font-bold mb-2 text-white text-sm uppercase tracking-widest">Tech Update</h4>
                  <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">Nhận tin công nghệ mới nhất vào email mỗi tuần.</p>
                  <CategorySubscribeButton categorySlug="cong-nghe" categoryName="Công Nghệ" accentColor="#2563eb" />
                </div>
              </div>

              {/* Hot Topics Tag Cloud */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 bg-[#06b6d4] rounded-full"></div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">Hot Topics</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['AI', 'Smartphone', '5G', 'IoT', 'Cloud', 'EV', 'VR/AR', 'Chip', 'Robot', 'Wearable', 'Security', 'Blockchain'].map(tag => (
                    <span key={tag} className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] transition-all cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tech Tip Widget */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#2563eb]/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center">
                      <span className="text-sm">💡</span>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">Mẹo Tech</h3>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">Bạn biết chưa? Sạc nhanh USB-C PD 3.1 hiện có thể cung cấp tới <span className="font-bold text-[#2563eb]">240W</span> — đủ để sạc cả laptop gaming!</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Layout 4: Default / Featured Grid Style
 */
export function DefaultCategoryLayout({ categoryName, slug, posts }: LayoutProps) {
  const featured = posts.slice(0, 5);
  const listItems = posts.slice(5);

  return (
    <div className="relative font-sans text-gray-800">
      {/* Default ambient — single centered soft glow */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#f0f2f8] via-white to-[#f8f9fc]"></div>
      <div className="fixed -z-10 top-[35%] left-[50%] -translate-x-1/2 w-[900px] h-[900px] bg-[#2563eb]/[0.06] rounded-full blur-[180px] pointer-events-none"></div>

      {/* Dark Header with Dot Pattern and 5-Post Grid */}
      <div className="bg-[#1a1f2e] pt-16 pb-20 relative overflow-hidden">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(#4b5563 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-black tracking-widest uppercase text-white mb-6">
              {categoryName}
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto text-[15px] leading-relaxed">
              Nơi tổng hợp những tin tức, kiến thức và xu hướng mới nhất trong lĩnh vực Công Nghệ Thông Tin từ đội ngũ RetroLab.
            </p>
          </div>

          {/* 5-Post Bento Grid (2-1-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            {/* Left Column (2 Small) */}
            <div className="flex flex-col gap-6">
              {featured.slice(0, 2).map(post => (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer">
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3 border border-white/10">
                    <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                      <span className="bg-[#2563eb] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">{categoryName}</span>
                    </div>
                  </div>
                  <h3 className="text-white text-sm font-bold leading-snug text-center group-hover:text-[#2563eb] transition-colors line-clamp-2 px-2">
                    {post.title}
                  </h3>
                </Link>
              ))}
            </div>

            {/* Middle Column (1 Large Center) */}
            <div className="lg:col-span-2">
              {featured[2] && (
                <Link href={`/article/${featured[2].slug}`} className="group cursor-pointer h-full flex flex-col">
                  <div className="relative flex-grow min-h-[300px] md:min-h-[400px] rounded-lg overflow-hidden mb-4 border border-white/10">
                    <SafeImage src={featured[2].coverImage} alt={featured[2].title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#2563eb] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">{categoryName}</span>
                    </div>
                  </div>
                  <h3 className="text-white text-xl md:text-2xl lg:text-3xl font-bold leading-tight text-center group-hover:text-[#2563eb] transition-colors px-4">
                    {featured[2].title}
                  </h3>
                </Link>
              )}
            </div>

            {/* Right Column (2 Small) */}
            <div className="flex flex-col gap-6 font-bold">
              {featured.slice(3, 5).map(post => (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer">
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3 border border-white/10">
                    <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                      <span className="bg-[#2563eb] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">AI</span>
                    </div>
                  </div>
                  <h3 className="text-white text-sm font-bold leading-snug text-center group-hover:text-[#2563eb] transition-colors line-clamp-2 px-2">
                    {post.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col gap-12">
          {listItems.length > 0 ? listItems.map(post => (
            <Link key={post.id} href={`/article/${post.slug}`} className="flex flex-col md:flex-row gap-8 group cursor-pointer border-b border-gray-100 pb-12 last:border-0 last:pb-0">
              <div className="w-full md:w-[320px] shrink-0 relative aspect-video rounded-xl overflow-hidden border border-gray-100">
                <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest mb-2">{categoryName}</span>
                <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-4 group-hover:text-[#2563eb] transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-500 text-[15px] leading-relaxed mb-6 line-clamp-2">
                  {stripMarkdown(post.excerpt)}
                </p>
                <div className="flex items-center text-[11px] text-gray-400 gap-4 font-bold uppercase tracking-wider">
                  <span>By <span className="text-gray-700">{post.author}</span></span>
                  <span>{formatDate(post.date)}</span>
                </div>
              </div>
            </Link>
          )) : (
            <div className="text-center py-20 text-gray-400 font-medium">Chưa có bài viết bổ sung trong chuyên mục này.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Layout 5: IT / Công Nghệ Thông Tin Style (Teal accent, circuit pattern, editorial grid)
 */
export function ITLayout({ categoryName, slug, posts }: LayoutProps) {
  const heroPost = posts[0];
  const featuredStrip = posts.slice(1, 4);
  const mainGrid = posts.slice(4, 10);
  const sidebarList = posts.slice(10, 15);
  const remainingPosts = posts.slice(15);

  return (
    <div className="relative font-sans text-gray-800">
      {/* IT ambient — asymmetric teal wash left + emerald corner */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-tr from-[#ecfdf5] via-[#f8fafb] to-[#fafbfc]"></div>
      <div className="fixed -z-10 top-[5%] -left-[15%] w-[800px] h-[600px] bg-[#10b981]/[0.11] rounded-full blur-[140px] pointer-events-none"></div>
      <div className="fixed -z-10 bottom-[0%] -right-[8%] w-[450px] h-[450px] bg-[#059669]/[0.07] rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed -z-10 top-[55%] left-[40%] w-[350px] h-[200px] bg-[#0d9488]/[0.05] rounded-full blur-[80px] pointer-events-none rotate-[30deg]"></div>

      {/* Header with circuit-board pattern */}
      <div className="relative bg-gradient-to-br from-[#0a1628] via-[#0f2337] to-[#071520] overflow-hidden">
        {/* Circuit board decorative pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `
            linear-gradient(90deg, #10b981 1px, transparent 1px),
            linear-gradient(#10b981 1px, transparent 1px),
            radial-gradient(circle, #10b981 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 60px 60px, 20px 20px',
          backgroundPosition: '0 0, 0 0, 10px 10px'
        }}></div>
        {/* Accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#10b981]/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-20 left-1/4 w-72 h-72 bg-[#06b6d4]/10 rounded-full blur-[100px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            {/* Left: Title block */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center">
                  <Terminal size={20} className="text-[#10b981]" />
                </div>
                <span className="text-[#10b981] font-bold tracking-[0.25em] uppercase text-[11px]">Chuyên mục</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none mb-5">
                {categoryName}
              </h1>
              <p className="text-gray-400 max-w-lg text-[14px] leading-relaxed">
                Tổng hợp tin tức, kiến thức chuyên sâu và xu hướng mới nhất trong lĩnh vực Công Nghệ Thông Tin.
              </p>
            </div>

            {/* Right: Hero post */}
            {heroPost && (
              <Link href={`/article/${heroPost.slug}`} className="flex-1 max-w-xl w-full relative group overflow-hidden rounded-xl cursor-pointer h-[280px] md:h-[320px] border border-white/10 shadow-2xl shadow-black/30">
                <SafeImage src={heroPost.coverImage} alt={heroPost.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu size={14} className="text-[#10b981]" />
                    <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">{heroPost.category}</span>
                  </div>
                  <h2 className="text-white text-xl md:text-2xl font-bold leading-tight mb-2 line-clamp-2">{heroPost.title}</h2>
                  <div className="flex items-center text-[10px] text-gray-400 gap-3 uppercase tracking-wide">
                    <span className="font-bold text-gray-300">{heroPost.author.toUpperCase()}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(heroPost.date)}</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Featured strip — 3 horizontal cards */}
      {featuredStrip.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredStrip.map(post => (
              <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-[#10b981] text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">{post.category}</span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#10b981] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                  <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
                    <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                    <span>• {formatDate(post.date)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ad: Leaderboard after featured strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdBanner size="leaderboard" slotId={`${slug}-top`} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main content: 2-column grid */}
          <div className="flex-1">
            {mainGrid.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-7 bg-[#10b981] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">Bài viết mới</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {mainGrid.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-[#10b981]/30 transition-colors">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[#10b981] text-[10px] font-bold uppercase tracking-widest">{post.category}</span>
                        </div>
                        <h3 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#10b981] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <p className="text-gray-500 text-[14px] leading-relaxed line-clamp-2 mb-3">{stripMarkdown(post.excerpt)}</p>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
                          <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                          <span>• {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Ad: Leaderboard between grid and list */}
            <AdBanner size="leaderboard" slotId={`${slug}-mid`} />

            {/* Remaining posts as compact list */}
            {remainingPosts.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-gray-300 rounded-full"></div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">Xem thêm</h2>
                </div>
                <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {remainingPosts.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-4 p-4 hover:bg-gray-50 transition-colors items-center">
                      <div className="w-[100px] md:w-[130px] shrink-0 relative aspect-[16/10] rounded-lg overflow-hidden border border-gray-100">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="130px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-bold leading-snug mb-1 group-hover:text-[#10b981] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                          <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                          <span>• {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Numbered trending list + Newsletter CTA */}
          <aside className="w-full lg:w-[300px] shrink-0">
            <div className="sticky top-28">
              {sidebarList.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-7 bg-[#10b981] rounded-full"></div>
                    <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">Đọc nhiều</h2>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
                    {sidebarList.map((post, idx) => (
                      <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-4 p-4 items-center border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="text-3xl font-black text-[#10b981]/20 leading-none select-none w-8 text-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-bold leading-snug mb-1 group-hover:text-[#10b981] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                          <span className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">{formatDate(post.date)}</span>
                        </div>
                        <div className="w-14 h-14 shrink-0 overflow-hidden rounded-lg border border-gray-100">
                          <SafeImage src={post.coverImage} alt={post.title} width={56} height={56} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {/* IT Newsletter CTA */}
              <div className="bg-gradient-to-br from-[#022c22] to-[#064e3b] rounded-xl p-6 text-center border border-[#10b981]/20 relative overflow-hidden mb-6">
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, #10b981, #10b981 1px, transparent 1px, transparent 8px)`,
                  backgroundSize: '12px 12px'
                }}></div>
                <div className="relative z-10">
                  <div className="text-3xl mb-3">💻</div>
                  <h4 className="font-bold mb-2 text-white text-sm uppercase tracking-widest">IT Weekly</h4>
                  <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">Cập nhật mới nhất về lập trình, DevOps, cloud và bảo mật.</p>
                  <CategorySubscribeButton categorySlug="it" categoryName="CNTT" accentColor="#10b981" />
                </div>
              </div>

              <AdBanner size="sidebar" slotId={`${slug}-sidebar`} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Layout 6: AI Style (Neural mesh header + AI-themed cards + sidebar)
 */
export function AILayout({ categoryName, slug, posts }: LayoutProps) {
  const heroPost = posts[0];
  const featuredStrip = posts.slice(1, 4);
  const spotlightPost = posts[4];
  const gridPosts = posts.slice(5, 9);
  const sidebarPosts = posts.slice(9, 14);
  const remainingPosts = posts.slice(14);

  const aiIcons = [Brain, Sparkles, Bot, Network, Cpu];

  return (
    <div className="relative font-sans text-gray-800">
      {/* AI ambient — split indigo/purple halves + center cyan spark */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-bl from-[#eef2ff] via-[#f5f5fa] to-[#faf5ff]"></div>
      <div className="fixed -z-10 top-[0%] -left-[10%] w-[700px] h-[500px] bg-[#6366f1]/[0.13] rounded-full blur-[130px] pointer-events-none"></div>
      <div className="fixed -z-10 bottom-[0%] -right-[10%] w-[700px] h-[500px] bg-[#8b5cf6]/[0.10] rounded-full blur-[130px] pointer-events-none"></div>
      <div className="fixed -z-10 top-[45%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] bg-[#06b6d4]/[0.10] rounded-full blur-[80px] pointer-events-none"></div>

      {/* Neural Mesh Dark Header */}
      <div className="relative bg-gradient-to-br from-[#0a0a1a] via-[#111133] to-[#0d0d24] overflow-hidden">
        {/* Neural dot pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `radial-gradient(circle, #818cf8 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        }}></div>
        {/* Connection lines pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(45deg, #818cf8 1px, transparent 1px),
            linear-gradient(-45deg, #818cf8 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}></div>
        {/* Gradient orbs */}
        <div className="absolute -top-20 right-1/4 w-[500px] h-[500px] bg-[#6366f1]/12 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#a78bfa]/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 right-[10%] w-64 h-64 bg-[#06b6d4]/8 rounded-full blur-[100px]"></div>

        {/* Floating AI icon badges */}
        <div className="absolute top-10 right-[18%] w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center backdrop-blur-sm">
          <Brain size={20} className="text-[#818cf8]/60" />
        </div>
        <div className="absolute bottom-10 right-[30%] w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Sparkles size={16} className="text-[#a78bfa]/50" />
        </div>
        <div className="absolute top-14 left-[10%] w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center">
          <Bot size={16} className="text-[#06b6d4]/50" />
        </div>
        <div className="absolute bottom-14 left-[20%] w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center">
          <Network size={14} className="text-[#818cf8]/40" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center">
                  <Brain size={22} className="text-[#818cf8]" />
                </div>
                <span className="text-[#818cf8] font-bold tracking-[0.25em] uppercase text-[11px]">Chuyên mục</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase text-white leading-none">
                Trí Tuệ Nhân Tạo
              </h1>
              <p className="text-[#818cf8]/70 text-[13px] mt-3 font-mono tracking-wide">{'>'} Artificial Intelligence & Machine Learning</p>
            </div>
            <p className="text-gray-400 max-w-md text-[14px] leading-relaxed border-l-2 border-[#6366f1] pl-5 pb-1">
              Khám phá những đột phá, xu hướng và ứng dụng mới nhất của AI đang thay đổi thế giới.
            </p>
          </div>
        </div>
      </div>

      {/* AI Metrics Bar */}
      <div className="bg-gradient-to-r from-[#0a0a1a] to-[#111133] border-b border-[#6366f1]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 py-3 overflow-x-auto scrollbar-hide text-[11px] uppercase tracking-widest">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#6366f1] animate-pulse"></div>
              <span className="text-[#818cf8] font-bold">AI Live</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Brain size={12} className="text-[#818cf8]" />
              <span className="text-gray-500"><span className="text-white font-bold">{posts.length}</span> bài viết</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Sparkles size={12} className="text-[#a78bfa]" />
              <span className="text-gray-500">LLMs & GPT</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Bot size={12} className="text-[#06b6d4]" />
              <span className="text-gray-500">Robotics</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Network size={12} className="text-[#f59e0b]" />
              <span className="text-gray-500">Deep Learning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Hero Post */}
      {heroPost && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href={`/article/${heroPost.slug}`} className="group cursor-pointer flex flex-col md:flex-row bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md hover:shadow-xl transition-all">
            <div className="w-full md:w-[58%] relative aspect-[16/10] md:aspect-auto md:min-h-[380px] overflow-hidden shrink-0">
              <SafeImage src={heroPost.coverImage} alt={heroPost.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="bg-[#6366f1] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-indigo-500/30 flex items-center gap-1.5"><Brain size={12} /> AI Spotlight</span>
              </div>
            </div>
            <div className="p-7 md:p-10 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-[#6366f1]" />
                <span className="text-[#6366f1] text-[10px] font-bold uppercase tracking-widest">Tiêu điểm</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black leading-snug mb-4 group-hover:text-[#6366f1] transition-colors text-gray-900">{heroPost.title}</h2>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-5 line-clamp-3">{stripMarkdown(heroPost.excerpt)}</p>
              <div className="flex items-center text-[11px] text-gray-400 gap-4 uppercase tracking-wide">
                <span>By <span className="font-bold text-gray-700">{heroPost.author.toUpperCase()}</span></span>
                <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(heroPost.date)}</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* 3-Card Featured Strip */}
      {featuredStrip.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredStrip.map((post, idx) => {
              const accents = ['#6366f1', '#a78bfa', '#06b6d4'];
              const FeatIcon = aiIcons[idx % aiIcons.length];
              return (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${accents[idx]}, transparent)` }}></div>
                    <div className="absolute top-3 left-3">
                      <span className="text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg" style={{ backgroundColor: accents[idx] }}>{post.category}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FeatIcon size={13} className="text-[#6366f1]/50" />
                      <span className="text-[10px] text-[#6366f1] font-bold uppercase tracking-widest">{post.category}</span>
                    </div>
                    <h3 className="text-[16px] font-bold leading-snug text-gray-900 line-clamp-2 group-hover:text-[#6366f1] transition-colors mb-2">{post.title}</h3>
                    <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                      <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                      <span>• {formatDate(post.date)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad: Leaderboard after featured strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdBanner size="leaderboard" slotId={`${slug}-top`} />
      </div>

      {/* Main Content + Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Column */}
          <div className="flex-1 min-w-0">
            {/* AI Spotlight — large horizontal card */}
            {spotlightPost && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-[#6366f1] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">Nổi bật</h2>
                </div>
                <Link href={`/article/${spotlightPost.slug}`} className="group cursor-pointer flex flex-col md:flex-row bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#6366f1]/30 transition-all">
                  <div className="w-full md:w-[55%] relative aspect-[16/10] md:aspect-auto md:min-h-[260px] overflow-hidden shrink-0">
                    <SafeImage src={spotlightPost.coverImage} alt={spotlightPost.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#6366f1] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-indigo-500/25 flex items-center gap-1"><Sparkles size={11} /> {spotlightPost.category}</span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-center">
                    <h3 className="text-xl md:text-2xl font-bold leading-snug mb-3 group-hover:text-[#6366f1] transition-colors text-gray-900">{spotlightPost.title}</h3>
                    <p className="text-gray-500 text-[14px] leading-relaxed mb-4 line-clamp-3">{stripMarkdown(spotlightPost.excerpt)}</p>
                    <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                      <span>By <span className="font-bold text-gray-700">{spotlightPost.author.toUpperCase()}</span></span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(spotlightPost.date)}</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* 2-Column Grid */}
            {gridPosts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-[#a78bfa] rounded-full"></div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-gray-900">Mới nhất</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {gridPosts.map((post, idx) => {
                    const IconComp = aiIcons[idx % aiIcons.length];
                    return (
                      <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#6366f1]/30 transition-all">
                        <div className="relative overflow-hidden aspect-[16/9]">
                          <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 50vw" />
                          <div className="absolute top-3 left-3">
                            <span className="bg-[#a78bfa] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/25">{post.category}</span>
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <IconComp size={14} className="text-[#6366f1]/50" />
                            <span className="text-[#6366f1] text-[10px] font-bold uppercase tracking-widest">{post.category}</span>
                          </div>
                          <h3 className="text-[18px] font-bold leading-snug mb-2 group-hover:text-[#6366f1] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                          <p className="text-gray-500 text-[14px] leading-relaxed mb-3 line-clamp-2 flex-grow">{stripMarkdown(post.excerpt)}</p>
                          <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
                            <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                            <span>• {formatDate(post.date)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ad: Leaderboard between grid and list */}
            <AdBanner size="leaderboard" slotId={`${slug}-mid`} />

            {/* Remaining Posts  */}
            {remainingPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-7 bg-gray-300 rounded-full"></div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">Xem thêm</h2>
                </div>
                <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {remainingPosts.map(post => (
                    <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-4 p-4 hover:bg-indigo-50/50 transition-colors items-center">
                      <div className="w-[120px] md:w-[160px] shrink-0 relative aspect-[16/10] rounded-lg overflow-hidden border border-gray-100">
                        <SafeImage src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="160px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] md:text-[18px] font-bold leading-snug mb-1.5 group-hover:text-[#6366f1] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                          <span className="font-bold text-gray-600">{post.author.toUpperCase()}</span>
                          <span>• {formatDate(post.date)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-[300px] shrink-0">
            <div className="sticky top-28 flex flex-col gap-8">
              {/* AI Trending */}
              {sidebarPosts.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-1.5 h-7 bg-[#6366f1] rounded-full"></div>
                    <h2 className="text-lg font-bold uppercase tracking-widest text-gray-900">🧠 AI Trending</h2>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {sidebarPosts.map((post, idx) => {
                      const SideIcon = aiIcons[idx % aiIcons.length];
                      return (
                        <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-3.5 p-4 items-center border-b border-gray-50 last:border-0 hover:bg-indigo-50/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                            backgroundColor: idx === 0 ? 'rgba(99,102,241,0.15)' : idx === 1 ? 'rgba(167,139,250,0.15)' : idx === 2 ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.08)'
                          }}>
                            <SideIcon size={16} style={{ color: idx === 0 ? '#6366f1' : idx === 1 ? '#a78bfa' : idx === 2 ? '#06b6d4' : '#9ca3af' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold leading-snug mb-1 group-hover:text-[#6366f1] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                            <span className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">{formatDate(post.date)}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ad: Sidebar rectangle */}
              <AdBanner size="sidebar" slotId={`${slug}-sidebar`} />

              {/* AI Topics Tag Cloud */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-5 bg-[#a78bfa] rounded-full"></div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">AI Topics</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['ChatGPT', 'LLM', 'Computer Vision', 'NLP', 'Gemini', 'Claude', 'Stable Diffusion', 'AGI', 'ML Ops', 'Neural Net', 'Transformer', 'Prompt Engineering'].map(tag => (
                    <span key={tag} className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-[#6366f1] hover:text-white hover:border-[#6366f1] transition-all cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Newsletter CTA */}
              <div className="bg-gradient-to-br from-[#0a0a1a] via-[#111133] to-[#1a1a40] rounded-xl p-6 text-center border border-[#6366f1]/20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: `radial-gradient(circle, #818cf8 1.5px, transparent 1.5px)`,
                  backgroundSize: '20px 20px'
                }}></div>
                <div className="relative z-10">
                  <div className="text-3xl mb-3">🧠</div>
                  <h4 className="font-bold mb-2 text-white text-sm uppercase tracking-widest">AI Weekly</h4>
                  <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">Tin AI mới nhất từ OpenAI, Google, Meta và hơn thế nữa.</p>
                  <CategorySubscribeButton categorySlug="ai" categoryName="AI" accentColor="#6366f1" />
                </div>
              </div>

              {/* AI Fun Fact */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#6366f1]/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#6366f1]/10 flex items-center justify-center">
                      <Sparkles size={14} className="text-[#6366f1]" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">AI Fact</h3>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">GPT-4 được huấn luyện trên <span className="font-bold text-[#6366f1]">~13 nghìn tỷ token</span> — tương đương đọc hết internet hiện tại nhiều lần!</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
