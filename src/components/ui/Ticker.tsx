import Link from 'next/link';
import type { ArticleData } from '@/lib/notion';

export default function Ticker({ article }: { article: ArticleData }) {
  return (
    <Link href={`/article/${article.slug}`} className="block">
      <div className="bg-[#f8f9fa] border border-gray-200 p-2 flex items-center justify-between mb-8 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-4 overflow-hidden">
          <span className="bg-[#ef4444] text-white text-xs font-bold px-3 py-1.5 uppercase tracking-wider shrink-0">{article.category}</span>
          <span className="text-[15px] font-serif font-medium text-gray-800 truncate">{article.title}</span>
        </div>
      </div>
    </Link>
  );
}
