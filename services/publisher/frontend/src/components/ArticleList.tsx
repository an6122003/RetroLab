import { useQuery } from '@tanstack/react-query';
import { api, ArticleListItem } from '../api';
import ArticleCard from './ArticleCard';

interface ArticleListProps {
  statusFilter: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ArticleList({ statusFilter, activeId, onSelect }: ArticleListProps) {
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['articles', statusFilter],
    queryFn: () => api.listArticles(statusFilter || undefined, 100),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-container-low animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-error text-sm">Failed to load articles</p>
        <p className="text-outline text-xs mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  if (!articles?.length) {
    return (
      <div className="p-4 text-center">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-on-surface-variant text-sm">No articles found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2">
      {articles.map((a) => (
        <ArticleCard
          key={a.id}
          article={a}
          isActive={a.id === activeId}
          onClick={() => onSelect(a.id)}
        />
      ))}
    </div>
  );
}
