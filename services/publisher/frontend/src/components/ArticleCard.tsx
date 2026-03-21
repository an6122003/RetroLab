import { ArticleListItem } from '../api';
import StatusBadge from './StatusBadge';

interface ArticleCardProps {
  article: ArticleListItem;
  isActive: boolean;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ArticleCard({ article, isActive, onClick }: ArticleCardProps) {
  return (
    <button
      id={`article-card-${article.id}`}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-accent-600/20 border border-accent-500/40 shadow-lg shadow-accent-500/5'
          : 'bg-surface-container-low border border-outline-variant/15 hover:translate-x-1'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-medium text-on-surface line-clamp-2 leading-snug group-hover:text-on-surface transition-colors">
          {article.title || 'Untitled'}
        </h3>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={article.status} />
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold uppercase tracking-wider">
          {article.output_language?.toUpperCase() || 'VI'}
        </span>
        {article.source_outlet && (
          <span className="text-[10px] text-outline truncate max-w-[100px]">
            {article.source_outlet}
          </span>
        )}
        {article.reading_time_minutes && (
          <span className="text-[10px] text-outline">
            📖 {article.reading_time_minutes}m
          </span>
        )}
        <span className="text-[10px] text-outline ml-auto whitespace-nowrap">
          {timeAgo(article.created_at)}
        </span>
      </div>
    </button>
  );
}
