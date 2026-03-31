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

const SITE_URL = "https://retrolab.com.vn";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const meta = await getPostMetadataBySlug(resolvedParams.slug);
  if (!meta) return {};

  const articleUrl = `${SITE_URL}/article/${resolvedParams.slug}`;

  return {
    title: meta.title,
    description: meta.excerpt,
    authors: [{ name: meta.author }],
    keywords: meta.tags ? meta.tags.split(',').map(t => t.trim()) : undefined,
    alternates: {
      canonical: articleUrl,
    },
    openGraph: {
      type: 'article',
      title: meta.title,
      description: meta.excerpt,
      url: articleUrl,
      siteName: 'RetroLab',
      locale: 'vi_VN',
      images: [
        {
          url: meta.coverImage,
          width: 1200,
          height: 630,
          alt: meta.title,
        },
      ],
      publishedTime: meta.date,
      authors: [meta.author],
      section: meta.category,
      tags: meta.tags ? meta.tags.split(',').map(t => t.trim()) : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.excerpt,
      images: [meta.coverImage],
    },
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

  const articleUrl = `${SITE_URL}/article/${slug}`;

  // JSON-LD: Article + BreadcrumbList
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": articleUrl,
        headline: post.title,
        description: post.excerpt,
        image: {
          "@type": "ImageObject",
          url: post.coverImage,
          width: 1200,
          height: 630,
        },
        datePublished: post.date,
        dateModified: post.date,
        author: {
          "@type": "Person",
          name: post.author,
        },
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
        },
        articleSection: post.category,
        keywords: post.tags || undefined,
        inLanguage: "vi",
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Trang chủ",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: post.category,
            item: `${SITE_URL}/category/${post.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: articleUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className="relative min-h-screen font-sans text-gray-800">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Subtle gradient background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#fafbff]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute top-[40%] left-0 w-[600px] h-[600px] bg-sky-100/30 rounded-full blur-[100px] -translate-x-1/3" />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-rose-50/40 rounded-full blur-[100px] translate-y-1/4" />
      </div>

      {/* Full-width Hero Image */}
      <figure className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] mb-12">
        <Image 
          src={post.coverImage} 
          alt={post.title} 
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#fafbff] via-black/20 to-transparent"></div>
      </figure>

      {/* Semantic article wrapper */}
      <article itemScope itemType="https://schema.org/NewsArticle">
        <meta itemProp="headline" content={post.title} />
        <meta itemProp="description" content={post.excerpt} />
        <meta itemProp="image" content={post.coverImage} />
        <meta itemProp="datePublished" content={post.date} />
        <meta itemProp="author" content={post.author} />
        <meta itemProp="articleSection" content={post.category} />

        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb navigation */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-gray-400 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/" itemProp="item" className="hover:text-[#2563eb] transition-colors">
                  <span itemProp="name">Trang chủ</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <li aria-hidden="true">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link
                  href={`/category/${post.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')}`}
                  itemProp="item"
                  className="hover:text-[#2563eb] transition-colors"
                >
                  <span itemProp="name">{post.category}</span>
                </Link>
                <meta itemProp="position" content="2" />
              </li>
              <li aria-hidden="true">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="text-gray-600 font-medium truncate max-w-[200px]">
                <span itemProp="name">{post.title}</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          {/* Header Info */}
          <header className="text-center mb-10">
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
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </span>
            </div>
          </header>

          {/* Like / Save / Share actions */}
          <ArticleActions postSlug={slug} postTitle={post.title} />

          {/* Article Body */}
          <div 
            className="prose prose-lg max-w-none text-gray-800"
            itemProp="articleBody"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags — now clickable, linking to tag search */}
          {post.tags && (
            <footer className="flex flex-wrap gap-2 mt-8 mb-4" aria-label="Từ khóa bài viết">
              {post.tags.split(',').map((tag: string) => (
                <Link
                  key={tag.trim()}
                  href={`/search?tag=${encodeURIComponent(tag.trim())}`}
                  className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider hover:bg-[#2563eb] hover:text-white transition-all duration-200 cursor-pointer"
                  rel="tag"
                >
                  {tag.trim()}
                </Link>
              ))}
            </footer>
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
      </article>

      {/* Ad Banner — end of article */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-4">
        <AdBanner size="leaderboard" slotId="article-after-content" />
      </div>

      {/* You May Also Like — Carousel */}
      <RelatedPostsCarousel posts={relatedPosts} />
    </div>
  );
}
