import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MDEditor from '@uiw/react-md-editor';
import toast from 'react-hot-toast';
import { api, Article, ArticleUpdate } from '../api';
import { generateSlug } from '../utils/slug';
import ImagePicker from './ImagePicker';
import TagEditor from './TagEditor';
import StatusBadge from './StatusBadge';
import ModelBadge from './ModelBadge';

interface EditorActions {
  saveStatus: 'idle' | 'saving' | 'saved';
  canReject: boolean;
  canApprove: boolean;
  canPublish: boolean;
  isPublished: boolean;
  onSave: () => void;
  onReject: () => void;
  onApprove: () => void;
  onPublish: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isPublishing: boolean;
}

interface EditorPanelProps {
  article: Article;
  onActionsReady?: (actions: EditorActions) => void;
}

type Tab = 'edit' | 'preview' | 'source';

export default function EditorPanel({ article: initialArticle, onActionsReady }: EditorPanelProps) {
  const queryClient = useQueryClient();
  const [article, setArticle] = useState(initialArticle);
  const [tab, setTab] = useState<Tab>('edit');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hasManualSlug = useRef(!!initialArticle.slug);

  // Sync when switching articles
  useEffect(() => {
    setArticle(initialArticle);
    hasManualSlug.current = !!initialArticle.slug;
    setTab('edit');
    setSaveStatus('idle');
    setShowRejectConfirm(false);
    setSearchQuery('');

    // Auto-generate slug if absent
    if (!initialArticle.slug && initialArticle.title) {
      const slug = generateSlug(initialArticle.title);
      setArticle((prev) => ({ ...prev, slug }));
      saveMutation.mutate({ slug });
    }

    // Auto-set author if needed
    const brand = 'Tổng hợp bởi RetroLab';
    const ogAuthor = initialArticle.source_author;
    let targetAuthor = '';

    if (ogAuthor) {
      if (!ogAuthor.includes(brand)) {
        targetAuthor = `${ogAuthor} | ${brand}`;
      } else {
        targetAuthor = ogAuthor;
      }
    } else {
      targetAuthor = brand;
    }

    if (initialArticle.source_author !== targetAuthor) {
      setArticle((prev) => ({ ...prev, source_author: targetAuthor }));
      saveMutation.mutate({ source_author: targetAuthor });
    }
  }, [initialArticle.id]);

  // Auto-save PATCH
  const saveMutation = useMutation({
    mutationFn: (data: ArticleUpdate) => api.updateArticle(article.id, data),
    onSuccess: (updated) => {
      setArticle(updated);
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('idle');
      toast.error('Failed to save');
    },
  });

  const debouncedSave = useCallback(
    (data: ArticleUpdate) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus('saving');
      saveTimerRef.current = setTimeout(() => {
        saveMutation.mutate(data);
      }, 800);
    },
    [saveMutation],
  );

  const updateField = useCallback(
    <K extends keyof ArticleUpdate>(field: K, value: ArticleUpdate[K]) => {
      setArticle((prev) => {
        const updated = { ...prev, [field]: value };

        // Auto-gen slug from title on first load only
        if (field === 'title' && !hasManualSlug.current && typeof value === 'string') {
          const slug = generateSlug(value);
          updated.slug = slug;
          debouncedSave({ [field]: value, slug });
        } else if (field === 'body' && typeof value === 'string') {
          // Auto-calculate reading time (~200 words/min for Vietnamese)
          const wordCount = value.trim().split(/\s+/).length;
          const readTime = Math.max(1, Math.ceil(wordCount / 200));
          updated.reading_time_minutes = readTime;
          debouncedSave({ [field]: value });
        } else {
          if (field === 'slug') hasManualSlug.current = true;
          debouncedSave({ [field]: value });
        }

        return updated as Article;
      });
    },
    [debouncedSave],
  );

  // Search more images
  const handleSearchImages = async (query?: string) => {
    setIsSearching(true);
    try {
      const newImages = await api.searchImages(article.id, query || undefined);
      // Refresh article data
      const updated = await api.getArticle(article.id);
      setArticle(updated);
      queryClient.invalidateQueries({ queryKey: ['article', article.id] });
      toast.success(`Found ${newImages.length} new images`);
    } catch (err) {
      toast.error('Image search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Insert image into body at cursor position
  const insertImageIntoBody = (imageUrl: string, alt: string = '') => {
    const markdown = `\n\n![${alt}](${imageUrl})\n\n`;
    const textarea = editorContainerRef.current?.querySelector('textarea');

    if (textarea) {
      textarea.focus();
      // Use execCommand to preserve undo/redo history and handle cursor position correctly
      const success = document.execCommand('insertText', false, markdown);
      
      if (!success) {
        // Fallback for edge cases
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        const newVal = val.substring(0, start) + markdown + val.substring(end);
        updateField('body', newVal);
      }
      toast.success('Image inserted at cursor');
    } else {
      // Last resort fallback — append to end
      const newBody = (article.body || '') + markdown;
      updateField('body', newBody);
      toast.success('Image appended to body');
    }
  };

  // Approve
  const approveMutation = useMutation({
    mutationFn: () => api.approveArticle(article.id),
    onSuccess: (updated) => {
      setArticle(updated);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Article approved ✓');
    },
    onError: (err) => toast.error((err as Error).message),
  });

  // Reject
  const rejectMutation = useMutation({
    mutationFn: () => api.rejectArticle(article.id),
    onSuccess: (updated) => {
      setArticle(updated);
      setShowRejectConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast('Article rejected', { icon: '🗑️' });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  // Publish
  const publishMutation = useMutation({
    mutationFn: () => api.publishArticle(article.id),
    onSuccess: (updated) => {
      setArticle(updated);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Published to Notion! 🎉');
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const canApprove = !!(article.slug && article.selected_image);
  const isEditable = ['draft', 'image_pending'].includes(article.status);

  // Expose actions to parent for header buttons
  useEffect(() => {
    onActionsReady?.({
      saveStatus,
      canReject: isEditable,
      canApprove: isEditable && canApprove,
      canPublish: article.status === 'approved',
      isPublished: article.status === 'published',
      onSave: () => saveMutation.mutate({}),
      onReject: () => rejectMutation.mutate(),
      onApprove: () => approveMutation.mutate(),
      onPublish: () => publishMutation.mutate(),
      isApproving: approveMutation.isPending,
      isRejecting: rejectMutation.isPending,
      isPublishing: publishMutation.isPending,
    });
  }, [saveStatus, article.status, article.slug, article.selected_image, canApprove, isEditable, approveMutation.isPending, rejectMutation.isPending, publishMutation.isPending]);

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
        <div className="flex items-center gap-3">
          <StatusBadge status={article.status} />
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold uppercase tracking-wider">
            {article.output_language?.toUpperCase() || 'VI'}
          </span>
          {article.rewrite_model && <ModelBadge model={article.rewrite_model} />}
          {saveStatus === 'saving' && (
            <span className="text-xs text-amber-400 animate-pulse">Saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600">Saved ✓</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {article.status === 'published' && (
            <span className="text-xs text-emerald-600 font-medium">
              ✅ Published to Notion
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex border-b border-outline-variant/15 px-6">
        {(['edit', 'preview', 'source'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-medium capitalize transition-all border-b-2 ${
              tab === t
                ? 'text-accent-400 border-accent-500'
                : 'text-outline border-transparent hover:text-on-surface-variant'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'edit' && (
          <div className="flex gap-6 p-6">
            {/* Left col — main fields */}
            <div className="flex-1 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  value={article.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  spellCheck={false}
                  lang="vi"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/15 text-on-surface text-sm focus:border-accent-500/50 focus:outline-none transition-colors"
                  placeholder="Article title"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Slug
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={article.slug || ''}
                    onChange={(e) => updateField('slug', e.target.value)}
                    spellCheck={false}
                    lang="vi"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/15 text-on-surface text-sm focus:border-accent-500/50 focus:outline-none transition-colors font-mono"
                    placeholder="url-friendly-slug"
                  />
                  <button
                    onClick={() => {
                      if (article.title) {
                        const slug = generateSlug(article.title);
                        hasManualSlug.current = false;
                        updateField('slug', slug);
                      }
                    }}
                    className="px-2 py-1.5 text-[10px] rounded-lg bg-surface-container-high border border-outline-variant/15 text-on-surface-variant hover:bg-surface-container-high transition-colors whitespace-nowrap"
                    title="Re-generate slug from title"
                  >
                    🔄
                  </button>
                </div>
                {article.slug && (
                  <p className="text-[10px] text-outline mt-0.5">
                    yoursite.com/{article.category?.toLowerCase().replace(/\s+/g, '-') || 'tech'}/{article.slug}
                  </p>
                )}
              </div>

              {/* Excerpt / Summary */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Excerpt
                </label>
                <textarea
                  value={article.summary || ''}
                  onChange={(e) => updateField('summary', e.target.value)}
                  spellCheck={false}
                  lang="vi"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/15 text-on-surface text-sm focus:border-accent-500/50 focus:outline-none transition-colors resize-none"
                  placeholder="Short summary / excerpt"
                />
              </div>

              {/* Body MDEditor */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Body
                </label>
                <div data-color-mode="dark" ref={editorContainerRef}>
                  <MDEditor
                    value={article.body || ''}
                    onChange={(val) => updateField('body', val || '')}
                    height={500}
                    textareaProps={{ 
                      spellCheck: false, 
                      lang: 'vi' 
                    }}
                    previewOptions={{
                      style: {
                        fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
                      },
                    }}
                  />
                </div>
              </div>

              {/* Tags */}
              <TagEditor
                tags={article.tags || []}
                onChange={(tags) => updateField('tags', tags)}
              />

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Category
                </label>
                <input
                  type="text"
                  value={article.category || ''}
                  onChange={(e) => updateField('category', e.target.value)}
                  spellCheck={false}
                  lang="vi"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/15 text-on-surface text-sm focus:border-accent-500/50 focus:outline-none transition-colors"
                  placeholder="Category"
                />
              </div>
            </div>

            {/* Right col — sidebar */}
            <div className="w-[240px] space-y-5 flex-shrink-0">
              {/* Source card */}
              <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3 space-y-2">
                <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Source
                </h4>
                {article.source_outlet && (
                  <p className="text-xs text-on-surface-variant">{article.source_outlet}</p>
                )}
                {article.source_published_at && (
                  <p className="text-[10px] text-outline">
                    {new Date(article.source_published_at).toLocaleDateString('vi-VN')}
                  </p>
                )}
                {article.source_url && (
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent-400 hover:underline break-all block"
                  >
                    View original ↗
                  </a>
                )}
                {article.reading_time_minutes && (
                  <p className="flex items-center gap-1 text-[10px] text-outline">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {article.reading_time_minutes} min read
                  </p>
                )}
                {article.rewrite_model && (
                  <div className="pt-1 border-t border-outline-variant/10">
                    <ModelBadge model={article.rewrite_model} />
                  </div>
                )}
              </div>

              {/* Author */}
              <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3 space-y-2">
                <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  ✍️ Author
                </h4>
                <input
                  type="text"
                  value={article.source_author || ''}
                  onChange={(e) => updateField('source_author', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/15 text-on-surface text-xs focus:border-accent-500/50 focus:outline-none transition-colors"
                  placeholder="Tổng hợp bởi RetroLab"
                />
              </div>

              {/* Image picker */}
              <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3">
                <ImagePicker
                  originalImages={article.original_images}
                  searchedImages={article.searched_images}
                  selectedImage={article.selected_image}
                  onChange={(img) => updateField('selected_image', img)}
                  onInsertInBody={insertImageIntoBody}
                />

                {/* Search more images */}
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search query..."
                      className="flex-1 px-2 py-1 rounded-lg bg-surface-container-low border border-outline-variant/15 text-on-surface text-[10px] focus:border-accent-500/50 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchImages(searchQuery);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleSearchImages(searchQuery || undefined)}
                    disabled={isSearching}
                    className="w-full px-2 py-1.5 text-[10px] font-medium rounded-lg bg-surface-container-low0/10 text-blue-400 border border-blue-500/30 hover:bg-surface-container-low0/20 transition-all disabled:opacity-50"
                  >
                    {isSearching ? '🔍 Searching…' : '🔍 Search More Images'}
                  </button>
                </div>
              </div>

              {/* Perspective */}
              {article.perspective && (
                <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    💡 Perspective
                  </h4>
                  <textarea
                    value={article.perspective || ''}
                    onChange={(e) => updateField('perspective', e.target.value)}
                    rows={3}
                    lang="vi"
                    className="w-full text-xs text-on-surface-variant italic bg-transparent border-none focus:outline-none resize-none leading-relaxed"
                    placeholder="Editorial perspective..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'preview' && (
          <div className="p-10 max-w-4xl mx-auto bg-surface-container-low min-h-full shadow-2xl">
            <h1 className="text-4xl font-bold text-on-surface mb-8 leading-tight" style={{ fontFamily: '"Be Vietnam Pro", system-ui, sans-serif' }}>
              {article.title}
            </h1>
            <div
              className="prose prose-lg  max-w-none"
              style={{ fontFamily: '"Be Vietnam Pro", system-ui, sans-serif' }}
              dangerouslySetInnerHTML={{
                __html: renderMarkdownPreview(article.body || ''),
              }}
            />
          </div>
        )}

        {tab === 'source' && (
          <div className="p-6">
            <pre className="text-xs text-on-surface-variant bg-surface-container-low rounded-xl p-4 overflow-auto max-h-[70vh] whitespace-pre-wrap font-mono border border-outline-variant/15">
              {article.body || '(empty)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple Markdown → HTML for preview tab.
 * We use a basic regex-based approach for the preview.
 */
function renderMarkdownPreview(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<div class="relative group my-6"><pre class="rounded-xl overflow-hidden shadow-xl"><code class="language-$1 block p-4 bg-surface-container/80 text-xs">$2</code></pre></div>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-on-surface mt-10 mb-4">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-on-surface mt-12 mb-6 border-b border-outline-variant/15 pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-on-surface mt-14 mb-8">$1</h1>')
    
    // Callouts: > [!TYPE] Message
    .replace(/^>\s+\[!(INFO|TIP|WARNING|IMPORTANT|CAUTION|NOTE)\]\s*(.*)$/gmi, (match, type, content) => {
      const t = type.toUpperCase();
      let icon = "💡";
      let color = "border-accent-500 bg-accent-500/5 text-accent-200";
      if (t === "WARNING" || t === "CAUTION") {
          icon = "⚠️";
          color = "border-amber-500 bg-amber-500/5 text-amber-200";
      } else if (t === "TIP") {
          icon = "🚀";
          color = "border-emerald-500 bg-emerald-500/5 text-emerald-200";
      } else if (t === "IMPORTANT") {
          icon = "⭐️";
          color = "border-purple-500 bg-purple-500/5 text-purple-200";
      }
      return `<div class="my-6 p-4 rounded-xl border-l-4 ${color} flex items-start gap-3">
                <span class="text-xl flex-shrink-0">${icon}</span>
                <div class="italic">${content}</div>
              </div>`;
    })

    // Tables
    .replace(/^\|(.+)\|$\n^\|[:\-\s|]+\|$\n((?:^\|.+\|$\n?)+)/gm, (match, header: string, rows: string) => {
      const hCells = header.split('|').filter(c => c.trim()).map((c: string) => `<th class="px-4 py-2 border border-outline-variant/15 bg-surface-container text-left font-bold">${c.trim()}</th>`).join('');
      const bodyRows = rows.trim().split('\n').map((row: string) => {
          const cells = row.split('|').filter(c => c.trim()).map((c: string) => `<td class="px-4 py-2 border border-outline-variant/15">${c.trim()}</td>`).join('');
          return `<tr class="border-b border-outline-variant/15">${cells}</tr>`;
      }).join('');
      return `<div class="my-8 overflow-x-auto shadow-2xl rounded-xl border border-outline-variant/15"><table class="w-full text-sm border-collapse font-sans text-on-surface"><thead><tr>${hCells}</tr></thead><tbody class="bg-surface-container/20">${bodyRows}</tbody></table></div>`;
    })

    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-container text-accent-400 font-mono text-[0.8em] font-normal">$1</code>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="my-10"><img src="$2" alt="$1" class="rounded-2xl w-full shadow-2xl border border-outline-variant/15" /><p class="text-center text-xs text-outline mt-3 italic">$1</p></div>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-accent-400 hover:text-accent-300 underline decoration-accent-500/30 underline-offset-4 transition-colors font-medium">$1</a>')
    
    // Standard Blockquotes (non-callout)
    .replace(/^> (?!\[!)(.+)$/gm, '<blockquote class="border-l-4 border-outline-variant/15 pl-4 py-2 my-6 italic text-on-surface-variant bg-surface-container/20 rounded-r-lg">$1</blockquote>')
    
    // Lists
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap loose <li> in <ul>
  html = html.replace(/(<li>.*<\/li>)/gms, '<ul class="list-disc list-inside my-6 space-y-2 text-on-surface-variant">$1</ul>');
  
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="border-outline-variant/15 my-10" />')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="my-5 leading-8 text-on-surface">')
    // Line breaks
    .replace(/\n/g, '<br />');

  return `<p class="leading-8 text-on-surface">${html}</p>`;
}
