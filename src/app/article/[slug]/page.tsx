import { getPostBySlug, getPostMetadataBySlug, getPosts, formatDate } from "@/lib/notion";
import { notFound } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";
import Link from "next/link";
import { Clock, Folder } from "lucide-react";
import type { Metadata } from 'next';
import { Suspense } from "react";
import { ArticleSkeleton } from "@/components/ui/Skeletons";
import ArticleActions from "@/components/post/ArticleActions";
import ReadingProgressBar from "@/components/post/ReadingProgressBar";
import FloatingArticleBar from "@/components/post/FloatingArticleBar";
import AdBanner from "@/components/ui/AdBanner";
import RelatedPostsCarousel from "@/components/post/RelatedPostsCarousel";
import AEOArticleSchema from "@/components/seo/AEOArticleSchema";
import type { FAQItem } from "@/components/seo/AEOArticleSchema";

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

/**
 * Extract FAQ-like Q&A pairs from article HTML content.
 * Looks for patterns like:
 *   <h2>Question?</h2> or <h3>Question?</h3> followed by <p>Answer</p>
 * Also detects Vietnamese question patterns (e.g., "...là gì?", "Tại sao...", "Làm sao...")
 */
function extractFAQFromContent(html: string): FAQItem[] {
  const faqs: FAQItem[] = [];

  // Match h2/h3 headings that end with '?' or start with Vietnamese question words
  const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>\s*<p>([\s\S]*?)<\/p>/gi;
  const questionPatterns = /(\?|là gì|tại sao|làm sao|như thế nào|khi nào|bao giờ|ở đâu|ai là|có nên|nên không|thế nào)/i;

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null && faqs.length < 5) {
    const rawQuestion = match[1].replace(/<[^>]+>/g, '').trim();
    const rawAnswer = match[2].replace(/<[^>]+>/g, '').trim();

    if (rawQuestion && rawAnswer && questionPatterns.test(rawQuestion)) {
      faqs.push({
        question: rawQuestion,
        answer: rawAnswer.length > 300 ? rawAnswer.substring(0, 297) + '...' : rawAnswer,
      });
    }
  }

  return faqs;
}

/**
 * Find related posts by matching tags (shared tags = higher relevance).
 * Falls back to same-category posts if no tag matches found.
 */
function getRelatedPosts(
  currentPost: { id: string; tags: string; category: string },
  allPosts: typeof import("@/lib/notion").getPosts extends () => Promise<infer T> ? (T extends (infer U)[] ? U[] : never) : never
) {
  const currentTags = currentPost.tags
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  // Score each post by number of shared tags
  const scored = allPosts
    .filter(p => p.id !== currentPost.id)
    .map(p => {
      const postTags = p.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);
      const sharedTags = currentTags.filter(t => postTags.includes(t)).length;
      const sameCategory = p.category.toLowerCase() === currentPost.category.toLowerCase() ? 1 : 0;
      // Score: shared tags * 3 + same category bonus
      return { post: p, score: sharedTags * 3 + sameCategory };
    })
    .sort((a, b) => b.score - a.score);

  // Take top 12 with score > 0, then fill with recent posts
  const related = scored.filter(s => s.score > 0).slice(0, 12).map(s => s.post);

  if (related.length < 12) {
    const relatedIds = new Set(related.map(p => p.id));
    const filler = allPosts
      .filter(p => p.id !== currentPost.id && !relatedIds.has(p.id))
      .slice(0, 12 - related.length);
    related.push(...filler);
  }

  return related;
}

async function ArticleContent({ slug }: { slug: string }) {
  const post = await getPostBySlug(slug);
  
  if (!post) {
    notFound();
  }

  // Get related posts using tag-based matching for internal SEO loop
  const allPosts = await getPosts();
  const relatedPosts = getRelatedPosts(post, allPosts);

  const articleUrl = `${SITE_URL}/article/${slug}`;

  // Extract FAQ items from article content for AEO
  const faqItems = extractFAQFromContent(post.content);

  // Estimate word count for schema
  const plainText = post.content.replace(/<[^>]+>/g, '');
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="relative min-h-screen font-sans text-gray-800">
      {/* Reading progress bar + time left (mobile only) */}
      <ReadingProgressBar estimatedMinutes={Math.max(2, Math.ceil(wordCount / 200))} />
      {/* AEO-optimized JSON-LD: Article + Breadcrumbs + auto-extracted FAQ */}
      <AEOArticleSchema
        title={post.title}
        description={post.excerpt}
        author={post.author}
        publishedDate={post.date}
        coverImage={post.coverImage}
        articleUrl={articleUrl}
        category={post.category}
        tags={post.tags}
        faqItems={faqItems}
        wordCount={wordCount}
      />

      {/* ── Subtle gradient background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#fafbff]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute top-[40%] left-0 w-[600px] h-[600px] bg-sky-100/30 rounded-full blur-[100px] -translate-x-1/3" />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] bg-rose-50/40 rounded-full blur-[100px] translate-y-1/4" />
      </div>

      {/* Full-width Hero Image */}
      <figure className="relative w-full h-[260px] sm:h-[400px] md:h-[500px] lg:h-[600px] mb-8 sm:mb-12">
        <SafeImage 
          src={post.coverImage} 
          alt={post.title} 
          fill
          className="object-cover"
          priority
          sizes="100vw"
          fallbackSrcs={post.contentImages}
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-sans font-bold leading-tight mb-4 sm:mb-6 text-gray-900">
              {post.title}
            </h1>
            <div className="flex items-center justify-center flex-wrap text-[11px] text-gray-500 gap-3 uppercase tracking-wide">
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

          {/* FAQ Section — rendered visually if FAQs were extracted */}
          {faqItems.length > 0 && (
            <section className="mt-12 mb-8 border-t border-gray-200 pt-8" aria-label="Câu hỏi thường gặp">
              <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
                Câu hỏi thường gặp
              </h2>
              <div className="space-y-5">
                {faqItems.map((faq, idx) => (
                  <details key={idx} className="group bg-gray-50 rounded-xl border border-gray-200/80 overflow-hidden">
                    <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-[15px] font-semibold text-gray-800 hover:bg-gray-100 transition-colors">
                      <span>{faq.question}</span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200 ml-4 shrink-0">▼</span>
                    </summary>
                    <div className="px-5 pb-5 text-gray-600 text-[14px] leading-relaxed border-t border-gray-200/60 pt-4">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

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

      {/* Floating Action Bar — mobile only */}
      <FloatingArticleBar postSlug={slug} postTitle={post.title} />

      {/* You May Also Like — Tag-based related posts for SEO internal linking */}
      <RelatedPostsCarousel posts={relatedPosts} />
    </div>
  );
}
