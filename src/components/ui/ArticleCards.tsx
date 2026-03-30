import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowRight, PlayCircle } from 'lucide-react';
import { ArticleData, formatDate } from '@/lib/notion';
import { YoutubeVideo } from '@/lib/youtube';

interface CardProps {
  article: ArticleData;
}

export function HeroGridCard({ article }: CardProps) {
  return (
    <Link href={`/article/${article.slug}`} className="relative w-full aspect-[16/9] rounded-lg overflow-hidden group cursor-pointer block">
      <Image src={article.coverImage} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-between p-6">
        <div className="self-start">
          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">{article.category}</span>
        </div>
        <h3 className="text-xl md:text-2xl font-serif font-bold text-white leading-snug drop-shadow-md">
          {article.title}
        </h3>
      </div>
    </Link>
  );
}

export function SmallGridCard({ article }: CardProps) {
  return (
    <Link href={`/article/${article.slug}`} className="flex flex-col group cursor-pointer">
      <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-4">
        <Image src={article.coverImage} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 33vw" />
        <div className="absolute top-3 left-3">
          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">{article.category}</span>
        </div>
      </div>
      <h3 className="text-[16px] font-serif font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-2">
        {article.title}
      </h3>
      <div className="flex items-center text-[12px] text-gray-400 gap-1 mt-auto">
        <Clock size={12} /> {formatDate(article.date)}
      </div>
    </Link>
  );
}

export function MagazineGridCard({ article }: CardProps) {
  return (
    <Link href={`/article/${article.slug}`} className="flex flex-col items-center text-center group cursor-pointer">
      <div className="relative w-full aspect-[16/9] rounded-lg mb-6">
        <div className="w-full h-full rounded-lg overflow-hidden relative border border-gray-100">
          <Image src={article.coverImage} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="25vw" />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider whitespace-nowrap shadow-sm">
            {article.category}
          </span>
        </div>
      </div>
      <h3 className="text-[17px] font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors mb-3 line-clamp-3 px-2">
        {article.title}
      </h3>
      <div className="flex items-center justify-center text-[12px] text-gray-400 gap-3 mt-auto">
        <span className="flex items-center gap-1.5"><Clock size={12} /> {formatDate(article.date)}</span>
      </div>
    </Link>
  );
}

export function ListCard({ article }: CardProps) {
  return (
    <Link href={`/article/${article.slug}`} className="flex flex-col sm:flex-row gap-6 border-b border-gray-100 pb-8 last:border-0 group cursor-pointer">
      <div className="w-full sm:w-[280px] shrink-0 aspect-[16/9] rounded-lg overflow-hidden relative">
        <Image src={article.coverImage} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="280px" />
      </div>
      <div className="flex flex-col justify-center gap-2">
        <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest">{article.category}</span>
        <h3 className="text-xl font-bold text-gray-900 leading-snug group-hover:text-[#2563eb] transition-colors">
          {article.title}
        </h3>
        <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2">
          {article.excerpt}
        </p>
        <div className="flex items-center text-[12px] text-gray-400 gap-2 mt-auto pt-2">
          <span>By <span className="font-bold text-gray-700">{article.author.toUpperCase()}</span></span>
          <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(article.date)}</span>
        </div>
      </div>
    </Link>
  );
}

export function GridCard({ article }: CardProps) {
  return (
    <div className="group cursor-pointer flex flex-col h-full">
      <Link href={`/article/${article.slug}`} className="flex flex-col h-full">
        <div className="relative overflow-hidden rounded-lg mb-4 aspect-[16/9] shrink-0">
          <Image src={article.coverImage} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 uppercase tracking-wider mb-3">
          <span>{article.category}</span>
          <span>•</span>
          <span>{formatDate(article.date)}</span>
        </div>
        <h3 className="text-xl font-bold leading-snug mb-3 group-hover:text-[#2563eb] transition-colors text-gray-900">{article.title}</h3>
        <p className="text-gray-600 text-[14px] leading-relaxed line-clamp-2 flex-grow">{article.excerpt}</p>
        <div className="mt-4 flex items-center text-[#2563eb] font-semibold text-sm group-hover:underline">
          Xem thêm <ArrowRight size={16} className="ml-1" />
        </div>
      </Link>
    </div>
  );
}

export function EditorCard({ article }: CardProps) {
  return (
    <Link href={`/article/${article.slug}`} className="group cursor-pointer flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="w-full aspect-[16/9] overflow-hidden relative">
        <Image src={article.coverImage} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 50vw" />
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <span className="text-[#2563eb] text-[11px] font-bold uppercase tracking-widest mb-2">{article.category}</span>
        <h3 className="text-2xl font-bold text-gray-900 leading-snug mb-3 group-hover:text-[#2563eb] transition-colors">
          {article.title}
        </h3>
        <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-3 mb-6 flex-grow">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-[12px] text-gray-400 mt-auto pt-4 border-t border-gray-100">
          <span>By <span className="font-bold text-gray-700">{article.author.toUpperCase()}</span></span>
          <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(article.date)}</span>
        </div>
      </div>
    </Link>
  );
}

export function VideoCard({ article }: CardProps) {
  return (
    <Link href={`/article/${article.slug}`} className="group cursor-pointer flex flex-col bg-gray-900 p-2 rounded-lg hover:bg-gray-800 transition-colors">
      <div className="relative overflow-hidden rounded-md mb-3 aspect-[16/9]">
        <Image src={article.coverImage} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" sizes="25vw" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-[#2563eb] transition-colors">
            <PlayCircle className="text-white" size={24} />
          </div>
        </div>
      </div>
      <h3 className="text-[15px] font-bold leading-snug mb-1 text-white group-hover:text-blue-400 transition-colors line-clamp-2">{article.title}</h3>
      <div className="text-[12px] text-gray-400">{formatDate(article.date)}</div>
    </Link>
  );
}

export function YoutubeVideoCard({ video }: { video: YoutubeVideo }) {
  // Try parsing published_at (e.g., 2024-03-30T... into a date)
  const dateObj = new Date(video.publishedAt);
  const formattedDate = dateObj.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <a href={video.url} target="_blank" rel="noopener noreferrer" className="group cursor-pointer flex flex-col bg-gray-900 p-2 rounded-lg hover:bg-gray-800 transition-colors h-full">
      <div className="relative overflow-hidden rounded-md mb-3 aspect-[16/9] shrink-0">
        <Image src={video.thumbnail} alt={video.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" sizes="(max-width: 768px) 100vw, 25vw" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-[#ff0000] transition-colors">
            <PlayCircle className="text-white" size={24} />
          </div>
        </div>
      </div>
      <h3 className="text-[15px] font-bold leading-snug mb-1 text-white group-hover:text-red-400 transition-colors line-clamp-2">{video.title}</h3>
      <div className="text-[12px] text-gray-400 mt-auto pt-2 flex items-center gap-2">
        <span className="text-gray-300 font-medium">{video.channelName}</span>
        <span>•</span>
        <span>{formattedDate}</span>
      </div>
    </a>
  );
}
