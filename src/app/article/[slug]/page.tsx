import { getPostBySlug, getPostMetadataBySlug, getPosts, formatDate } from "@/lib/notion";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, Folder } from "lucide-react";
import type { Metadata } from 'next';
import { Suspense } from "react";
import { ArticleSkeleton } from "@/components/ui/Skeletons";
import ArticleActions from "@/components/post/ArticleActions";
import AdBanner from "@/components/ui/AdBanner";
import RelatedPostsCarousel from "@/components/post/RelatedPostsCarousel";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const meta = await getPostMetadataBySlug(resolvedParams.slug);
  if (!meta) return {};
  
  return {
    title: `${meta.title} - RetroLab`,
    description: meta.excerpt,
    openGraph: {
      title: meta.title,
      description: meta.excerpt,
      images: [meta.coverImage]
    }
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;

  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <ArticleContent slug={resolvedParams.slug} />
    </Suspense>
  );
}

async function ArticleContent({ slug }: { slug: string }) {
  const post = await getPostBySlug(slug);
  
  if (!post) {
    notFound();
  }

  // Get related posts for "You May Also Like"
  const allPosts = await getPosts();
  const relatedPosts = allPosts
    .filter(p => p.id !== post.id)
    .slice(0, 12);

  return (
    <div className="relative min-h-screen font-sans text-gray-800">
      {/* ── Subtle gradient background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#fafbff]" />
        {/* Soft pastel blobs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute top-[40%] left-0 w-[600px] h-[600px] bg-sky-100/30 rounded-full blur-[100px] -translate-x-1/3" />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-rose-50/40 rounded-full blur-[100px] translate-y-1/4" />
      </div>

      {/* Full-width Hero Image */}
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-12">
        <Image 
          src={post.coverImage} 
          alt={post.title} 
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#fafbff] via-black/20 to-transparent"></div>
      </div>

      {/* Article Content Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Header Info */}
        <div className="text-center mb-10">
          <div className="mb-4">
            <Link 
              href={`/category/${post.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')}`}
              className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest border-b border-[#2563eb] pb-1 hover:text-blue-700 transition-colors"
            >
              {post.category}
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-[42px] font-sans font-bold leading-tight mb-6 text-gray-900">
            {post.title}
          </h1>
          <div className="flex items-center justify-center text-[11px] text-gray-500 gap-3 uppercase tracking-wide">
            <span>By <span className="font-bold text-gray-700">{post.author.toUpperCase()}</span></span>
            <span className="flex items-center gap-1.5"><Clock size={12} /> {formatDate(post.date)}</span>
          </div>
        </div>

        {/* Like / Save / Share actions */}
        <ArticleActions postSlug={slug} postTitle={post.title} />

        {/* Article Body */}
        <div 
          className="prose prose-lg max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags — now clickable, linking to tag search */}
        {post.tags && (
          <div className="flex flex-wrap gap-2 mt-8 mb-4">
            {post.tags.split(',').map((tag: string) => (
              <Link
                key={tag.trim()}
                href={`/search?tag=${encodeURIComponent(tag.trim())}`}
                className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider hover:bg-[#2563eb] hover:text-white transition-all duration-200 cursor-pointer"
              >
                {tag.trim()}
              </Link>
            ))}
          </div>
        )}

        {/* Bottom actions — for readers who finish the article */}
        <ArticleActions postSlug={slug} postTitle={post.title} />

        {/* Footer Category */}
        <div className="flex items-center gap-2 border-t border-gray-200 pt-6 mt-10 mb-10">
          <Folder size={16} className="text-gray-400" />
          <Link 
            href={`/category/${post.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')}`}
            className="text-[#2563eb] text-[10px] font-bold uppercase tracking-widest border-b border-[#2563eb] pb-0.5 hover:text-blue-700 transition-colors"
          >
            {post.category}
          </Link>
        </div>
      </div>

      {/* Ad Banner — end of article */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-4">
        <AdBanner size="leaderboard" slotId="article-after-content" />
      </div>

      {/* You May Also Like — Carousel */}
      <RelatedPostsCarousel posts={relatedPosts} />
    </div>
  );
}
