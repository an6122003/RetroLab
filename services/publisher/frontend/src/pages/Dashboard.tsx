import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ArticleListItem } from '../api';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import ModelBadge from '../components/ModelBadge';

type SourceTab = 'composer' | 'pipeline';
const STATUS_FILTERS = ['draft', 'approved', 'published', 'rejected'] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sourceTab, setSourceTab] = useState<SourceTab>('pipeline');
  const [statusFilter, setStatusFilter] = useState<string | null>('draft');

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', statusFilter, sourceTab],
    queryFn: () => api.listArticles(statusFilter || undefined, 100, 0, sourceTab),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteArticle(id),
    onSuccess: () => {
      toast.success('Article deleted');
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const featuredArticle = articles?.[0];
  const listArticles = articles?.slice(featuredArticle ? 1 : 0) || [];
  const total = stats ? (stats.draft || 0) + (stats.approved || 0) + (stats.published || 0) + (stats.rejected || 0) : 0;

  // ── Top header bar ──
  const headerContent = (
    <>
      <div className="flex items-center gap-12">
        <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">Posts</h1>
        <nav className="flex gap-8">
          {([
            { key: 'composer' as SourceTab, label: 'My Articles' },
            { key: 'pipeline' as SourceTab, label: 'Pipeline' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setSourceTab(tab.key)}
              className={`font-medium pb-2 transition-all border-b-2 ${
                sourceTab === tab.key
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[20px]">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/50"
            placeholder="Search articles..."
            type="text"
          />
        </div>
        <button className="p-2 text-outline hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button
          onClick={() => navigate('/composer')}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Compose
        </button>
      </div>
    </>
  );

  return (
    <AppShell header={headerContent}>
      <div className="p-12">
        {/* ── Page Hero ── */}
        <section className="mb-12">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-[2.75rem] font-extrabold font-headline leading-none text-on-surface">
                {sourceTab === 'composer' ? 'Editorial Queue' : 'Pipeline Feed'}
              </h2>
              <p className="text-on-surface-variant mt-3 text-lg font-medium max-w-2xl">
                {sourceTab === 'composer'
                  ? 'Curating the next generation of digital narratives.'
                  : 'Auto-scraped from RSS feeds and web sources.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest">
                Last sync: {timeAgo(new Date().toISOString())}
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </section>

        {/* ── Pill Filters ── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(statusFilter === f ? null : f)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  statusFilter === f
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                statusFilter === null
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              ALL
            </button>
          </div>
        </section>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/15 h-64 animate-pulse" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-primary p-6 rounded-xl h-32 animate-pulse" />
              <div className="bg-surface-container-low p-6 rounded-xl h-28 animate-pulse" />
            </div>
          </div>
        ) : !articles?.length ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[40px] text-outline">edit_note</span>
            </div>
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">
              {sourceTab === 'composer' ? 'No articles yet' : 'Pipeline is quiet'}
            </h3>
            <p className="text-on-surface-variant max-w-sm">
              {sourceTab === 'composer'
                ? 'Use the Composer to scrape and rewrite articles from any URL.'
                : 'Configure your RSS feeds and run the pipeline to start generating articles.'}
            </p>
            {sourceTab === 'composer' && (
              <button
                onClick={() => navigate('/composer')}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-lg hover:translate-y-[-2px] transition-all"
              >
                Open Composer
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ── Featured Draft (8 cols) ── */}
            {featuredArticle && (
              <div className="lg:col-span-8 group cursor-pointer" onClick={() => navigate(`/article/${featuredArticle.id}`)}>
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                  {/* Featured image */}
                  {(() => {
                    const imgUrl = getThumbnailUrl(featuredArticle);
                    return imgUrl ? (
                      <div className="h-64 w-full overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={featuredArticle.title || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ) : null;
                  })()}

                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <StatusBadge status={featuredArticle.status} />
                      {featuredArticle.category && (
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{featuredArticle.category}</span>
                      )}
                      <span className="w-1 h-1 rounded-full bg-outline-variant" />
                      <span className="text-on-surface-variant text-sm font-medium">{timeAgo(featuredArticle.created_at)}</span>
                    </div>
                    <h3 className="text-3xl font-bold font-headline mb-4 group-hover:text-primary transition-colors line-clamp-2">
                      {featuredArticle.title || 'Untitled'}
                    </h3>
                    {featuredArticle.summary && (
                      <p className="text-on-surface-variant text-lg leading-relaxed mb-6 max-w-2xl line-clamp-3">
                        {featuredArticle.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      {featuredArticle.source_outlet && (
                        <span className="text-sm font-medium text-on-surface-variant">{featuredArticle.source_outlet}</span>
                      )}
                      {featuredArticle.reading_time_minutes && (
                        <span className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-lg">schedule</span>
                          {featuredArticle.reading_time_minutes} min read
                        </span>
                      )}
                      {featuredArticle.rewrite_model && <ModelBadge model={featuredArticle.rewrite_model} size="md" />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stats Sidebar (4 cols) ── */}
            {featuredArticle && stats && (
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-primary p-6 rounded-xl text-on-primary">
                  <p className="text-sm font-medium opacity-80 mb-1">Total Articles</p>
                  <h4 className="text-3xl font-extrabold font-headline">{total}</h4>
                  <div className="mt-4 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((stats.published || 0) / Math.max(1, total)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-medium">
                    {stats.published || 0} published · {stats.draft || 0} drafts
                  </p>
                </div>

                <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
                  <h5 className="font-bold font-headline mb-4">Trending Tags</h5>
                  <div className="flex flex-wrap gap-2">
                    {['#Technology', '#Reviews', '#AI', '#Mobile'].map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-surface-container-lowest rounded-lg text-xs font-semibold border border-outline-variant/15">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Article List Cards ── */}
            <div className="lg:col-span-12 space-y-6 mt-4">
              {listArticles.map(article => (
                <ArticleListCard
                  key={article.id}
                  article={article}
                  onClick={() => navigate(`/article/${article.id}`)}
                  onDelete={() => {
                    if (confirm('Delete this article?')) deleteMutation.mutate(article.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <div className="fixed bottom-10 right-10 z-40">
        <button
          onClick={() => navigate('/composer')}
          className="w-16 h-16 rounded-full bg-primary text-on-primary shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-[32px]">edit_note</span>
        </button>
      </div>
    </AppShell>
  );
}


/* ─── Article list card (matches mockup: thumbnail + content + actions) ─── */
function ArticleListCard({ article, onClick, onDelete }: {
  article: ArticleListItem;
  onClick: () => void;
  onDelete: () => void;
}) {
  const thumbnailUrl = getThumbnailUrl(article);
  const isRejected = article.status.toLowerCase() === 'rejected';

  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex flex-col md:flex-row gap-8 items-center hover:bg-white transition-colors cursor-pointer group ${
        isRejected ? 'opacity-75' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className={`w-full md:w-48 h-32 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 ${isRejected ? 'grayscale' : ''}`}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={article.title || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-outline/30">image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          {article.category && (
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{article.category}</span>
          )}
          {article.category && <span className="w-1 h-1 rounded-full bg-outline-variant" />}
          <span className="text-xs text-on-surface-variant">{timeAgo(article.created_at)}</span>
        </div>
        <h3 className={`text-xl font-bold font-headline mb-2 group-hover:text-primary transition-colors line-clamp-2 ${
          isRejected ? 'text-on-surface/60' : ''
        }`}>
          {article.title || 'Untitled'}
        </h3>
        {article.summary && (
          <p className="text-on-surface-variant text-sm line-clamp-2">{article.summary}</p>
        )}
        {/* Meta row: source + reading time + AI model */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {article.source_outlet && (
            <span className="text-xs text-on-surface-variant">{article.source_outlet}</span>
          )}
          {article.reading_time_minutes && (
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {article.reading_time_minutes} min read
            </span>
          )}
          {article.rewrite_model && <ModelBadge model={article.rewrite_model} />}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-3 flex-shrink-0">
        <StatusBadge status={article.status} />
        <div className="flex gap-2">
          {isRejected ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              title="View history"
            >
              <span className="material-symbols-outlined">history</span>
            </button>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                title="Edit"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 text-on-surface-variant hover:text-error transition-colors"
                title="Delete"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── Thumbnail URL helper (shared by featured card + list cards) ─── */
function getThumbnailUrl(article: ArticleListItem): string | null {
  // 1. Selected image
  if (article.selected_image?.url) return article.selected_image.url;
  // 2. First searched image result
  if (article.searched_images) {
    const imgs = Array.isArray(article.searched_images)
      ? article.searched_images
      : Object.values(article.searched_images).flat();
    const first = imgs.find((img: any) => img?.url || (typeof img === 'string' && img));
    if (first) return typeof first === 'string' ? first : first.url;
  }
  // 3. Original images from the source article
  if (article.original_images) {
    const imgs = Array.isArray(article.original_images)
      ? article.original_images
      : typeof article.original_images === 'object'
        ? Object.values(article.original_images).flat()
        : [];
    const first = imgs.find((img: any) => img?.url || img?.src || (typeof img === 'string' && img));
    if (first) return typeof first === 'string' ? first : (first.url || first.src);
  }
  return null;
}
