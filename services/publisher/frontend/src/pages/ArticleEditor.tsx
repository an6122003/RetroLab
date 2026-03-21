import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ArticleListItem } from '../api';
import AppShell from '../components/AppShell';
import EditorPanel from '../components/EditorPanel';
import StatusBadge from '../components/StatusBadge';

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
  const [statusFilter, setStatusFilter] = useState<string | null>('draft');

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
            onClick={() => setStatusFilter(statusFilter === f ? null : f)}
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
          onClick={() => setStatusFilter(null)}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all uppercase tracking-wider ${
            statusFilter === null
              ? 'bg-primary-container text-white'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          All
        </button>
      </div>

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
            {articles.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(`/article/${a.id}`)}
                className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 group ${
                  a.id === id
                    ? 'bg-surface-container-low border border-blue-200'
                    : 'hover:bg-surface-container-low border border-transparent hover:border-outline-variant/15'
                }`}
              >
                <h3 className={`text-[13px] font-medium line-clamp-2 leading-snug transition-colors mb-1.5 ${
                  a.id === id ? 'text-primary' : 'text-on-surface group-hover:text-primary'
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
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // ── Editor action state (populated by EditorPanel via callback) ──
  const [editorActions, setEditorActions] = useState<{
    saveStatus: 'idle' | 'saving' | 'saved';
    canReject: boolean; canApprove: boolean; canPublish: boolean; isPublished: boolean;
    onSave: () => void; onReject: () => void; onApprove: () => void; onPublish: () => void;
    isApproving: boolean; isRejecting: boolean; isPublishing: boolean;
  } | null>(null);

  const headerContent = (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">Editor</h1>
        {article && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high text-on-surface-variant text-xs font-semibold rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Editing
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {article && editorActions && (
          <>
            {/* Save status */}
            <span className={`text-sm font-medium ${
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
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
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
                className="px-4 py-2 text-sm font-medium text-error/80 hover:text-error transition-colors disabled:opacity-50"
              >
                {editorActions.isRejecting ? 'Rejecting…' : 'Reject'}
              </button>
            )}

            {/* Approve */}
            {editorActions.canApprove && (
              <button
                onClick={editorActions.onApprove}
                disabled={editorActions.isApproving}
                className="px-4 py-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {editorActions.isApproving ? 'Approving…' : 'Approve'}
              </button>
            )}

            {/* Publish */}
            {editorActions.canPublish && (
              <button
                onClick={editorActions.onPublish}
                disabled={editorActions.isPublishing}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm rounded-lg hover:translate-y-[-2px] active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                {editorActions.isPublishing ? 'Publishing…' : 'Publish'}
              </button>
            )}

            {/* Published state */}
            {editorActions.isPublished && (
              <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 font-semibold text-sm rounded-lg border border-emerald-200">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
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

        {article && <EditorPanel key={article.id} article={article} onActionsReady={setEditorActions} />}
      </div>
    </AppShell>
  );
}
