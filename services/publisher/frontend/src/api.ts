/**
 * API client for the publisher backend.
 */

const BASE = '/api';

export interface ArticleListItem {
  id: string;
  title: string | null;
  summary: string | null;
  category: string | null;
  source_outlet: string | null;
  output_language: string;
  status: string;
  created_at: string;
  selected_image: any;
  searched_images: any;
  original_images: any;
  slug: string | null;
  reading_time_minutes: number | null;
  rewrite_model: string | null;
}

export interface Article {
  id: string;
  raw_article_id: string;
  title: string | null;
  body: string | null;
  summary: string | null;
  perspective: string | null;
  reading_time_minutes: number | null;
  category: string | null;
  tags: string[] | null;
  image_keywords: string[] | null;
  original_images: any[] | null;
  searched_images: any[] | null;
  source_url: string | null;
  source_outlet: string | null;
  source_author: string | null;
  source_published_at: string | null;
  rewrite_model: string | null;
  output_language: string;
  selected_image: any;
  slug: string | null;
  notion_page_id: string | null;
  published_to_notion_at: string | null;
  status: string;
  created_at: string;
}

export interface ArticleUpdate {
  title?: string;
  body?: string;
  summary?: string;
  perspective?: string;
  tags?: string[];
  category?: string;
  selected_image?: any;
  slug?: string;
  source_author?: string;
  searched_images?: any[];
  status?: string;
}

export interface Stats {
  draft: number;
  approved: number;
  published: number;
  rejected: number;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  // Get Supabase session token for backend auth
  const { supabase } = await import('./lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  listArticles: (status?: string, limit = 50, offset = 0, source?: 'composer' | 'pipeline') => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return request<ArticleListItem[]>(`/articles?${params}`);
  },

  getArticle: (id: string) => request<Article>(`/articles/${id}`),

