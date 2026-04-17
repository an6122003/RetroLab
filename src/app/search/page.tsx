import { searchPosts, searchPostsByTag, getPosts, formatDate } from "@/lib/notion";
import type { ArticleData } from "@/lib/notion";
import SafeImage from "@/components/ui/SafeImage";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import Link from "next/link";
import { Clock, Tag } from "lucide-react";
import type { Metadata } from "next";
import SearchForm from "./SearchForm";

export const metadata: Metadata = {
  title: "Tìm kiếm - RetroLab",
  description: "Tìm kiếm bài viết trên RetroLab.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || '';
  const tag = resolvedSearchParams.tag || '';
  
  let results: ArticleData[] = [];
  
  if (tag) {
    results = await searchPostsByTag(tag);
  } else if (query) {
    results = await searchPosts(query);
  }

  const searchLabel = tag
    ? `tag "${tag}"`
    : `"${query}"`;

  const isSearching = !!(query || tag);

  return (
    <div className="bg-white font-sans text-gray-800 min-h-screen">
      {/* Search Header */}
      <div className="bg-[#f8f9fa] border-b border-gray-200 py-8 sm:py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-sans font-black tracking-tight text-gray-900 mb-6 sm:mb-8">
            {tag ? (
              <span className="flex items-center justify-center gap-3">
                <Tag size={36} className="text-[#2563eb]" />
                {tag}
              </span>
            ) : (
              'Tìm kiếm'
            )}
          </h1>
          <SearchForm initialQuery={query} />
        </div>
      </div>

      {/* Search Results Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {isSearching && (
          <div className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-4 border-b border-gray-200 gap-4">
            <p className="text-gray-600 text-lg">
              Tìm thấy <span className="font-bold text-gray-900">{results.length}</span> kết quả cho <span className="font-bold text-gray-900">{searchLabel}</span>
            </p>
            {tag && (
              <Link
                href="/search"
                className="text-sm text-[#2563eb] font-semibold hover:underline"
              >
                ← Quay lại tìm kiếm
              </Link>
            )}
          </div>
        )}

        {!isSearching && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Nhập từ khóa để tìm kiếm bài viết trên RetroLab.</p>
          </div>
        )}

        {isSearching && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Không tìm thấy kết quả nào cho {searchLabel}.</p>
          </div>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <div className="flex flex-col gap-10">
            {results.map(post => (
              <SearchResultItem key={post.id} article={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultItem({ article }: { article: ArticleData }) {
  return (
    <Link href={`/article/${article.slug}`} className="flex flex-col sm:flex-row gap-6 group cursor-pointer">
      <div className="w-full sm:w-[300px] shrink-0 relative overflow-hidden rounded-lg aspect-[16/9]">
        <SafeImage src={article.coverImage} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="300px" fallbackSrc={article.contentFirstImage} />
        <div className="absolute top-3 left-3">
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{article.category}</span>
        </div>
      </div>
      <div className="flex flex-col justify-center flex-1 py-2">
        <h3 className="text-xl md:text-2xl font-sans font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{article.title}</h3>
        <p className="text-gray-500 text-[15px] leading-relaxed mb-4 line-clamp-2">{stripMarkdown(article.excerpt)}</p>
        {/* Clickable tags in search results */}
        {article.tags && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {article.tags.split(',').slice(0, 4).map((tag: string) => (
              <Link
                key={tag.trim()}
                href={`/search?tag=${encodeURIComponent(tag.trim())}`}
                className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider hover:bg-[#2563eb] hover:text-white transition-all duration-200"

              >
                {tag.trim()}
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-center text-[11px] text-gray-400 gap-3 uppercase tracking-wide mt-auto">
          <span>By <span className="font-bold text-gray-700">{article.author.toUpperCase()}</span></span>
          <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(article.date)}</span>
        </div>
      </div>
    </Link>
  );
}
