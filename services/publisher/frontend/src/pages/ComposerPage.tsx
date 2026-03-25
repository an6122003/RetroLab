import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { api, ComposeResponse, ComposeResult } from '../api';
import AppShell from '../components/AppShell';

const PROVIDER_META: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  gemini:    { icon: '✦', label: 'Gemini',    color: 'text-primary',    bgColor: 'bg-surface-container-low border-blue-200' },
  anthropic: { icon: '◆', label: 'Anthropic',  color: 'text-amber-600',   bgColor: 'bg-amber-50 border-amber-200' },
  ollama:    { icon: '🦙', label: 'Ollama',    color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
};

function modelKey(provider: string, name: string) {
  return provider === 'ollama' ? name : `${provider}:${name}`;
}

export default function ComposerPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [composeData, setComposeData] = useState<ComposeResponse | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['compose-models'],
    queryFn: api.getComposeModels,
  });

  const models = modelsData?.models || [];

  // Group by provider
  const grouped = models.reduce<Record<string, typeof models>>((acc, m) => {
    const p = (m as any).provider || 'ollama';
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {});

  // Compose mutation
  const composeMutation = useMutation({
    mutationFn: () => api.composeArticle(url, selectedModels),
    onSuccess: (data) => {
      setComposeData(data);
      toast.success(`Composed with ${data.results.length} model(s)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Retry only failed models (skips re-scraping)
  const retryMutation = useMutation({
    mutationFn: (failedModels: string[]) => {
      const targetUrl = composeData?.url || url;
      return api.composeRetry(targetUrl, failedModels);
    },
    onSuccess: (retryData) => {
      if (!composeData) return;
      // Merge retry results: replace failed entries with new results
      const retriedModelNames = new Set(retryData.results.map(r => r.model));
      const kept = composeData.results.filter(r => !retriedModelNames.has(r.model));
      setComposeData({
        ...composeData,
        results: [...kept, ...retryData.results],
      });
      const successes = retryData.results.filter(r => r.status === 'success').length;
      if (successes > 0) toast.success(`Retried ${successes} model(s) successfully`);
      else toast.error('Retry failed again');
    },
    onError: (err: Error) => toast.error(`Retry failed: ${err.message}`),
  });

  const toggleModel = (key: string) => {
    setSelectedModels(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const canCompose = url.trim().length > 0 && selectedModels.length > 0 && !composeMutation.isPending;

  const ModelSidebar = (
    <>
      <div className="px-5 py-4 border-b border-outline-variant/15">
        <h1 className="text-base font-bold text-on-surface tracking-tight">Composer</h1>
        <p className="text-[11px] text-outline mt-0.5">LLM comparison tool</p>
      </div>

      {/* Model Selector — grouped by provider */}
      <div className="p-3 flex-1 overflow-y-auto space-y-4">
        {models.length === 0 && (
          <p className="text-xs text-outline italic">Loading models...</p>
        )}
        {['gemini', 'anthropic', 'ollama'].filter(p => grouped[p]?.length > 0).map(provider => {
          const meta = PROVIDER_META[provider];
          const providerModels = grouped[provider];
          return (
            <div key={provider}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`text-xs ${meta.color}`}>{meta.icon}</span>
                <h3 className={`text-[10px] uppercase tracking-wider font-semibold ${meta.color}`}>{meta.label}</h3>
                <span className="text-[8px] text-outline ml-auto">{provider === 'ollama' ? 'Local' : 'API'}</span>
              </div>
              <div className="space-y-0.5">
                {providerModels.map(m => {
                  const key = modelKey(provider, m.name);
                  const isSelected = selectedModels.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleModel(key)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        isSelected
                          ? `${meta.bgColor} ${meta.color} border`
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border border-transparent'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded border flex items-center justify-center text-[8px] ${
                        isSelected ? 'bg-primary-container border-blue-500 text-white' : 'border-outline-variant'
                      }`}>
                        {isSelected && '✓'}
                      </span>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-on-surface">{m.name}</div>
                        <div className="text-[9px] text-outline">
                          {m.parameter_size !== '—' ? `${m.parameter_size} · ` : ''}{m.size_gb > 0 ? `${m.size_gb}GB` : 'Cloud'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {selectedModels.length > 0 && (
          <div className="pt-2 border-t border-outline-variant/15">
            <p className="text-[10px] text-on-surface-variant mb-1">{selectedModels.length} model(s) selected</p>
            <button
              onClick={() => setSelectedModels([])}
              className="text-[10px] text-error hover:text-red-600"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );

  // ── Top header bar ──
  const headerContent = (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">Composer</h1>
        <span className="flex items-center gap-1.5 px-3 py-1 bg-error-container text-on-error-container text-xs font-semibold rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-error" />
          Drafting Mode
        </span>
      </div>
      <div className="flex items-center gap-4">
        {composeData && (
          <span className="text-sm text-on-surface-variant">
            {composeData.results.length} results
          </span>
        )}
      </div>
    </>
  );

  return (
    <AppShell header={headerContent} sidebar={ModelSidebar}>
      <div className="flex-1 overflow-y-auto">
        {/* URL Input Bar */}
        <div className="sticky top-0 z-10 bg-surface-container-lowest backdrop-blur-xl border-b border-outline-variant/10 px-12 py-4">
          <div className="max-w-4xl flex gap-3 items-center">
            <span className="material-symbols-outlined text-outline text-[22px]">link</span>
            <div className="flex-1 relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste URL to Scrape & Rewrite..."
                className="w-full bg-transparent border-none text-sm text-on-surface placeholder:text-outline focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && canCompose) composeMutation.mutate(); }}
              />
            </div>
            <button
              onClick={() => composeMutation.mutate()}
              disabled={!canCompose}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-semibold hover:translate-y-[-2px] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
            >
              {composeMutation.isPending ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Composing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  Scrape
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Empty state */}
          {!composeData && !composeMutation.isPending && (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🎼</div>
              <h2 className="text-xl font-semibold text-on-surface mb-2">LLM Composer</h2>
              <p className="text-on-surface-variant text-sm max-w-md mx-auto mb-6">
                Paste an article URL, select models from the sidebar, and compare their rewriting performance side by side.
              </p>
              <div className="flex items-center justify-center gap-6 text-on-surface-variant text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded bg-surface-container text-on-surface-variant flex items-center justify-center font-medium">1</span>
                  Paste URL
                </div>
                <span>→</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded bg-surface-container text-on-surface-variant flex items-center justify-center font-medium">2</span>
                  Pick models
                </div>
                <span>→</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded bg-surface-container text-on-surface-variant flex items-center justify-center font-medium">3</span>
                  Compare
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {composeMutation.isPending && (
            <div className="text-center py-24">
              <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="text-sm text-on-surface font-medium">Composing article...</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Running {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''} (API models in parallel, Ollama sequentially)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {composeData && (
            <div className="space-y-6">
              {/* Scraped article info */}
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/15 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface">{composeData.scraped.title || 'Untitled'}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {composeData.scraped.word_count} words
                      {composeData.scraped.original_images?.length ? ` · ${composeData.scraped.original_images.length} images` : ''}
                      {' · '}<a href={composeData.url} target="_blank" className="text-primary hover:underline">{composeData.url}</a>
                    </p>
                  </div>
                </div>
                {/* Image gallery */}
                {composeData.scraped.original_images && composeData.scraped.original_images.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/15">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 font-medium">Original Images</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {composeData.scraped.original_images.map((imgUrl, i) => (
                        <a key={i} href={imgUrl} target="_blank" rel="noopener" className="flex-shrink-0">
                          <img
                            src={imgUrl}
                            alt={`Article image ${i + 1}`}
                            className="h-24 w-auto rounded-lg border border-outline-variant/15 object-cover hover:border-primary/50 transition-all hover:scale-105"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Performance summary */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(composeData.results.length, 4)}, 1fr)` }}>
                {composeData.results.map(r => {
                  const prov = (r as any).provider || 'ollama';
                  const meta = PROVIDER_META[prov] || PROVIDER_META.ollama;
                  return (
                    <div
                      key={r.model}
                      className={`rounded-xl p-4 border transition-all cursor-pointer ${
                        r.status === 'success'
                          ? 'bg-surface-container-lowest border-outline-variant/15 hover:border-primary/30 shadow-sm'
                          : 'bg-error-container border-error/20'
                      }`}
                      onClick={() => setExpandedModel(expandedModel === r.model ? null : r.model)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs ${meta.color}`}>{meta.icon}</span>
                          <h4 className="text-sm font-bold text-on-surface">{r.model}</h4>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          r.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-error-container text-red-600'
                        }`}>{r.status}</span>
                      </div>
                      {r.status === 'success' ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-lg font-bold text-cyan-600">{r.duration_sec}s</p>
                            <p className="text-[9px] text-outline uppercase">Duration</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-amber-600">{r.tokens_generated || '—'}</p>
                            <p className="text-[9px] text-outline uppercase">Tokens</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-primary">{r.tokens_per_sec || '—'}</p>
                            <p className="text-[9px] text-outline uppercase">Tok/sec</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-error mb-3">{r.error}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const prov = (r as any).provider || 'ollama';
                              const key = prov === 'ollama' ? r.model : `${prov}:${r.model}`;
                              retryMutation.mutate([key]);
                            }}
                            disabled={retryMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-white text-[11px] font-medium hover:bg-primary disabled:opacity-50 transition-all"
                          >
                            {retryMutation.isPending ? (
                              <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> Retrying...</>
                            ) : (
                              <><span className="material-symbols-outlined text-[14px]">refresh</span> Retry (skip scrape)</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Side-by-side content */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(composeData.results.filter(r => r.status === 'success').length, 3)}, 1fr)` }}>
                {composeData.results.filter(r => r.status === 'success').map(r => (
                  <ResultCard
                    key={r.model}
                    result={r}
                    expanded={expandedModel === r.model}
                    composeUrl={composeData.url}
                    sourceTitle={composeData.scraped.title}
                    sourceAuthor={composeData.scraped.author || ''}
                    sourceSitename={composeData.scraped.sitename || ''}
                    originalImages={composeData.scraped.original_images || []}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}


function ResultCard({ result, expanded, composeUrl, sourceTitle, sourceAuthor, sourceSitename, originalImages }: {
  result: ComposeResult;
  expanded: boolean;
  composeUrl: string;
  sourceTitle: string;
  sourceAuthor: string;
  sourceSitename: string;
  originalImages: string[];
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'preview' | 'body'>('preview');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const r = result.result!;
  const prov = (result as any).provider || 'ollama';
  const meta = PROVIDER_META[prov] || PROVIDER_META.ollama;

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    try {
      const resp = await api.composeSave({
        url: composeUrl,
        model: result.model,
        provider: prov,
        result: r as unknown as Record<string, unknown>,
        original_images: originalImages,
        source_title: sourceTitle,
        source_author: sourceAuthor,
        source_sitename: sourceSitename,
      });
      setSaveState('saved');
      setSavedArticleId(resp.article_id);
      toast.success(resp.message);
    } catch (err: any) {
      setSaveState('idle');
      toast.error(err.message || 'Failed to save');
    }
  }, [composeUrl, result.model, prov, r, originalImages, sourceTitle, sourceAuthor, sourceSitename]);

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-low">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${meta.color}`}>{meta.icon}</span>
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">{result.model}</h4>
        </div>
        <div className="flex gap-1">
          {(['preview', 'body'] as const).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                viewMode === m ? 'bg-surface-container-low text-primary' : 'text-outline hover:text-on-surface-variant'
              }`}
            >
              {m === 'preview' ? 'Overview' : 'Full Article'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[70vh]">
        {viewMode === 'preview' ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <p className="text-[10px] text-outline uppercase tracking-wider mb-1">Title</p>
              <h3 className="text-base font-semibold text-on-surface leading-snug">{r.title}</h3>
            </div>

            {/* Summary */}
            <div>
              <p className="text-[10px] text-outline uppercase tracking-wider mb-1">Summary</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">{r.summary}</p>
            </div>

            {/* Perspective */}
            <div>
              <p className="text-[10px] text-outline uppercase tracking-wider mb-1">Perspective</p>
              <p className="text-sm text-on-surface-variant italic leading-relaxed">{r.perspective}</p>
            </div>

            {/* Tags */}
            <div>
              <p className="text-[10px] text-outline uppercase tracking-wider mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {r.tags?.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] text-on-surface-variant">{tag}</span>
                ))}
              </div>
            </div>

            {/* Reading time + Save */}
            <div className="flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-outline-variant/15">
              <span>📖 {r.reading_time_minutes} min read</span>
              {saveState === 'saved' ? (
                <button
                  onClick={() => savedArticleId && navigate(`/article/${savedArticleId}`)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-medium flex items-center gap-1.5 hover:bg-emerald-100 transition-all border border-emerald-200"
                >
                  ✓ Saved — View Article
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="px-3 py-1.5 rounded-lg bg-primary-container text-white text-[11px] font-medium flex items-center gap-1.5 hover:bg-primary disabled:opacity-50 transition-all shadow-sm"
                >
                  {saveState === 'saving' ? (
                    <><span className="animate-spin text-[10px]">⏳</span> Saving...</>
                  ) : (
                    <><span>💾</span> Save to Draft</>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          // Full body (rendered markdown)
          <div
            className="prose prose-sm max-w-none
              prose-headings:text-on-surface prose-p:text-on-surface-variant
              prose-strong:text-on-surface prose-a:text-primary
              prose-blockquote:border-primary/30 prose-blockquote:text-on-surface-variant
              prose-li:text-on-surface-variant"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(r.body) }}
          />
        )}
      </div>
    </div>
  );
}


/** Simple markdown → HTML (no deps) */
function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    // Images (strip placeholder)
    .replace(/!\[([^\]]*)\]\([^)]*PLACEHOLDER[^)]*\)/g, '<p class="text-outline italic text-xs">[Image: $1]</p>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  // Wrap in paragraph tags
  html = `<p>${html}</p>`;
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '').replace(/<p><br\/><\/p>/g, '');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(?:\s*<br\/>)?)+/g, (match) => `<ul>${match.replace(/<br\/>/g, '')}</ul>`);

  return html;
}
