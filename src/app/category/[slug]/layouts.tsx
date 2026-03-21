import { ArticleData, formatDate } from "@/lib/notion";
import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";

interface LayoutProps {
  categoryName: string;
  posts: ArticleData[];
}

/**
 * Layout 1: News / AI Style (Immersive Parallax)
 */
export function NewsLayout({ categoryName, posts }: LayoutProps) {
  const spotlight = posts.slice(0, 2);
  const denseItems = posts.slice(2);

  // Specific banner for AI Category
  const isAI = categoryName.toLowerCase() === 'ai';
  const heroImage = isAI 
    ? "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop" // High Res Dramatic Mountains
    : (posts[0]?.coverImage || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop");

  return (
    <div className="bg-white font-sans text-gray-800">
      <div className="relative w-full h-[350px] md:h-[450px] flex items-center justify-center mb-16 overflow-hidden">
        <Image 
          src={heroImage} 
          alt={categoryName} 
          fill 
          className="object-cover" 
          priority 
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 text-center px-4">
          <span className="text-[#2563eb] font-extrabold tracking-[0.2em] uppercase text-[10px] md:text-xs mb-4 block drop-shadow-sm">CHUYÊN MỤC</span>
          <h1 className="text-5xl md:text-7xl font-sans font-black tracking-widest uppercase text-white mb-4 drop-shadow-[0_2px_15px_rgba(0,0,0,0.6)]">
            {isAI ? "TRÍ TUỆ NHÂN TẠO" : categoryName}
          </h1>
          <p className="text-white max-w-2xl mx-auto text-[15px] md:text-[17px] leading-relaxed font-medium drop-shadow-md">
            {isAI 
              ? "Cập nhật những tin tức, xu hướng và đột phá mới nhất trong lĩnh vực AI trên toàn cầu."
              : `Cập nhật những tin tức và xu hướng mới nhất trong chuyên mục ${categoryName}.`
            }
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {spotlight.length > 0 && (
          <div className="mb-20">
            <div className="border-b border-gray-200 pb-4 mb-10">
              <h2 className="text-2xl font-sans font-bold uppercase tracking-widest text-gray-900">Tiêu điểm</h2>
            </div>
            <div className="flex flex-col gap-16">
              {spotlight.map((post, idx) => (
                <Link key={post.id} href={`/article/${post.slug}`} className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center group cursor-pointer`}>
                  <div className="w-full md:w-1/2 relative overflow-hidden rounded-lg aspect-[16/9] border border-gray-100 shadow-sm">
                    <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className={`w-full md:w-1/2 flex flex-col justify-center ${idx % 2 === 0 ? 'md:pl-8' : 'md:pr-8'}`}>
                    <h3 className="text-2xl md:text-4xl font-sans font-bold leading-snug mb-4 group-hover:text-[#2563eb] transition-colors text-gray-900">{post.title}</h3>
                    <p className="text-gray-500 text-[16px] leading-relaxed mb-6 line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                      <span>By <span className="font-bold text-gray-700">{post.author.toUpperCase()}</span></span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(post.date)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {denseItems.length > 0 && (
          <div>
            <div className="border-b border-gray-200 pb-4 mb-8">
              <h2 className="text-xl font-sans font-bold uppercase tracking-widest text-gray-900">Tin vắn</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {denseItems.map(post => (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col h-full bg-white">
                  <div className="relative overflow-hidden rounded-lg mb-3 aspect-[16/9] border border-gray-100">
                    <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <h3 className="text-[15px] font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-3">{post.title}</h3>
                  <div className="flex items-center text-[11px] text-gray-400 gap-2 uppercase tracking-wide mt-auto">
                    <span><span className="font-bold text-gray-700">{post.author.toUpperCase()}</span></span>
                    <span>• {formatDate(post.date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Layout 2: Tips & Tricks Style (Editorial Header + Bento Grid)
 */
export function AlternateLayout({ categoryName, posts }: LayoutProps) {
  const bentoMain = posts[0];
  const bentoSide = posts.slice(1, 3);
  const gridItems = posts.slice(3);

  return (
    <div className="bg-white font-sans text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-[#2563eb] font-bold tracking-widest uppercase text-sm mb-4 block">Chuyên mục</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-black tracking-tighter uppercase text-gray-900 leading-none">
              {categoryName}
            </h1>
          </div>
          <p className="text-gray-500 max-w-md text-[15px] leading-relaxed border-l-2 border-blue-500 pl-6">
            Khám phá những nội dung chất lượng và chuyên sâu nhất được biên tập bởi đội ngũ chuyên gia tại chuyên mục {categoryName}.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {bentoMain && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:h-[500px] mb-16">
            <Link href={`/article/${bentoMain.slug}`} className="md:col-span-2 relative group overflow-hidden rounded-lg cursor-pointer h-[400px] md:h-full border border-gray-100">
              <Image src={bentoMain.coverImage} alt={bentoMain.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block">Tiêu điểm</span>
                <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-sans font-bold leading-tight mb-4">{bentoMain.title}</h2>
                <div className="flex items-center text-[11px] text-gray-300 gap-3 uppercase tracking-wide">
                  <span>By <span className="font-bold text-white">{bentoMain.author.toUpperCase()}</span></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(bentoMain.date)}</span>
                </div>
              </div>
            </Link>
            <div className="flex flex-col gap-6 h-full">
              {bentoSide.map(post => (
                <Link key={post.id} href={`/article/${post.slug}`} className="flex-1 relative group overflow-hidden rounded-lg cursor-pointer border border-gray-100">
                  <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-5 w-full">
                    <h3 className="text-white text-lg md:text-xl font-sans font-bold leading-tight line-clamp-2">{post.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {gridItems.length > 0 && (
          <div className="py-8">
            <div className="flex items-center justify-between mb-10 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-sans font-bold uppercase tracking-widest text-gray-900">Bài viết mới nhất</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridItems.map(post => (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col h-full">
                  <div className="relative overflow-hidden rounded-lg mb-4 aspect-[16/9] border border-gray-100">
                    <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <h3 className="text-[18px] font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{post.title}</h3>
                  <p className="text-gray-500 text-[14px] leading-relaxed mb-4 line-clamp-2 flex-grow">{post.excerpt}</p>
                  <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
                    <span>By <span className="font-bold text-gray-700">{post.author.toUpperCase()}</span></span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(post.date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Layout 3: Reviews / Magazine Style (Sidebar + List)
 */
export function MagazineLayout({ categoryName, posts }: LayoutProps) {
  const mainPosts = posts.slice(0, 5);
  const sidebarPosts = posts.slice(5, 9);

  return (
    <div className="bg-white font-sans text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="border-y-2 border-gray-900 py-12 text-center">
          <span className="text-[#2563eb] font-bold tracking-widest uppercase text-xs mb-3 block">Chuyên mục</span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-black tracking-widest uppercase text-gray-900">
            {categoryName}
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto mt-6 text-[15px] leading-relaxed">
            Nơi tập hợp những đánh giá chi tiết và khách quan nhất từ đội ngũ chuyên gia RetroLab về các sản phẩm và giải pháp công nghệ.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-2/3 flex flex-col gap-12">
            {mainPosts.map(post => (
              <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex flex-col">
                <div className="relative overflow-hidden rounded-lg mb-5 aspect-[16/9] border border-gray-100 shadow-sm">
                  <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Review</span>
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{post.title}</h3>
                <p className="text-gray-500 text-[15px] leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide">
                  <span>By <span className="font-bold text-gray-700">{post.author.toUpperCase()}</span></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(post.date)}</span>
                </div>
              </Link>
            ))}
          </div>

          <aside className="w-full lg:w-1/3">
            <div className="sticky top-28">
              <div className="border-b-2 border-gray-900 pb-2 mb-6">
                <h2 className="text-xl font-sans font-bold uppercase tracking-widest text-gray-900">Tiêu biểu</h2>
              </div>
              <div className="flex flex-col gap-6">
                {sidebarPosts.map((post, idx) => (
                  <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer flex gap-4 items-center">
                    <div className="text-3xl font-sans font-black text-gray-200 italic">0{idx + 1}</div>
                    <div className="flex-1">
                      <h3 className="text-[15px] font-sans font-bold leading-snug mb-1 group-hover:text-[#2563eb] transition-colors text-gray-900 line-clamp-2">{post.title}</h3>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{formatDate(post.date)}</span>
                    </div>
                    <div className="w-16 h-16 shrink-0 overflow-hidden rounded-lg border border-gray-100">
                      <Image src={post.coverImage} alt={post.title} width={64} height={64} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-10 bg-gray-50 border border-gray-100 rounded-lg p-6 text-center">
                <h4 className="font-bold mb-2 uppercase text-xs tracking-widest">Newsletter</h4>
                <p className="text-xs text-gray-500 mb-4">Nhận bài Review mới nhất vào email</p>
                <button className="w-full bg-[#2563eb] text-white text-[10px] font-bold py-3 uppercase tracking-widest rounded-md">Tham gia ngay</button>
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
export function DefaultCategoryLayout({ categoryName, posts }: LayoutProps) {
  const featured = posts.slice(0, 5);
  const listItems = posts.slice(5);

  return (
    <div className="bg-white font-sans text-gray-800">
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
              Nơi chia sẻ những quan điểm, góc nhìn khác biệt về thế giới công nghệ dựa trên những trải nghiệm với rất nhiều các sản phẩm công nghệ mới.
            </p>
          </div>

          {/* 5-Post Bento Grid (2-1-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            {/* Left Column (2 Small) */}
            <div className="flex flex-col gap-6">
              {featured.slice(0, 2).map(post => (
                <Link key={post.id} href={`/article/${post.slug}`} className="group cursor-pointer">
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3 border border-white/10">
                    <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
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
                    <Image src={featured[2].coverImage} alt={featured[2].title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
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
                    <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
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
                <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest mb-2">{categoryName}</span>
                <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-4 group-hover:text-[#2563eb] transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-500 text-[15px] leading-relaxed mb-6 line-clamp-2">
                  {post.excerpt}
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
