import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api';
import AppShell from '../components/AppShell';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function CurationPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data ──────────────────────────────────────────────────────
  const { data: articles, isLoading } = useQuery({
    queryKey: ['curation-articles'],
    queryFn: () => api.getCurationArticles('scraped'),
    refetchInterval: 10_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['curation-stats'],
    queryFn: api.getCurationStats,
    refetchInterval: 10_000,
  });

  // ── Filters ───────────────────────────────────────────────────
  const sourcesUnique = useMemo(() => {
    if (!articles) return [];
    const map = new Map<string, number>();
    articles.forEach(a => map.set(a.source_name, (map.get(a.source_name) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const filtered = useMemo(() => {
    if (!articles) return [];
    return articles.filter(a => {
      if (sourceFilter && a.source_name !== sourceFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (a.title || '').toLowerCase().includes(q) ||
          (a.source_name || '').toLowerCase().includes(q) ||
          (a.url || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [articles, sourceFilter, searchQuery]);

  // ── Mutations ─────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['curation-articles'] });
    queryClient.invalidateQueries({ queryKey: ['curation-stats'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-status'] });
    queryClient.invalidateQueries({ queryKey: ['queue-status'] });
  };

  const approveMutation = useMutation({
    mutationFn: (ids: string[]) => api.approveCurationArticles(ids),
    onSuccess: (data) => {
      toast.success(`${data.approved} article${data.approved !== 1 ? 's' : ''} approved for rewriting`);
      setSelected(new Set());
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const discardMutation = useMutation({
    mutationFn: (ids: string[]) => api.discardCurationArticles(ids),
    onSuccess: (data) => {
      toast.success(`${data.discarded} article${data.discarded !== 1 ? 's' : ''} discarded`);
      setSelected(new Set());
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveAllMutation = useMutation({
    mutationFn: () => api.approveAllCurationArticles(),
    onSuccess: (data) => {
      toast.success(`All ${data.approved} articles approved`);
      setSelected(new Set());
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const discardAllMutation = useMutation({
    mutationFn: () => api.discardAllCurationArticles(),
    onSuccess: (data) => {
      toast.success(`All ${data.discarded} articles discarded`);
      setSelected(new Set());
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Selection helpers ─────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  };

  const isAllSelected = filtered.length > 0 && selected.size === filtered.length;
  const hasSelection = selected.size > 0;
  const scrapedCount = stats?.scraped ?? 0;
  const processingCount = stats?.processing ?? 0;
  const discardedCount = stats?.discarded ?? 0;

  const isActioning = approveMutation.isPending || discardMutation.isPending ||
    approveAllMutation.isPending || discardAllMutation.isPending;

  // ── Header ────────────────────────────────────────────────────
  const headerContent = (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <h1 className="text-xl sm:text-2xl font-extrabold font-headline tracking-tight text-on-surface shrink-0">
          Curation
        </h1>
        {scrapedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            {scrapedCount} awaiting review
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 sm:gap-4 self-start xl:self-auto">
        <div className="relative flex items-center flex-1 sm:flex-none">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[20px]">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/15 rounded-lg text-sm w-full sm:w-56 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/50"
            placeholder="Search articles..."
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  // ── Sidebar ───────────────────────────────────────────────────
  const sidebar = (
    <>
      <div className="p-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/15 text-center">
            <p className="text-xl font-bold font-headline text-teal-600">{scrapedCount}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5">Scraped</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/15 text-center">
            <p className="text-xl font-bold font-headline text-amber-600">{processingCount}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5">Rewriting</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/15 text-center">
            <p className="text-xl font-bold font-headline text-on-surface-variant">{discardedCount}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5">Discarded</p>
          </div>
        </div>

        {/* Source filter */}
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-2">Filter by Source</p>
        <nav className="space-y-0.5 max-h-[50vh] overflow-y-auto">
          <button
            onClick={() => setSourceFilter(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
              !sourceFilter
                ? 'bg-surface-container-lowest text-primary font-semibold border border-outline-variant/15'
                : 'text-on-surface-variant hover:bg-surface-container-lowest/50'
            }`}
          >
            <span>All Sources</span>
            <span className="text-[10px] text-outline">{articles?.length ?? 0}</span>
          </button>
          {sourcesUnique.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setSourceFilter(sourceFilter === name ? null : name)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                sourceFilter === name
                  ? 'bg-surface-container-lowest text-primary font-semibold border border-outline-variant/15'
                  : 'text-on-surface-variant hover:bg-surface-container-lowest/50'
              }`}
            >
              <span className="truncate pr-2">{name}</span>
              <span className="text-[10px] text-outline shrink-0">{count}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );

  return (
    <AppShell header={headerContent} sidebar={sidebar}>
      <div className="p-4 lg:p-12 animate-fade-in-up">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* ── Hero & Actions ────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl lg:text-[2.75rem] font-extrabold font-headline leading-none text-on-surface">
                Article Review
              </h2>
              <p className="text-on-surface-variant mt-2 lg:mt-3 text-sm lg:text-lg font-medium max-w-2xl">
                Approve scraped articles to continue to LLM rewrite, or discard irrelevant content.
              </p>
            </div>
          </div>

          {/* ── Bulk Action Bar ────────────────────────────── */}
          {(filtered.length > 0 || hasSelection) && (
            <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium"
                >
                  <span className={`material-symbols-outlined text-[20px] ${isAllSelected ? 'text-primary' : ''}`}>
                    {isAllSelected ? 'check_box' : hasSelection ? 'indeterminate_check_box' : 'check_box_outline_blank'}
                  </span>
                  {hasSelection ? `${selected.size} selected` : 'Select all'}
                </button>
                {sourceFilter && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                    {sourceFilter}
                    <button onClick={() => setSourceFilter(null)} className="ml-1 hover:text-error">✕</button>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {hasSelection ? (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(Array.from(selected))}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-semibold disabled:opacity-50 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Approve ({selected.size})
                    </button>
                    <button
                      onClick={() => discardMutation.mutate(Array.from(selected))}
                      disabled={isActioning}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-surface-container text-error hover:bg-red-50 border border-red-200 transition-colors font-semibold disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Discard ({selected.size})
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (confirm(`Approve all ${filtered.length} articles for rewriting?`))
                          approveAllMutation.mutate();
                      }}
                      disabled={isActioning || filtered.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors font-medium disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      Approve All
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Discard all ${filtered.length} articles?`))
                          discardAllMutation.mutate();
                      }}
                      disabled={isActioning || filtered.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-error hover:bg-red-100 border border-red-200 transition-colors font-medium disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                      Discard All
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Article List ──────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-6 animate-pulse">
                  <div className="h-5 bg-surface-container rounded w-2/3 mb-3" />
                  <div className="h-3 bg-surface-container rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[40px] text-outline">inbox</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface mb-2">
                {searchQuery || sourceFilter ? 'No matching articles' : 'No articles to review'}
              </h3>
              <p className="text-on-surface-variant max-w-sm">
                {searchQuery || sourceFilter
                  ? 'Try adjusting your filters or search query.'
                  : 'Run the pipeline to scrape new articles. They\u2019ll appear here for your review.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(article => {
                const isSelected = selected.has(article.id);
                const isExpanded = expandedId === article.id;

                return (
                  <div
                    key={article.id}
                    className={`bg-surface-container-lowest rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'border-primary/40 shadow-md shadow-primary/5'
                        : 'border-outline-variant/15 hover:border-outline-variant/30'
                    }`}
                  >
                    {/* Main row */}
                    <div className="flex items-start gap-3 p-4 lg:p-5">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(article.id)}
                        className="mt-0.5 shrink-0"
                      >
                        <span className={`material-symbols-outlined text-[22px] transition-colors ${
                          isSelected ? 'text-primary' : 'text-outline/40 hover:text-outline'
                        }`}>
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                            {article.source_name}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant" />
                          {article.category && (
                            <>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                                {article.category}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-outline-variant" />
                            </>
                          )}
                          <span className="text-xs text-on-surface-variant">{timeAgo(article.scraped_at || article.created_at)}</span>
                        </div>

                        <h3
                          className="text-base lg:text-lg font-bold font-headline text-on-surface leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-2"
                          onClick={() => setExpandedId(isExpanded ? null : article.id)}
                        >
                          {article.title || 'Untitled'}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {article.word_count > 0 && (
                            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                              <span className="material-symbols-outlined text-[14px]">notes</span>
                              {article.word_count.toLocaleString()} words
                            </span>
                          )}
                          {article.language && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium uppercase">
                              {article.language}
                            </span>
                          )}
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            Source
                          </a>
                        </div>

                        {/* Expanded preview */}
                        {isExpanded && article.body_text && (
                          <div className="mt-4 p-4 bg-surface-container/40 rounded-lg border border-outline-variant/10">
                            <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap line-clamp-[12]">
                              {article.body_text.slice(0, 1500)}
                              {article.body_text.length > 1500 && '...'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : article.id)}
                          className="p-1.5 text-outline/60 hover:text-primary transition-colors rounded-lg hover:bg-surface-container"
                          title={isExpanded ? 'Collapse' : 'Preview'}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                        <button
                          onClick={() => approveMutation.mutate([article.id])}
                          disabled={isActioning}
                          className="p-1.5 text-emerald-600/60 hover:text-emerald-600 hover:bg-emerald-50 transition-colors rounded-lg disabled:opacity-50"
                          title="Approve"
                        >
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        </button>
                        <button
                          onClick={() => discardMutation.mutate([article.id])}
                          disabled={isActioning}
                          className="p-1.5 text-error/40 hover:text-error hover:bg-red-50 transition-colors rounded-lg disabled:opacity-50"
                          title="Discard"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
