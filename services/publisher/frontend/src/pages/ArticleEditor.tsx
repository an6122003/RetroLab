import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, ArticleListItem } from '../api';
import AppShell from '../components/AppShell';
import EditorPanel from '../components/EditorPanel';
import StatusBadge from '../components/StatusBadge';
import ModelBadge from '../components/ModelBadge';

const STATUS_FILTERS = ['draft', 'approved', 'published', 'rejected'] as const;

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

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>('draft');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: articles, isLoading: listLoading } = useQuery({
    queryKey: ['articles', statusFilter],
    queryFn: () => api.listArticles(statusFilter || undefined, 100),
  });

  const {
    data: article,
    isLoading: articleLoading,
    error,
  } = useQuery({
    queryKey: ['article', id],
    queryFn: () => api.getArticle(id!),
    enabled: !!id,
  });

  // ── Multi-select helpers ──
  const toggleSelect = useCallback((articleId: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!articles) return;
    setSelectedIds(new Set(articles.map(a => a.id)));
  }, [articles]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Batch mutation ──
  const batchMutation = useMutation({
    mutationFn: ({ action }: { action: 'approve' | 'reject' | 'delete' }) =>
      api.batchArticles(Array.from(selectedIds), action),
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      const verb = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'deleted';
      toast.success(`${data.success} article${data.success !== 1 ? 's' : ''} ${verb}`);
      if (data.failed > 0) toast.error(`${data.failed} failed`);
      setSelectedIds(new Set());
      // If current article was in the batch, navigate away
      if (id && selectedIds.has(id)) navigate('/editor');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Delete single ──
  const deleteMutation = useMutation({
    mutationFn: (articleId: string) => api.deleteArticle(articleId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Article deleted');
      if (id === deletedId) navigate('/editor');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Auto-navigate to next article after approve/reject ──
  const navigateToNext = useCallback(() => {
    if (!articles || !id) return;
    const currentIndex = articles.findIndex(a => a.id === id);
    if (currentIndex === -1) return;
    // Try the next article, then the previous
    const nextArticle = articles[currentIndex + 1] || articles[currentIndex - 1];
    if (nextArticle && nextArticle.id !== id) {
      // Small delay so the query invalidation has time to propagate
      setTimeout(() => navigate(`/article/${nextArticle.id}`), 150);
    }
  }, [articles, id, navigate]);

  const hasSelection = selectedIds.size > 0;

  const Sidebar = (
    <>
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant/15">
        <h1 className="text-base font-bold text-on-surface tracking-tight">Editor</h1>
        <p className="text-[11px] text-outline mt-0.5">Article editing & publishing</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1 p-3 border-b border-outline-variant/15">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setStatusFilter(statusFilter === f ? null : f); setSelectedIds(new Set()); }}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all uppercase tracking-wider ${
              statusFilter === f
                ? 'bg-primary-container text-white'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => { setStatusFilter(null); setSelectedIds(new Set()); }}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all uppercase tracking-wider ${
            statusFilter === null
              ? 'bg-primary-container text-white'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          All
        </button>
      </div>

      {/* ── Batch action bar (only when items selected) ── */}
      {hasSelection && (
        <div className="p-2 border-b border-outline-variant/15 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-primary">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-1">
              <button onClick={selectAll} className="text-[10px] text-primary hover:underline">All</button>
              <span className="text-[10px] text-outline">·</span>
              <button onClick={selectNone} className="text-[10px] text-primary hover:underline">None</button>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => batchMutation.mutate({ action: 'approve' })}
              disabled={batchMutation.isPending}
              className="flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => batchMutation.mutate({ action: 'reject' })}
              disabled={batchMutation.isPending}
              className="flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
            >
              ✕ Reject
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete ${selectedIds.size} article(s)? This cannot be undone.`))
                  batchMutation.mutate({ action: 'delete' });
              }}
              disabled={batchMutation.isPending}
              className="flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors disabled:opacity-50"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {listLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : !articles?.length ? (
          <div className="p-6 text-center">
            <div className="text-2xl mb-2">📭</div>
            <p className="text-outline text-xs">No articles found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {articles.map(a => {
              const isSelected = selectedIds.has(a.id);
              const isActive = a.id === id;
              const isRejected = a.status === 'rejected';

              return (
                <div
                  key={a.id}
                  className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 group flex items-start gap-2 ${
                    isActive
                      ? 'bg-surface-container-low border border-blue-200'
                      : isSelected
                        ? 'bg-primary/5 border border-primary/20'
                        : 'hover:bg-surface-container-low border border-transparent hover:border-outline-variant/15'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelect(a.id, e)}
                    className="mt-1 w-3.5 h-3.5 rounded border-outline-variant/30 text-primary focus:ring-primary/30 cursor-pointer flex-shrink-0 accent-primary"
                  />

                  {/* Content — click navigates */}
                  <button
                    onClick={() => navigate(`/article/${a.id}`)}
                    className="flex-1 text-left min-w-0"
                  >
                    <h3 className={`text-[13px] font-medium line-clamp-2 leading-snug transition-colors mb-1.5 ${
                      isActive ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                    }`}>
                      {a.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={a.status} />
                      {a.source_outlet && (
                        <span className="text-[9px] text-outline truncate max-w-[80px]">{a.source_outlet}</span>
                      )}
                      <span className="text-[9px] text-outline ml-auto">{timeAgo(a.created_at)}</span>
                    </div>
                    {/* Rewrite model */}
                    {a.rewrite_model && (
                      <div className="mt-1">
                        <ModelBadge model={a.rewrite_model} />
                      </div>
                    )}
                  </button>

                  {/* Delete button for rejected articles */}
                  {isRejected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this rejected article permanently?'))
                          deleteMutation.mutate(a.id);
                      }}
                      className="p-1 text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title="Delete permanently"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // ── Editor action state (populated by EditorPanel via callback) ──
  const [editorActions, setEditorActions] = useState<{
    saveStatus: 'idle' | 'saving' | 'saved';
    canReject: boolean; canApprove: boolean; approveReady: boolean; approveMissing: string[];
    canPublish: boolean; isPublished: boolean;
    onSave: () => void; onReject: () => void; onApprove: () => void; onPublish: () => void;
    isApproving: boolean; isRejecting: boolean; isPublishing: boolean;
  } | null>(null);

  const headerContent = (
    <>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <h1 className="text-xl sm:text-2xl font-extrabold font-headline tracking-tight text-on-surface">Editor</h1>
        {article && (
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-container-high text-on-surface-variant text-[10px] sm:text-xs font-semibold rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Editing
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar justify-end w-full">
        {article && editorActions && (
          <>
            {/* Save status */}
            <span className={`hidden md:inline text-[10px] sm:text-sm font-medium shrink-0 ${
              editorActions.saveStatus === 'saving' ? 'text-amber-500 animate-pulse' :
              editorActions.saveStatus === 'saved' ? 'text-emerald-600' :
              'text-on-surface-variant'
            }`}>
              {editorActions.saveStatus === 'saving' ? 'Saving…' :
               editorActions.saveStatus === 'saved' ? 'Auto-saved ✓' :
               'Auto-saved'}
            </span>

            {/* Save Draft */}
            <button
              onClick={editorActions.onSave}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
            >
              Save Draft
            </button>

            {/* Reject */}
            {editorActions.canReject && (
              <button
                onClick={() => {
                  if (window.confirm('Reject this article?')) editorActions.onReject();
                }}
                disabled={editorActions.isRejecting}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm font-medium text-error/80 hover:text-error transition-colors disabled:opacity-50 shrink-0"
              >
                {editorActions.isRejecting ? 'Rejecting…' : 'Reject'}
              </button>
            )}

            {/* Approve */}
            {editorActions.canApprove && (
              <button
                onClick={editorActions.onApprove}
                disabled={editorActions.isApproving || !editorActions.approveReady}
                title={!editorActions.approveReady ? `Missing: ${editorActions.approveMissing.join(', ')}` : 'Approve article'}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 ${
                  editorActions.approveReady
                    ? 'text-primary hover:text-primary/80'
                    : 'text-on-surface-variant cursor-not-allowed'
                }`}
              >
                {editorActions.isApproving ? 'Approving…' : 'Approve'}
              </button>
            )}

            {/* Publish */}
            {editorActions.canPublish && (
              <button
                onClick={editorActions.onPublish}
                disabled={editorActions.isPublishing}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-[11px] sm:text-sm rounded-lg hover:translate-y-[-2px] active:scale-95 transition-all shadow-sm disabled:opacity-50 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">rocket_launch</span>
                {editorActions.isPublishing ? 'Publishing…' : 'Publish'}
              </button>
            )}

            {/* Published state */}
            {editorActions.isPublished && (
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 font-semibold text-[11px] sm:text-sm rounded-lg border border-emerald-200 shrink-0">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">check_circle</span>
                Published
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return (
    <AppShell header={headerContent} sidebar={Sidebar}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {articleLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-error text-sm">Failed to load article</p>
              <p className="text-outline text-xs">{(error as Error).message}</p>
              <button onClick={() => navigate('/')} className="text-primary text-xs hover:underline">
                ← Back to dashboard
              </button>
            </div>
          </div>
        )}

        {!id && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[40px] text-outline">edit_note</span>
              </div>
              <h2 className="text-xl font-bold font-headline text-on-surface">Select an article</h2>
              <p className="text-sm text-on-surface-variant">Choose from the sidebar to start editing</p>
            </div>
          </div>
        )}

        {article && (
          <EditorPanel
            key={article.id}
            article={article}
            onActionsReady={setEditorActions}
            onNavigateNext={navigateToNext}
          />
        )}
      </div>
    </AppShell>
  );
}