  updateArticle: (id: string, data: ArticleUpdate) =>
    request<Article>(`/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  approveArticle: (id: string) =>
    request<Article>(`/articles/${id}/approve`, { method: 'POST' }),

  rejectArticle: (id: string) =>
    request<Article>(`/articles/${id}/reject`, { method: 'POST' }),

  publishArticle: (id: string) =>
    request<Article>(`/articles/${id}/publish`, { method: 'POST' }),

  deleteArticle: (id: string) =>
    request<{ status: string; id: string }>(`/articles/${id}`, { method: 'DELETE' }),

  batchArticles: (ids: string[], action: 'approve' | 'reject' | 'delete') =>
    request<{ success: number; failed: number; errors: string[] }>('/articles/batch', {
      method: 'POST',
      body: JSON.stringify({ ids, action }),
    }),

  getStats: () => request<Stats>('/stats'),

  getFinOps: () => request<any>('/finops'),

  searchImages: (articleId: string, query?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    return request<any[]>(`/articles/${articleId}/search-images?${params}`, {
      method: 'POST',
    });
  },

  // ── Pipeline ──────────────────────────────────────────────────

  getPipelineSources: () => request<Record<string, any[]>>('/pipeline/sources'),

  updatePipelineSources: (sources: Record<string, any[]>) =>
    request<{ status: string }>('/pipeline/sources', {
      method: 'PUT',
      body: JSON.stringify(sources),
    }),

  toggleSource: (category: string, sourceName: string) =>
    request<{ status: string; enabled: boolean }>(`/pipeline/sources/${encodeURIComponent(category)}/${encodeURIComponent(sourceName)}/toggle`, {
      method: 'PATCH',
    }),

  addSource: (category: string, source: any) =>
    request<{ status: string }>(`/pipeline/sources/${encodeURIComponent(category)}`, {
      method: 'POST',
      body: JSON.stringify(source),
    }),

  deleteSource: (category: string, sourceName: string) =>
    request<{ status: string }>(`/pipeline/sources/${encodeURIComponent(category)}/${encodeURIComponent(sourceName)}`, {
      method: 'DELETE',
    }),

  updateSource: (category: string, sourceName: string, updates: Record<string, any>) =>
    request<{ status: string }>(`/pipeline/sources/${encodeURIComponent(category)}/${encodeURIComponent(sourceName)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  detectSourcePatterns: (url: string) =>
    request<{ article_url_pattern: string; article_selector: string; sample_urls: string[]; link_count?: number; message: string }>('/pipeline/sources/detect', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  getPipelineConfig: () => request<PipelineConfig>('/pipeline/config'),

  updatePipelineConfig: (config: PipelineConfig) =>
    request<{ status: string }>('/pipeline/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  runPipeline: (task: string, source_tags?: string[]) =>
    request<{ status: string; task_ids: string[]; message: string }>('/pipeline/run', {
      method: 'POST',
      body: JSON.stringify({ task, source_tags: source_tags?.length ? source_tags : undefined }),
    }),

  getTaskStatus: (taskId: string) =>
    request<{ task_id: string; status: string; result?: any }>(`/pipeline/task/${taskId}`),

  getPipelineStatus: () =>
    request<{
      raw_articles: Record<string, number>;
      articles: Record<string, number>;
      recent: { id: string; title: string; status: string; source: string; created_at: string }[];
      total_raw: number;
      total_articles: number;
    }>('/pipeline/status'),

  restartWorker: () =>
    request<{ status: string; message: string }>('/pipeline/worker/restart', { method: 'POST' }),

  getWorkerStatus: () =>
    request<{
      alive: boolean;
      workers: {
        name: string; status: string; active_tasks: number;
        total_processed: number; pool: string; concurrency: number;
        pid: number | null; queues: string[];
      }[];
      system: { cpu_percent: number; memory_percent: number; memory_used_gb: number; memory_total_gb: number };
    }>('/pipeline/worker/status'),

  spawnWorker: (queues?: string[], name?: string) =>
    request<{ status: string; name: string; queues: string; pid: number; log_file: string; message: string }>('/pipeline/worker/spawn', {
      method: 'POST',
      body: JSON.stringify({ queues, name }),
    }),

  stopWorker: (workerName: string) =>
    request<{ status: string; name: string; message: string }>(`/pipeline/worker/stop/${encodeURIComponent(workerName)}`, {
      method: 'POST',
    }),

  getWorkerProcesses: () =>
    request<{
      processes: {
        name: string; pid: number | null; stage: string;
        queues: string; uptime_seconds: number; log_file: string;
      }[];
    }>('/pipeline/worker/processes'),

  getWorkerLogs: (workerName: string, lines = 100) =>
    request<{
      worker_name: string; stage: string; pid: number | null;
      total_lines: number; lines: string[];
    }>(`/pipeline/worker/logs/${encodeURIComponent(workerName)}?lines=${lines}`),

  checkRedis: () =>
    request<{ ok: boolean; message: string; redis_url: string }>('/pipeline/worker/redis-check'),

  getPipelineActivity: () =>
    request<{ ts: string; step: string; detail: string; status: string }[]>('/pipeline/activity'),

  getQueueStatus: () =>
    request<{
      queues: Record<string, number>;
      stuck: Record<string, number>;
      active_tasks: { id: string; name: string; args: string; started: number | null; worker: string }[];
      total_queued: number;
    }>('/pipeline/queue/status'),

  retryStuck: (target: string = 'all') =>
    request<{ status: string; enqueued: Record<string, number>; total: number }>('/pipeline/queue/retry-stuck', {
      method: 'POST', body: JSON.stringify({ target }),
      headers: { 'Content-Type': 'application/json' },
    }),

  purgeQueues: (queue_name: string = 'all') =>
    request<{ status: string; purged: Record<string, number>; total: number }>('/pipeline/queue/purge', {
      method: 'POST', body: JSON.stringify({ queue_name }),
      headers: { 'Content-Type': 'application/json' },
    }),

  cancelAll: () =>
    request<{ status: string; message: string }>('/pipeline/queue/cancel-all', { method: 'POST' }),

  resumePipeline: () =>
    request<{ status: string; message: string }>('/pipeline/queue/resume', { method: 'POST' }),

  isPipelineStopped: () =>
    request<{ stopped: boolean }>('/pipeline/queue/is-stopped'),

  flushPipeline: () =>
    request<{ status: string; message: string; raw_articles_removed: number; articles_removed: number }>(
      '/pipeline/flush', { method: 'POST' }
    ),

  getOllamaStatus: () =>
    request<{
      provider: string;
      configured_model: string;
      think_enabled: boolean;
      num_ctx: number;
      server_online: boolean;
      loaded_models: { name: string; size_gb: number; vram_gb: number; processor: string; expires: string }[];
      available_models: { name: string; size_gb: number }[];
      note?: string;
    }>('/pipeline/ollama/status'),

  preloadOllama: () =>
    request<{ status: string; model?: string; message?: string }>('/pipeline/ollama/preload', { method: 'POST' }),

  offloadOllama: () =>
    request<{ status: string; model?: string; message?: string }>('/pipeline/ollama/offload', { method: 'POST' }),

  getSourceTags: () =>
    request<{
      tags: string[];
      tags_map: Record<string, string[]>;
      sources: { name: string; type: string; tags: string[]; enabled: boolean }[];
    }>('/pipeline/sources/tags'),

  // Scheduler
  getSchedulerStatus: () =>
    request<SchedulerStatus>('/pipeline/scheduler/status'),

  startScheduler: () =>
    request<{ status: string; message: string }>('/pipeline/scheduler/start', { method: 'POST' }),

  stopScheduler: () =>
    request<{ status: string; message: string }>('/pipeline/scheduler/stop', { method: 'POST' }),

  schedulerRunNow: () =>
    request<{ status: string; task_ids: string[]; task: string; message: string }>('/pipeline/scheduler/run-now', { method: 'POST' }),

  ensureSchedulerStarted: () =>
    request<{ status: string }>('/pipeline/scheduler/ensure-started'),

  // Composer
  scrapeOnly: (url: string) =>
    request<ComposeResponse>('/pipeline/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, models: [] }),
    }),

  composeArticle: (url: string, models: string[], language?: string) =>
    request<ComposeResponse>('/pipeline/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, models, language: language || 'Vietnamese' }),
    }),

  composeRetry: (url: string, models: string[], language?: string) =>
    request<ComposeResponse>('/pipeline/compose/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, models, language: language || 'Vietnamese' }),
    }),

  getComposeModels: () =>
    request<{ models: ComposeModel[]; error?: string }>('/pipeline/compose/models'),

  composeSave: (data: {
    url: string;
    model: string;
    provider: string;
    result: Record<string, unknown>;
    original_images: string[];
    source_title: string;
    source_author: string;
    source_sitename: string;
  }) =>
    request<{ article_id: string; status: string; message: string }>('/pipeline/compose/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // ── Backup ──
  listBackups: () =>
    request<{
      backups: { filename: string; size_mb: number; created_at: string }[];
      backup_dir: string;
      total: number;
    }>('/backup/list'),

  exportBackup: () =>
    request<{ status: string; filename: string; size_mb: number; stats: { raw_articles: number; articles: number }; drive?: { action?: string; error?: string } | null }>('/backup/export', { method: 'POST' }),

  importBackup: async (file: File) => {
    const { supabase } = await import('./lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/backup/import`, { method: 'POST', body: formData, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ status: string; imported: { raw_articles: number; articles: number; skipped: number } }>;
  },

  deleteBackup: (filename: string) =>
    request<{ status: string; filename: string }>(`/backup/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' }),

  getBackupConfig: () =>
    request<{ enabled: boolean; interval_hours: number; max_backups: number; last_backup: string | null; next_backup: string | null }>('/backup/config'),

  updateBackupConfig: (enabled: boolean, interval_hours: number, max_backups: number) =>
    request<{ status: string; enabled: boolean; interval_hours: number; max_backups: number }>(`/backup/config?enabled=${enabled}&interval_hours=${interval_hours}&max_backups=${max_backups}`, { method: 'POST' }),

  runScheduledBackup: () =>
    request<{ status: string; reason?: string; filename?: string }>('/backup/run-scheduled', { method: 'POST' }),

  // ── Google Drive ──
  getDriveConfig: () =>
    request<{ enabled: boolean; folder_id: string; upload_after_backup: boolean; sa_email: string | null; key_file_found: boolean }>('/backup/drive/config'),

  updateDriveConfig: (enabled: boolean, folder_id: string) =>
    request<{ status: string; enabled: boolean; folder_id: string }>(`/backup/drive/config?enabled=${enabled}&folder_id=${encodeURIComponent(folder_id)}&upload_after_backup=true`, { method: 'POST' }),

  testDriveConnection: () =>
    request<{ status: string; folder_name?: string; sa_email?: string; error?: string }>('/backup/drive/test', { method: 'POST' }),

  listDriveFiles: () =>
    request<{ files: { file_id: string; name: string; size_mb: number; modified_at: string; version: string; web_link: string }[]; total: number; error?: string }>('/backup/drive/files'),

  uploadToDrive: (filename: string) =>
    request<{ file_id: string; name: string; action: string; version: string; web_link: string }>(`/backup/drive/upload/${encodeURIComponent(filename)}`, { method: 'POST' }),

  getDriveRevisions: (fileId: string) =>
    request<{ revisions: { revision_id: string; modified_at: string; size_mb: number }[]; total: number }>(`/backup/drive/revisions/${encodeURIComponent(fileId)}`),

  restoreFromDrive: (fileId: string) =>
    request<{ status: string; file_id: string; filename: string; imported: { raw_articles: number; articles: number; skipped: number } }>(`/backup/drive/restore/${encodeURIComponent(fileId)}`, { method: 'POST' }),

  startDriveAuth: () =>
    request<{ auth_url?: string; error?: string }>('/backup/drive/auth/start'),

  // ── YouTube Config ──
  getYoutubeChannels: () =>
    request<{ id: string; url: string; name: string; avatarUrl: string }[]>('/youtube/'),

  addYoutubeChannel: (url: string) =>
    request<{ id: string; url: string; name: string; avatarUrl: string }>('/youtube/', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  deleteYoutubeChannel: (id: string) =>
    request<{ status: string }>(`/youtube/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export interface PipelineConfig {
  llm_provider: string;
  gemini_model: string;
  anthropic_model: string;
  ollama_base_url: string;
  ollama_model: string;
  ollama_num_ctx: number;
  ollama_think: boolean;
  llm_temperature: number;
  output_language: string;
  output_language_name: string;
  discovery_interval_minutes: number;
  max_articles_per_run: number;
  scraper_delay_seconds: number;
  enable_dalle_fallback: boolean;
  max_articles_per_source: number;
  randomize_sources: boolean;
  // Auto-Approval
  auto_approve: boolean;
  auto_approve_select_image: boolean;
  // Scheduler
  scheduler_enabled: boolean;
  scheduler_mode: string;
  scheduler_time_of_day: string;
  scheduler_interval_minutes: number;
  scheduler_task: string;
  scheduler_quiet_hours_start: number;
  scheduler_quiet_hours_end: number;
}

export interface SchedulerStatus {
  enabled: boolean;
  mode: string;
  time_of_day: string;
  interval_minutes: number;
  task: string;
  quiet_hours: { start: number; end: number };
  running: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  total_runs: number;
  last_error: string | null;
  is_quiet_hours: boolean;
}

// ── Composer types ──────────────────────────────────────────────

export interface ComposeResult {
  model: string;
  provider?: string;
  status: 'success' | 'error';
  duration_sec: number;
  tokens_generated?: number;
  tokens_per_sec?: number;
  result?: {
    title: string;
    body: string;
    summary: string;
    perspective: string;
    tags: string[];
    reading_time_minutes: number;
    image_keywords?: string[];
  };
  error?: string;
}

export interface ComposeResponse {
  url: string;
  scraped: {
    title: string;
    word_count: number;
    body_preview: string;
    original_images?: string[];
    author?: string;
    sitename?: string;
  };
  results: ComposeResult[];
}

export interface ComposeModel {
  name: string;
  provider: string;
  size_gb: number;
  family: string;
  parameter_size: string;
}
