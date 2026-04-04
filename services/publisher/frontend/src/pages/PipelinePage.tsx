import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, PipelineConfig, SchedulerStatus } from '../api';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';

type PipelineTab = 'run' | 'sources' | 'config';

export default function PipelinePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PipelineTab>('run');

  // Persist running task IDs in localStorage so they survive page refreshes
  const [runningTasks, setRunningTasks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pipeline_running_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [taskStatuses, setTaskStatuses] = useState<Record<string, { status: string; result?: any }>>({});

  // Sync to localStorage whenever runningTasks changes
  useEffect(() => {
    localStorage.setItem('pipeline_running_tasks', JSON.stringify(runningTasks));
  }, [runningTasks]);

  // ── Data queries ──────────────────────────────────────────────
  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['pipeline-sources'],
    queryFn: api.getPipelineSources,
  });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['pipeline-config'],
    queryFn: api.getPipelineConfig,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  });

  // ── Poll running tasks ──────────────────────────────────────────
  useEffect(() => {
    if (runningTasks.length === 0) return;
    // Poll immediately on mount, then every 2s
    const poll = async () => {
      const newStatuses: Record<string, any> = {};
      let allDone = true;
      for (const taskId of runningTasks) {
        try {
          const status = await api.getTaskStatus(taskId);
          newStatuses[taskId] = status;
          if (status.status !== 'SUCCESS' && status.status !== 'FAILURE') {
            allDone = false;
          }
        } catch {
          newStatuses[taskId] = { status: 'UNKNOWN' };
        }
      }
      setTaskStatuses(newStatuses);
      if (allDone) {
        setRunningTasks([]);
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
      }
    };
    poll(); // immediate first poll
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [runningTasks, queryClient]);

  // ── Mutations ─────────────────────────────────────────────────
  const runMutation = useMutation({
    mutationFn: ({ task, source_tags }: { task: string; source_tags?: string[] }) => api.runPipeline(task, source_tags),
    onSuccess: (data) => {
      toast.success(data.message);
      setRunningTasks(data.task_ids);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ category, name }: { category: string; name: string }) =>
      api.toggleSource(category, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-sources'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ category, name }: { category: string; name: string }) =>
      api.deleteSource(category, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-sources'] });
      toast.success('Source deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const totalSources = sources
    ? Object.values(sources).reduce((sum, arr) => sum + arr.length, 0)
    : 0;
  const enabledSources = sources
    ? Object.values(sources).reduce(
        (sum, arr) => sum + arr.filter((s: any) => s.enabled !== false).length,
        0,
      )
    : 0;

  // ── Top header bar ──
  const headerContent = (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-12">
        <h1 className="text-xl sm:text-2xl font-extrabold font-headline tracking-tight text-on-surface shrink-0">Pipeline</h1>
        <nav className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar w-full">
          {([
            { key: 'run' as PipelineTab, label: 'Run' },
            { key: 'sources' as PipelineTab, label: 'Sources' },
            { key: 'config' as PipelineTab, label: 'Config' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`font-medium pb-1.5 transition-all border-b-2 whitespace-nowrap text-sm sm:text-base ${
                tab === t.key
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4 sm:gap-6 self-start xl:self-auto w-full sm:w-auto mt-2 sm:mt-0 pb-1 sm:pb-0">
        <div className="relative flex items-center flex-1 sm:flex-none">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[20px]">search</span>
          <input
            className="pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/15 rounded-lg text-sm w-full sm:w-56 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/50"
            placeholder="Search pipelines..."
            type="text"
          />
        </div>
        <button className="p-2 text-outline border border-outline-variant/15 hover:bg-surface-container rounded-full transition-colors flex-shrink-0">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </div>
  );

  // ── Secondary sidebar ──
  const PipelineSidebar = (
    <>
      <div className="p-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/15">
            <p className="text-2xl font-bold font-headline text-on-surface">{enabledSources}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Active</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/15">
            <p className="text-2xl font-bold font-headline text-on-surface">{totalSources}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Total</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {([
            { id: 'run' as PipelineTab, icon: 'rocket_launch', label: 'Run Pipeline' },
            { id: 'sources' as PipelineTab, icon: 'rss_feed', label: 'Sources' },
            { id: 'config' as PipelineTab, icon: 'settings', label: 'Configuration' },
          ]).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                tab === item.id
                  ? 'bg-surface-container-lowest text-primary font-semibold border border-outline-variant/15'
                  : 'text-on-surface-variant hover:bg-surface-container-lowest/50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Stats footer */}
      {stats && (
        <div className="mt-auto p-5 border-t border-outline-variant/10">
          <div className="space-y-2">
            {[
              { label: 'Drafts', value: stats.draft, color: 'text-tertiary' },
              { label: 'Published', value: stats.published, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.value || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <AppShell header={headerContent} sidebar={PipelineSidebar}>
      <div className="p-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {tab === 'run' && (
            <RunTab
              runMutation={runMutation}
              runningTasks={runningTasks}
              taskStatuses={taskStatuses}
            />
          )}
          {tab === 'sources' && (
            <SourcesTab
              sources={sources}
              isLoading={sourcesLoading}
              onToggle={(cat, name) => toggleMutation.mutate({ category: cat, name })}
              onDelete={(cat, name) => deleteMutation.mutate({ category: cat, name })}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['pipeline-sources'] })}
            />
          )}
          {tab === 'config' && (
            <ConfigTab config={config} isLoading={configLoading} />
          )}
        </div>
      </div>
    </AppShell>
  );
}


function RunTab({
  runMutation,
  runningTasks,
  taskStatuses,
}: {
  runMutation: any;
  runningTasks: string[];
  taskStatuses: Record<string, any>;
}) {
  const navigate = useNavigate();
  const isRunning = runningTasks.length > 0;

  // Live pipeline status from DB — polls every 5s
  const { data: pipelineStatus } = useQuery({
    queryKey: ['pipeline-status'],
    queryFn: api.getPipelineStatus,
    refetchInterval: 5000,
  });

  // Live activity feed — polls every 3s
  const { data: activity } = useQuery({
    queryKey: ['pipeline-activity'],
    queryFn: api.getPipelineActivity,
    refetchInterval: 3000,
  });

  // Queue status — polls every 3s
  const queryClient = useQueryClient();
  const { data: queueStatus } = useQuery({
    queryKey: ['queue-status'],
    queryFn: api.getQueueStatus,
    refetchInterval: 3000,
  });

  const retryMutation = useMutation({
    mutationFn: (target: string) => api.retryStuck(target),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] });
      toast.success(`Re-enqueued ${data.total} tasks`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const purgeMutation = useMutation({
    mutationFn: (queue: string) => api.purgeQueues(queue),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      toast.success(`Purged ${data.total} tasks`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelAll(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stopped'] });
      queryClient.invalidateQueries({ queryKey: ['ollama-status'] });
      toast.success(data.message || 'Pipeline stopped');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resumePipeline(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stopped'] });
      toast.success(data.message || 'Pipeline resumed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Pipeline stopped status
  const { data: stoppedStatus } = useQuery({
    queryKey: ['pipeline-stopped'],
    queryFn: api.isPipelineStopped,
    refetchInterval: 3000,
  });
  const isStopped = stoppedStatus?.stopped ?? false;

  const flushMutation = useMutation({
    mutationFn: () => api.flushPipeline(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] });
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      toast.success(data.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Ollama status — polls every 5s
  const { data: ollamaStatus } = useQuery({
    queryKey: ['ollama-status'],
    queryFn: api.getOllamaStatus,
    refetchInterval: 5000,
  });

  const preloadMutation = useMutation({
    mutationFn: () => api.preloadOllama(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ollama-status'] });
      if (data.status === 'loaded') toast.success(`Model ${data.model} loaded to GPU`);
      else toast.error(data.message || 'Failed to load model');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const offloadMutation = useMutation({
    mutationFn: () => api.offloadOllama(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ollama-status'] });
      if (data.status === 'offloaded') toast.success(`Model ${data.model} offloaded from GPU`);
      else toast.error(data.message || 'Failed to offload model');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Scheduler status — polls every 5s
  const { data: schedulerStatus } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: api.getSchedulerStatus,
    refetchInterval: 5000,
  });

  const startSchedulerMutation = useMutation({
    mutationFn: () => api.startScheduler(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
      toast.success(data.message || 'Scheduler started');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopSchedulerMutation = useMutation({
    mutationFn: () => api.stopScheduler(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
      toast.success(data.message || 'Scheduler stopped');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const runNowMutation = useMutation({
    mutationFn: () => api.schedulerRunNow(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
      toast.success(data.message || 'Pipeline triggered');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Source tags for category filtering
  const { data: sourceTagsData } = useQuery({
    queryKey: ['source-tags'],
    queryFn: api.getSourceTags,
    staleTime: 60_000,
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const actions = [
    {
      id: 'full_pipeline',
      label: 'Full Pipeline',
      desc: 'Discover feeds + crawl pages, then scrape articles for curation',
      icon: '🚀',
      color: 'from-emerald-500 to-cyan-500',
      shadow: 'shadow-emerald-500/20',
    },
    {
      id: 'discover_feeds',
      label: 'RSS Feeds Only',
      desc: 'Poll all enabled RSS feeds for new articles',
      icon: '📡',
      color: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
    },
    {
      id: 'discover_crawl',
      label: 'Web Crawl Only',
      desc: 'Crawl all enabled crawl-type sources',
      icon: '🌐',
      color: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/20',
    },
  ];

  const rawNew = pipelineStatus?.raw_articles?.new ?? 0;
  const rawScraped = pipelineStatus?.raw_articles?.scraped ?? 0;
  const rawProcessing = pipelineStatus?.raw_articles?.processing ?? 0;
  const rawDone = pipelineStatus?.raw_articles?.done ?? 0;
  const rawFailed = pipelineStatus?.raw_articles?.scrape_failed ?? 0;
  const rawDiscarded = pipelineStatus?.raw_articles?.discarded ?? 0;
  const totalRaw = pipelineStatus?.total_raw ?? 0;
  const artDraft = pipelineStatus?.articles?.draft ?? 0;
  const artApproved = pipelineStatus?.articles?.approved ?? 0;
  const artPublished = pipelineStatus?.articles?.published ?? 0;
  const artRejected = pipelineStatus?.articles?.rejected ?? 0;
  const totalArticles = pipelineStatus?.total_articles ?? 0;

  const hasPendingWork = rawNew > 0 || rawProcessing > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight font-headline text-on-surface">Run Pipeline</h2>
        <p className="text-on-surface-variant mt-2 text-lg">Manually trigger the news discovery and processing pipeline.</p>
      </div>

      {/* ── Curation Banner ──────────────────────────────── */}
      {rawScraped > 0 && (
        <div
          className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-teal-500/50 transition-all group"
          onClick={() => navigate('/curation')}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <p className="text-sm font-bold text-on-surface">
                {rawScraped} article{rawScraped !== 1 ? 's' : ''} awaiting your review
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Scraped articles need curation before LLM rewriting begins
              </p>
            </div>
          </div>
          <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-semibold group-hover:bg-teal-600 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px]">rate_review</span>
            Open Curation
          </span>
        </div>
      )}

      {/* ── Pipeline Status Dashboard ──────────────────────── */}
      {pipelineStatus && (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
              Pipeline Status
              {hasPendingWork && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Processing
                </span>
              )}
            </h3>
            <span className="text-xs text-outline">Auto-refreshes every 5s</span>
          </div>

          {/* Stage indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Raw articles stages */}
            <div className="rounded-xl bg-surface-container/60 p-4 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-outline uppercase tracking-wider">Queued</span>
                <span className="material-symbols-outlined text-[16px] text-blue-500">inbox</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{rawNew}</p>
              <p className="text-[10px] text-outline mt-1">Awaiting scrape</p>
            </div>
            <div
              className="rounded-xl bg-surface-container/60 p-4 border border-outline-variant/15 cursor-pointer hover:border-teal-500/40 transition-colors group"
              onClick={() => navigate('/curation')}
              title="Open curation UI to review and approve"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-outline uppercase tracking-wider">Awaiting Curation</span>
                <span className="material-symbols-outlined text-[16px] text-teal-600 group-hover:text-teal-500">rate_review</span>
              </div>
              <p className="text-2xl font-bold text-teal-600">{rawScraped}</p>
              <p className="text-[10px] text-teal-600/70 mt-1 group-hover:underline">Click to curate →</p>
            </div>
            <div className="rounded-xl bg-surface-container/60 p-4 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-outline uppercase tracking-wider">Rewriting</span>
                <span className={`material-symbols-outlined text-[16px] text-purple-600 ${rawProcessing > 0 ? 'animate-spin' : ''}`}>auto_awesome</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{rawProcessing}</p>
              <p className="text-[10px] text-outline mt-1">LLM in progress</p>
            </div>
            <div className="rounded-xl bg-surface-container/60 p-4 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-outline uppercase tracking-wider">Articles</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{totalArticles}</p>
              <p className="text-[10px] text-outline mt-1">Created from pipeline</p>
            </div>
            <div className="rounded-xl bg-surface-container/60 p-4 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-outline uppercase tracking-wider">Failed</span>
                <span className="material-symbols-outlined text-[16px] text-error">error</span>
              </div>
              <p className="text-2xl font-bold text-error">{rawFailed}</p>
              <p className="text-[10px] text-outline mt-1">Scrape errors</p>
            </div>
          </div>

          {/* Progress bar */}
          {totalRaw > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-outline mb-1">
                <span>Raw articles</span>
                <span>{rawScraped} awaiting curation • {rawProcessing} rewriting • {totalArticles} articles created • {totalRaw} total raw</span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden flex">
                {rawDone > 0 && (
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(rawDone / totalRaw) * 100}%` }} />
                )}
                {rawScraped > 0 && (
                  <div className="bg-teal-400 h-full transition-all duration-500" style={{ width: `${(rawScraped / totalRaw) * 100}%` }} />
                )}
                {rawProcessing > 0 && (
                  <div className="bg-purple-500 h-full animate-pulse transition-all duration-500" style={{ width: `${(rawProcessing / totalRaw) * 100}%` }} />
                )}
                {rawFailed > 0 && (
                  <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${(rawFailed / totalRaw) * 100}%` }} />
                )}
              </div>
            </div>
          )}

          {/* Final articles breakdown */}
          <div className="pt-3 border-t border-outline-variant/15">
            <p className="text-xs text-outline uppercase tracking-wider mb-2">Published Articles</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-sm text-on-surface-variant">Drafts: <strong className="text-amber-600">{artDraft}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-sm text-on-surface-variant">Approved: <strong className="text-cyan-600">{artApproved}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-on-surface-variant">Published: <strong className="text-emerald-600">{artPublished}</strong></span>
              </div>
              {artRejected > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-sm text-on-surface-variant">Rejected: <strong className="text-error">{artRejected}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-outline">Total: <strong className="text-on-surface">{totalArticles}</strong></span>
              </div>
            </div>
          </div>

          {/* Recent articles */}
          {pipelineStatus.recent && pipelineStatus.recent.length > 0 && (
            <div className="pt-3 border-t border-outline-variant/15">
              <p className="text-xs text-outline uppercase tracking-wider mb-2">Recent Articles</p>
              <div className="space-y-2">
                {pipelineStatus.recent.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm rounded-lg bg-surface-container/40 px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                      a.status === 'draft' ? 'bg-amber-500/10 text-amber-600' :
                      a.status === 'approved' ? 'bg-cyan-500/10 text-cyan-600' :
                      a.status === 'published' ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-error-container0/10 text-error'
                    }`}>{a.status}</span>
                    <span className="text-on-surface truncate flex-1" title={a.title}>{a.title}</span>
                    <span className="text-[10px] text-outline flex-shrink-0">{a.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Live Activity Feed ─────────────────────────────── */}
      {activity && activity.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">electric_bolt</span>
            Live Activity
            {activity.some(a => a.status === 'running') && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </h3>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {activity.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm px-3 py-1.5 rounded-lg ${
                a.status === 'running' ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-surface-container/30'
              }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  a.status === 'done' ? 'bg-emerald-400' :
                  a.status === 'error' ? 'bg-red-400' :
                  'bg-amber-400 animate-pulse'
                }`} />
                <span className="text-on-surface-variant font-medium flex-shrink-0 text-xs w-[120px]">{a.step}</span>
                <span className="text-on-surface-variant truncate flex-1 text-xs" title={a.detail}>{a.detail}</span>
                <span className="text-[10px] text-outline flex-shrink-0">
                  {new Date(a.ts).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── Scheduler & Worker Monitor ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scheduler Status */}
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              Scheduler
            </h3>
            <div className="flex items-center gap-2">
              {schedulerStatus?.enabled ? (
                <>
                  <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                  <button
                    onClick={() => stopSchedulerMutation.mutate()}
                    disabled={stopSchedulerMutation.isPending}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium disabled:opacity-50"
                  >Stop</button>
                </>
              ) : (
                <>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-medium">
                    Inactive
                  </span>
                  <button
                    onClick={() => startSchedulerMutation.mutate()}
                    disabled={startSchedulerMutation.isPending}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors font-medium disabled:opacity-50"
                  >Start</button>
                </>
              )}
              <button
                onClick={() => runNowMutation.mutate()}
                disabled={runNowMutation.isPending}
                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-medium disabled:opacity-50 flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-[10px] ${runNowMutation.isPending ? 'animate-spin' : ''}`}>
                  {runNowMutation.isPending ? 'progress_activity' : 'play_arrow'}
                </span>
                Run Now
              </button>
            </div>
          </div>

          {schedulerStatus && (
            <div className="space-y-2">
              {/* Schedule info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface-container/40 px-3 py-2">
                  <p className="text-[9px] text-outline uppercase tracking-wider">Mode</p>
                  <p className="text-xs font-medium text-on-surface mt-0.5">
                    {schedulerStatus.mode === 'daily'
                      ? `Daily at ${schedulerStatus.time_of_day}`
                      : `Every ${schedulerStatus.interval_minutes} min`}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container/40 px-3 py-2">
                  <p className="text-[9px] text-outline uppercase tracking-wider">Task</p>
                  <p className="text-xs font-medium text-on-surface mt-0.5">
                    {schedulerStatus.task === 'full_pipeline' ? '🔄 Full Pipeline'
                      : schedulerStatus.task === 'discover_feeds' ? '📡 RSS Only'
                      : '🌐 Crawl Only'}
                  </p>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-surface-container/40 px-3 py-2">
                  <p className="text-[9px] text-outline uppercase tracking-wider">Next Run</p>
                  <p className="text-[10px] font-medium text-on-surface mt-0.5 truncate" title={schedulerStatus.next_run_at || ''}>
                    {schedulerStatus.next_run_at
                      ? new Date(schedulerStatus.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container/40 px-3 py-2">
                  <p className="text-[9px] text-outline uppercase tracking-wider">Last Run</p>
                  <p className="text-[10px] font-medium text-on-surface mt-0.5 truncate" title={schedulerStatus.last_run_at || ''}>
                    {schedulerStatus.last_run_at
                      ? new Date(schedulerStatus.last_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container/40 px-3 py-2">
                  <p className="text-[9px] text-outline uppercase tracking-wider">Total Runs</p>
                  <p className="text-[10px] font-bold text-on-surface mt-0.5">{schedulerStatus.total_runs}</p>
                </div>
              </div>

              {schedulerStatus.is_quiet_hours && (
                <div className="text-[10px] text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">bedtime</span>
                  Quiet hours active ({schedulerStatus.quiet_hours.start}:00 – {schedulerStatus.quiet_hours.end}:00)
                </div>
              )}

              {schedulerStatus.last_error && (
                <div className="text-[10px] text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg truncate" title={schedulerStatus.last_error}>
                  ⚠ {schedulerStatus.last_error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Worker Live View */}
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
            Worker
            {queueStatus?.active_tasks && queueStatus.active_tasks.length > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {queueStatus.active_tasks.length} active
              </span>
            )}
            <span className="text-[10px] text-outline normal-case font-normal ml-auto">Refreshes 3s</span>
          </h3>

          {queueStatus?.active_tasks && queueStatus.active_tasks.length > 0 ? (
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {queueStatus.active_tasks.map((t) => {
                const elapsed = t.started ? Math.round((Date.now() / 1000) - t.started) : 0;
                const elapsedStr = elapsed > 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;
                const taskIcon = t.name.includes('scrape') ? '📰'
                  : t.name.includes('rewrite') ? '✍️'
                  : t.name.includes('image') || t.name.includes('search') ? '🔎'
                  : t.name.includes('discover') ? '🔍' : '⚙️';
                return (
                  <div key={t.id} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                    <span className="text-sm flex-shrink-0">{taskIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">{t.name}</span>
                        {elapsed > 0 && (
                          <span className="text-[10px] text-outline font-mono">{elapsedStr}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-on-surface-variant truncate mt-0.5" title={t.args}>
                        {t.args}
                      </p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="material-symbols-outlined text-[28px] text-outline/30">hourglass_empty</span>
              <p className="text-xs text-outline mt-2">No active tasks</p>
              <p className="text-[10px] text-outline/60 mt-0.5">Worker is idle — waiting for jobs</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Queue Management ──────────────────────────────── */}
      <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">queue</span>
            Queue Management
            <span className="text-[10px] text-outline normal-case font-normal ml-2">Auto-refreshes every 3s</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => retryMutation.mutate('all')}
              disabled={retryMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors font-medium disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">replay</span>
              {retryMutation.isPending ? 'Retrying...' : 'Retry Stuck'}
            </button>
            <button
              onClick={() => purgeMutation.mutate('all')}
              disabled={purgeMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors font-medium disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
              {purgeMutation.isPending ? 'Purging...' : 'Purge Queues'}
            </button>
            <button
              onClick={() => { if (window.confirm('Delete all unprocessed raw articles and pending articles? Draft/published articles will be kept.')) flushMutation.mutate(); }}
              disabled={flushMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors font-medium disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">cleaning_services</span>
              {flushMutation.isPending ? 'Flushing...' : 'Flush All'}
            </button>
            {!isStopped ? (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-error hover:bg-red-100 border border-red-200 transition-colors font-medium disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">stop_circle</span>
                {cancelMutation.isPending ? 'Stopping...' : 'Stop Pipeline'}
              </button>
            ) : (
              <button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors font-medium disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
              {resumeMutation.isPending ? 'Resuming...' : 'Resume Pipeline'}
              </button>
            )}
          </div>
        </div>

        {/* Stopped warning banner */}
        {isStopped && (
          <div className="rounded-xl bg-error-container0/10 border border-red-500/30 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs text-error font-medium">Pipeline is stopped — all tasks will abort. Click Resume or run a new pipeline to restart.</span>
            </div>
          </div>
        )}

        {/* Queue depths */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'scraper_queue', label: 'Scraper', icon: 'terminal', color: 'text-blue-600' },
            { name: 'rewriter_queue', label: 'Rewriter', icon: 'auto_awesome', color: 'text-purple-600' },
            { name: 'image_search_queue', label: 'Images', icon: 'image_search', color: 'text-cyan-600' },
            { name: 'default', label: 'Discovery', icon: 'explore', color: 'text-on-surface-variant' },
          ].map(q => {
            const count = queueStatus?.queues?.[q.name] ?? 0;
            return (
            <div key={q.name} className="rounded-xl bg-surface-container/60 p-3 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-outline uppercase tracking-wider">{q.label}</span>
                <span className={`material-symbols-outlined text-[16px] ${q.color} ${count > 0 ? 'animate-pulse' : ''}`}>{q.icon}</span>
              </div>
              <p className={`text-xl font-bold ${count > 0 ? q.color : 'text-outline'}`}>
                {count}
              </p>
              <p className="text-[10px] text-outline mt-0.5">{count > 0 ? 'in-flight' : 'idle'}</p>
            </div>
            );
          })}
        </div>

        {/* Ollama / LLM Status */}
        {ollamaStatus && (
          <div className="rounded-xl bg-surface-container/40 p-3 lg:p-4 border border-outline-variant/15">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  ollamaStatus.provider !== 'ollama' ? 'bg-blue-400' :
                  ollamaStatus.server_online ? (ollamaStatus.loaded_models.length > 0 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-red-400'
                }`} />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-on-surface">
                    {ollamaStatus.provider === 'ollama' ? '🦙 Ollama' : `🔗 ${ollamaStatus.provider.charAt(0).toUpperCase() + ollamaStatus.provider.slice(1)}`}
                  </span>
                  {ollamaStatus.provider === 'ollama' && (
                    <>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        ollamaStatus.server_online ? 'bg-emerald-500/10 text-emerald-600' : 'bg-error-container0/10 text-error'
                      }`}>
                        {ollamaStatus.server_online ? 'Online' : 'Offline'}
                      </span>
                      <span className="text-[10px] text-outline">•</span>
                      <span className="text-xs text-on-surface-variant">{ollamaStatus.configured_model}</span>
                      {ollamaStatus.think_enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600">/think</span>
                      )}
                      <span className="text-[10px] text-outline">ctx:{ollamaStatus.num_ctx}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ollamaStatus.provider === 'ollama' && ollamaStatus.loaded_models.length > 0 ? (
                  <>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                      ✓ {ollamaStatus.loaded_models[0].name} — {ollamaStatus.loaded_models[0].processor} ({ollamaStatus.loaded_models[0].vram_gb}GB VRAM)
                    </span>
                    <button
                      onClick={() => offloadMutation.mutate()}
                      disabled={offloadMutation.isPending}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-error-container0/10 text-error hover:bg-error-container transition-colors font-medium disabled:opacity-50"
                    >
                      {offloadMutation.isPending ? '⏳...' : '💤 Offload'}
                    </button>
                  </>
                ) : ollamaStatus.provider === 'ollama' && ollamaStatus.server_online ? (
                  <button
                    onClick={() => preloadMutation.mutate()}
                    disabled={preloadMutation.isPending}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 hover:bg-amber-50 transition-colors font-medium disabled:opacity-50"
                  >
                    {preloadMutation.isPending ? '⏳ Loading...' : '⚡ Load Model to GPU'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Stuck articles */}
        {queueStatus?.stuck && Object.values(queueStatus.stuck).some(v => v > 0) && (
          <div className="space-y-2">
            <p className="text-xs text-outline uppercase tracking-wider">Articles Needing Attention</p>
            <div className="flex flex-wrap gap-2">
              {(queueStatus.stuck.raw_new ?? 0) > 0 && (
                <button
                  onClick={() => retryMutation.mutate('scrape')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low0/10 border border-blue-500/20 hover:bg-surface-container-low0/20 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs text-blue-600">{queueStatus.stuck.raw_new} awaiting scrape</span>
                  <span className="text-[10px] text-blue-500">→ retry</span>
                </button>
              )}
              {(queueStatus.stuck.raw_scraped ?? 0) > 0 && (
                <button
                  onClick={() => navigate('/curation')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span className="text-xs text-teal-600">{queueStatus.stuck.raw_scraped} awaiting curation</span>
                  <span className="text-[10px] text-teal-500">→ review</span>
                </button>
              )}
              {(queueStatus.stuck.raw_processing ?? 0) > 0 && (
                <button
                  onClick={() => retryMutation.mutate('rewrite')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-300">{queueStatus.stuck.raw_processing} stuck processing</span>
                  <span className="text-[10px] text-amber-500">→ retry</span>
                </button>
              )}
              {(queueStatus.stuck.image_pending ?? 0) > 0 && (
                <button
                  onClick={() => retryMutation.mutate('images')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs text-cyan-300">{queueStatus.stuck.image_pending} awaiting images</span>
                  <span className="text-[10px] text-cyan-500">→ retry</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active tasks */}
        {queueStatus?.active_tasks && queueStatus.active_tasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-outline uppercase tracking-wider">Active Tasks</p>
            <div className="space-y-1">
              {queueStatus.active_tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 font-medium w-[140px]">{t.name}</span>
                  <span className="text-on-surface-variant truncate flex-1" title={t.args}>{t.args}</span>
                  <span className="text-[10px] text-outline font-mono">{t.id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Source Tag Filter ──────────────────────────────── */}
      {sourceTagsData && sourceTagsData.tags.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              🏷️ Filter by Topic
              {selectedTags.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 normal-case font-normal">
                  {selectedTags.length} selected — {
                    sourceTagsData.sources.filter(s => 
                      selectedTags.some(t => s.tags.includes(t))
                    ).length
                  } sources
                </span>
              )}
            </h3>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sourceTagsData.tags.map(tag => {
              const isSelected = selectedTags.includes(tag);
              const count = sourceTagsData.tags_map[tag]?.length ?? 0;
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                      : 'bg-surface-container/40 border-outline-variant/15/40 text-on-surface-variant hover:text-on-surface hover:border-outline-variant/15'
                  }`}
                >
                  {tag}
                  <span className="ml-1 text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="grid gap-4">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => runMutation.mutate({ task: a.id, source_tags: selectedTags.length > 0 ? selectedTags : undefined })}
            disabled={isRunning || runMutation.isPending}
            className={`bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 text-left transition-all hover:scale-[1.01] hover:shadow-xl ${a.shadow} disabled:opacity-50 disabled:cursor-not-allowed group`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-2xl shadow-lg ${a.shadow}`}>
                {a.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-on-surface group-hover:text-emerald-300 transition-colors">{a.label}</h3>
                <p className="text-sm text-on-surface-variant mt-0.5">{a.desc}</p>
              </div>
              {isRunning ? (
                <div className="w-6 h-6 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
              ) : (
                <span className="text-outline group-hover:text-on-surface-variant transition-colors text-xl">→</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Task status from dispatched tasks */}
      {Object.keys(taskStatuses).length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Dispatched Tasks</h3>
          {Object.entries(taskStatuses).map(([taskId, status]) => (
            <div key={taskId} className="flex items-center gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full ${
                status.status === 'SUCCESS' ? 'bg-emerald-400' :
                status.status === 'FAILURE' ? 'bg-red-400' :
                'bg-amber-400 animate-pulse'
              }`} />
              <span className="text-on-surface-variant font-mono text-xs">{taskId.slice(0, 8)}...</span>
              <span className={`font-medium ${
                status.status === 'SUCCESS' ? 'text-emerald-600' :
                status.status === 'FAILURE' ? 'text-error' :
                'text-amber-600'
              }`}>
                {status.status}
              </span>
              {status.result && (
                <span className="text-outline text-xs">
                  {typeof status.result === 'object' ? JSON.stringify(status.result) : status.result}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Sources Tab ──────────────────────────────────────────────────

function SourcesTab({
  sources,
  isLoading,
  onToggle,
  onDelete,
  onRefresh,
}: {
  sources: Record<string, any[]> | undefined;
  isLoading: boolean;
  onToggle: (cat: string, name: string) => void;
  onDelete: (cat: string, name: string) => void;
  onRefresh: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null); // "category::name"
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [newSource, setNewSource] = useState({
    category: 'tin_tuc',
    name: '',
    type: 'rss',
    url: '',
    seed_url: '',
    article_url_pattern: '',
    article_selector: '',
    enabled: true,
  });
  const queryClient = useQueryClient();

  const CATEGORY_META: Record<string, { label: string; icon: string; color: string; bgTint: string; border: string }> = {
    tin_tuc:        { label: 'Tin Tức',          icon: 'newspaper',      color: 'text-blue-600',    bgTint: 'bg-blue-500/5',    border: 'border-l-blue-500' },
    ai:             { label: 'AI',               icon: 'smart_toy',      color: 'text-purple-600',  bgTint: 'bg-purple-500/5',  border: 'border-l-purple-500' },
    cong_nghe:      { label: 'Công Nghệ',        icon: 'devices',        color: 'text-cyan-600',    bgTint: 'bg-cyan-500/5',    border: 'border-l-cyan-500' },
    it:             { label: 'IT',               icon: 'terminal',       color: 'text-emerald-600', bgTint: 'bg-emerald-500/5', border: 'border-l-emerald-500' },
    game_emulation: { label: 'Game & Emulation', icon: 'sports_esports', color: 'text-amber-600',   bgTint: 'bg-amber-500/5',   border: 'border-l-amber-500' },
    tech:           { label: 'Tech',             icon: 'memory',         color: 'text-on-surface-variant', bgTint: 'bg-surface-container', border: 'border-l-outline' },
  };

  const categoryOrder = ['tin_tuc', 'ai', 'cong_nghe', 'it', 'game_emulation'];

  const addMutation = useMutation({
    mutationFn: () => {
      const payload: any = { name: newSource.name, type: newSource.type, enabled: newSource.enabled };
      if (newSource.type === 'rss') payload.url = newSource.url;
      else { payload.seed_url = newSource.seed_url; payload.article_url_pattern = newSource.article_url_pattern; payload.article_selector = newSource.article_selector; }
      return api.addSource(newSource.category, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-sources'] });
      toast.success('Source added!');
      setShowAddForm(false);
      setNewSource({ category: 'tin_tuc', name: '', type: 'rss', url: '', seed_url: '', article_url_pattern: '', article_selector: '', enabled: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ category, name, updates }: { category: string; name: string; updates: Record<string, any> }) =>
      api.updateSource(category, name, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-sources'] });
      toast.success('Source updated!');
      setEditingKey(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const batchToggleMutation = useMutation({
    mutationFn: ({ category, enabled }: { category: string; enabled: boolean }) =>
      api.batchToggleSources(category, enabled),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-sources'] });
      toast.success(`${data.enabled ? 'Enabled' : 'Disabled'} ${data.count} sources`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const runCategoryMutation = useMutation({
    mutationFn: (category: string) =>
      api.runPipeline('full_pipeline', undefined, category),
    onSuccess: (data, category) => {
      toast.success(`Pipeline started for ${CATEGORY_META[category]?.label || category}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [detecting, setDetecting] = useState<'add' | 'edit' | null>(null);

  const runDetect = async (seedUrl: string, target: 'add' | 'edit') => {
    if (!seedUrl) { toast.error('Enter a Seed URL first'); return; }
    setDetecting(target);
    try {
      const result = await api.detectSourcePatterns(seedUrl);
      if (target === 'add') {
        setNewSource(prev => ({
          ...prev,
          article_url_pattern: result.article_url_pattern || prev.article_url_pattern,
          article_selector: result.article_selector || prev.article_selector,
        }));
      } else {
        setEditForm(prev => ({
          ...prev,
          article_url_pattern: result.article_url_pattern || prev.article_url_pattern,
          article_selector: result.article_selector || prev.article_selector,
        }));
      }
      toast.success(result.message || 'Patterns detected!');
    } catch (err: any) {
      toast.error(err.message || 'Detection failed');
    } finally {
      setDetecting(null);
    }
  };

  const toggleCollapse = (cat: string) => setCollapsedCats(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  const startEditing = (category: string, source: any) => {
    const key = `${category}::${source.name}`;
    setEditingKey(key);
    setEditForm({
      name: source.name || '',
      type: source.type || 'rss',
      url: source.url || '',
      seed_url: source.seed_url || '',
      article_url_pattern: source.article_url_pattern || '',
      article_selector: source.article_selector || '',
      tags: (source.tags || []).join(', '),
    });
  };

  const saveEdit = (category: string, originalName: string) => {
    const updates: Record<string, any> = { ...editForm };
    // Convert tags string to array
    if (typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    // Remove irrelevant fields based on type
    if (updates.type === 'rss') {
      delete updates.seed_url;
      delete updates.article_url_pattern;
      delete updates.article_selector;
    } else {
      delete updates.url;
    }
    updateMutation.mutate({ category, name: originalName, updates });
  };

  if (isLoading) return (
    <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-surface-container-low animate-pulse" />)}</div>
  );

  const allEntries = sources ? Object.values(sources).flat() : [];
  const totalSources = allEntries.length;
  const enabledSources = allEntries.filter((s: any) => s.enabled !== false).length;
  const rssSources = allEntries.filter((s: any) => s.type === 'rss').length;
  const crawlSources = allEntries.filter((s: any) => s.type === 'crawl').length;

  const sortedCategories = sources
    ? [...Object.keys(sources)].sort((a, b) => (categoryOrder.indexOf(a) === -1 ? 99 : categoryOrder.indexOf(a)) - (categoryOrder.indexOf(b) === -1 ? 99 : categoryOrder.indexOf(b)))
    : [];

  const inputCls = "w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/15 text-on-surface text-xs focus:border-primary/50 focus:outline-none";

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline text-on-surface">News Sources</h2>
          <p className="text-on-surface-variant mt-1 text-sm sm:text-base">Manage RSS feeds and crawl targets across categories.</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary hover:translate-y-[-1px] transition-all font-semibold shadow-sm">
            <span className="material-symbols-outlined text-[14px]">add</span> Add Source
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: totalSources, icon: 'hub', color: 'text-on-surface' },
          { label: 'Active', value: enabledSources, icon: 'check_circle', color: 'text-emerald-600' },
          { label: 'RSS Feeds', value: rssSources, icon: 'rss_feed', color: 'text-amber-600' },
          { label: 'Crawlers', value: crawlSources, icon: 'travel_explore', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-surface-container-low border border-outline-variant/15 p-3 flex sm:flex-row flex-col items-start sm:items-center gap-2 sm:gap-3">
            <span className={`material-symbols-outlined text-[20px] sm:text-[22px] ${s.color}`}>{s.icon}</span>
            <div>
              <p className={`text-lg sm:text-xl font-bold leading-tight ${s.color}`}>{s.value}</p>
              <p className="text-[9px] sm:text-[10px] text-outline uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Source Form */}
      {showAddForm && (
        <div className="bg-surface-container-low border-2 border-emerald-500/30 rounded-2xl p-5 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">add_circle</span> New Source
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-outline hover:text-on-surface"><span className="material-symbols-outlined text-[18px]">close</span></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1 uppercase tracking-wider">Name</label>
              <input type="text" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                className={inputCls} placeholder="e.g. The Verge" />
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1 uppercase tracking-wider">Category</label>
              <select value={newSource.category} onChange={(e) => setNewSource({ ...newSource, category: e.target.value })} className={inputCls}>
                {categoryOrder.map(cat => <option key={cat} value={cat}>{CATEGORY_META[cat]?.label || cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1 uppercase tracking-wider">Type</label>
              <select value={newSource.type} onChange={(e) => setNewSource({ ...newSource, type: e.target.value })} className={inputCls}>
                <option value="rss">RSS Feed</option>
                <option value="crawl">Web Crawl</option>
              </select>
            </div>
          </div>
          {newSource.type === 'rss' ? (
            <div>
              <label className="text-[10px] text-on-surface-variant block mb-1 uppercase tracking-wider">Feed URL</label>
              <input type="text" value={newSource.url} onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className={inputCls} placeholder="https://example.com/feed/" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-on-surface-variant block mb-1 uppercase tracking-wider">Seed URL <span className="text-error">*</span></label>
                <div className="flex gap-2">
                  <input type="text" value={newSource.seed_url} onChange={(e) => setNewSource({ ...newSource, seed_url: e.target.value })}
                    className={`${inputCls} flex-1`} placeholder="https://example.com/news — the main page to discover articles from" />
                  <button onClick={() => runDetect(newSource.seed_url, 'add')} disabled={detecting === 'add' || !newSource.seed_url}
                    className="px-3 py-1.5 text-[10px] rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors font-semibold flex items-center gap-1 whitespace-nowrap">
                    <span className={`material-symbols-outlined text-[14px] ${detecting === 'add' ? 'animate-spin' : ''}`}>{detecting === 'add' ? 'progress_activity' : 'auto_fix_high'}</span>
                    {detecting === 'add' ? 'Detecting...' : 'Auto-detect'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-on-surface-variant block mb-1 uppercase tracking-wider">URL Pattern (regex) <span className="text-outline">optional</span></label>
                  <input type="text" value={newSource.article_url_pattern} onChange={(e) => setNewSource({ ...newSource, article_url_pattern: e.target.value })}
                    className={inputCls} placeholder="Leave empty to match all links from the domain" />
                  <p className="text-[9px] text-outline mt-1">Regex to match article URLs. e.g. <code>gamespot\.com/articles/</code></p>
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant block mb-1 uppercase tracking-wider">Article Selector (CSS) <span className="text-outline">optional</span></label>
                  <input type="text" value={newSource.article_selector} onChange={(e) => setNewSource({ ...newSource, article_selector: e.target.value })}
                    className={inputCls} placeholder="Leave empty to use default (a[href])" />
                  <p className="text-[9px] text-outline mt-1">CSS selector for article links. e.g. <code>h2 a, h3 a, .article-title a</code></p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => addMutation.mutate()} disabled={!newSource.name || addMutation.isPending}
              className="px-5 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors font-medium">
              {addMutation.isPending ? 'Adding...' : '+ Add Source'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sources && sortedCategories.map((category) => {
          const entries = sources[category] || [];
          const meta = CATEGORY_META[category] || { label: category, icon: 'folder', color: 'text-on-surface-variant', bgTint: 'bg-surface-container', border: 'border-l-outline' };
          const isCollapsed = collapsedCats.has(category);
          const enabledCount = entries.filter((s: any) => s.enabled !== false).length;

          return (
            <div key={category} className={`rounded-2xl bg-surface-container-low border border-outline-variant/15 overflow-hidden border-l-4 ${meta.border} transition-all`}>
              {/* Category Header */}
              <div className={`px-4 py-3 flex items-center gap-3 cursor-pointer select-none hover:bg-surface-container/30 transition-colors ${meta.bgTint}`}
                onClick={() => toggleCollapse(category)}>
                <span className={`material-symbols-outlined text-[22px] ${meta.color}`}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-bold ${meta.color}`}>{meta.label}</h3>
                  <p className="text-[10px] text-outline">{enabledCount}/{entries.length} active</p>
                </div>
                {entries.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(enabledCount / entries.length) * 100}%` }} />
                    </div>
                    {enabledCount < entries.length ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); batchToggleMutation.mutate({ category, enabled: true }); }}
                        className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors font-medium whitespace-nowrap"
                        title="Enable all sources"
                      >All on</button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); batchToggleMutation.mutate({ category, enabled: false }); }}
                        className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium whitespace-nowrap"
                        title="Disable all sources"
                      >All off</button>
                    )}
                    {enabledCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); runCategoryMutation.mutate(category); }}
                        disabled={runCategoryMutation.isPending}
                        className={`text-[9px] px-2 py-0.5 rounded-full ${meta.bgTint} ${meta.color} hover:opacity-80 transition-all font-medium whitespace-nowrap flex items-center gap-1 disabled:opacity-50`}
                        title={`Run pipeline for ${meta.label} only`}
                      >
                        <span className={`material-symbols-outlined text-[10px] ${runCategoryMutation.isPending ? 'animate-spin' : ''}`}>
                          {runCategoryMutation.isPending ? 'progress_activity' : 'play_arrow'}
                        </span>
                        Run
                      </button>
                    )}
                  </div>
                )}
                <span className={`material-symbols-outlined text-[18px] text-outline transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>expand_more</span>
              </div>

              {/* Source List */}
              {!isCollapsed && (
                <div className="px-3 pb-3">
                  {entries.length === 0 ? (
                    <div className="py-6 text-center">
                      <span className={`material-symbols-outlined text-[32px] ${meta.color} opacity-20`}>{meta.icon}</span>
                      <p className="text-xs text-outline mt-2">No sources yet</p>
                      <button onClick={() => { setNewSource(prev => ({ ...prev, category })); setShowAddForm(true); }}
                        className={`text-[10px] mt-2 px-3 py-1 rounded-full ${meta.bgTint} ${meta.color} hover:opacity-80 transition-opacity font-medium`}>
                        + Add first source
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-0.5 mt-1">
                      {entries.map((source: any) => {
                        const sourceKey = `${category}::${source.name}`;
                        const isEditing = editingKey === sourceKey;
                        return (
                          <div key={source.name}>
                            {/* Source Row */}
                            <div className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-surface-container/40 ${source.enabled !== false ? '' : 'opacity-40'} ${isEditing ? 'bg-surface-container/40' : ''}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${source.type === 'rss' ? 'bg-amber-500' : 'bg-purple-500'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-semibold text-on-surface truncate">{source.name}</h4>
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0 ${
                                    source.type === 'rss' ? 'bg-amber-500/10 text-amber-600' : 'bg-purple-500/10 text-purple-600'}`}>{source.type}</span>
                                </div>
                                <p className="text-[10px] text-outline truncate mt-0.5">{source.url || source.seed_url}</p>
                              </div>
                              {source.tags && source.tags.length > 0 && (
                                <div className="hidden group-hover:flex gap-0.5 flex-shrink-0">
                                  {source.tags.slice(0, 2).map((tag: string) => (
                                    <span key={tag} className="text-[8px] px-1 py-0.5 rounded bg-surface-container text-on-surface-variant">{tag}</span>
                                  ))}
                                  {source.tags.length > 2 && <span className="text-[8px] text-outline">+{source.tags.length - 2}</span>}
                                </div>
                              )}
                              {/* Edit button */}
                              <button onClick={(e) => { e.stopPropagation(); isEditing ? setEditingKey(null) : startEditing(category, source); }}
                                className={`text-outline hover:text-primary transition-all flex-shrink-0 ${isEditing ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100'}`}>
                                <span className="material-symbols-outlined text-[14px]">{isEditing ? 'close' : 'edit'}</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onToggle(category, source.name); }}
                                className={`w-8 h-4 rounded-full transition-all relative flex-shrink-0 ${source.enabled !== false ? 'bg-emerald-500' : 'bg-surface-container-high'}`}>
                                <span className={`w-3 h-3 rounded-full bg-white absolute top-[2px] transition-all shadow-sm ${source.enabled !== false ? 'left-[18px]' : 'left-[2px]'}`} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${source.name}"?`)) onDelete(category, source.name); }}
                                className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-all flex-shrink-0">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>

                            {/* Inline Edit Form */}
                            {isEditing && (
                              <div className="ml-4 mr-2 mt-1 mb-2 p-3 rounded-xl bg-surface-container/60 border border-outline-variant/15 space-y-2.5 animate-fade-in-up">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] text-outline uppercase tracking-wider block mb-0.5">Name</label>
                                    <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-outline uppercase tracking-wider block mb-0.5">Tags <span className="normal-case">(comma separated)</span></label>
                                    <input type="text" value={editForm.tags || ''} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                                      className={inputCls} placeholder="ai, science, tech" />
                                  </div>
                                </div>
                                {editForm.type === 'rss' ? (
                                  <div>
                                    <label className="text-[9px] text-outline uppercase tracking-wider block mb-0.5">Feed URL</label>
                                    <input type="text" value={editForm.url || ''} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} className={inputCls} />
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <label className="text-[9px] text-outline uppercase tracking-wider block mb-0.5">Seed URL</label>
                                      <div className="flex gap-2">
                                        <input type="text" value={editForm.seed_url || ''} onChange={(e) => setEditForm({ ...editForm, seed_url: e.target.value })} className={`${inputCls} flex-1`} />
                                        <button onClick={() => runDetect(editForm.seed_url, 'edit')} disabled={detecting === 'edit' || !editForm.seed_url}
                                          className="px-2 py-1 text-[9px] rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors font-semibold flex items-center gap-1 whitespace-nowrap">
                                          <span className={`material-symbols-outlined text-[12px] ${detecting === 'edit' ? 'animate-spin' : ''}`}>{detecting === 'edit' ? 'progress_activity' : 'auto_fix_high'}</span>
                                          {detecting === 'edit' ? '...' : 'Detect'}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[9px] text-outline uppercase tracking-wider block mb-0.5">URL Pattern <span className="normal-case text-outline">(optional regex)</span></label>
                                        <input type="text" value={editForm.article_url_pattern || ''} onChange={(e) => setEditForm({ ...editForm, article_url_pattern: e.target.value })}
                                          className={inputCls} placeholder="Leave empty → all links from domain" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] text-outline uppercase tracking-wider block mb-0.5">Selector <span className="normal-case text-outline">(optional CSS)</span></label>
                                        <input type="text" value={editForm.article_selector || ''} onChange={(e) => setEditForm({ ...editForm, article_selector: e.target.value })}
                                          className={inputCls} placeholder="Leave empty → uses a[href]" />
                                      </div>
                                    </div>
                                  </>
                                )}
                                <div className="flex gap-2 pt-1">
                                  <button onClick={() => saveEdit(category, source.name)} disabled={updateMutation.isPending}
                                    className="px-3 py-1 text-[10px] rounded-lg bg-primary text-white hover:bg-primary-container disabled:opacity-50 transition-colors font-semibold">
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                  </button>
                                  <button onClick={() => setEditingKey(null)}
                                    className="px-3 py-1 text-[10px] rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Config Tab ──────────────────────────────────────────────────

function ConfigTab({
  config: initialConfig,
  isLoading,
}: {
  config: PipelineConfig | undefined;
  isLoading: boolean;
}) {
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const saveMutation = useMutation({
    mutationFn: (cfg: PipelineConfig) => api.updatePipelineConfig(cfg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-config'] });
      toast.success('Configuration saved!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const restartMutation = useMutation({
    mutationFn: async (cfg: PipelineConfig) => {
      await api.updatePipelineConfig(cfg);
      return api.restartWorker();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-config'] });
      queryClient.invalidateQueries({ queryKey: ['worker-status'] });
      toast.success('Config saved & worker restarting...');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: workerStatus } = useQuery({
    queryKey: ['worker-status'],
    queryFn: api.getWorkerStatus,
    refetchInterval: 10000,
  });

  // Scheduler status
  const { data: schedulerStatus } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: api.getSchedulerStatus,
    refetchInterval: 5000,
  });

  const schedulerStartMutation = useMutation({
    mutationFn: () => api.startScheduler(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
      toast.success(data.message || 'Scheduler started');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const schedulerStopMutation = useMutation({
    mutationFn: () => api.stopScheduler(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
      toast.success(data.message || 'Scheduler stopped');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const schedulerRunNowMutation = useMutation({
    mutationFn: () => api.schedulerRunNow(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
      toast.success(data.message || 'Pipeline triggered');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !config) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-surface-container-low animate-pulse" />
        ))}
      </div>
    );
  }

  const updateConfig = <K extends keyof PipelineConfig>(key: K, value: PipelineConfig[K]) => {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  type ConfigField =
    | { key: keyof PipelineConfig; label: string; type: 'text' }
    | { key: keyof PipelineConfig; label: string; type: 'number'; step?: number }
    | { key: keyof PipelineConfig; label: string; type: 'select'; options: { value: string; label: string }[] }
    | { key: keyof PipelineConfig; label: string; type: 'range'; min: number; max: number; step: number }
    | { key: keyof PipelineConfig; label: string; type: 'toggle' };

  const configSections: { title: string; fields: ConfigField[] }[] = [
    {
      title: 'LLM Settings',
      fields: [
        {
          key: 'llm_provider',
          label: 'Provider',
          type: 'select',
          options: [
            { value: 'gemini', label: 'Google Gemini' },
            { value: 'anthropic', label: 'Anthropic Claude' },
            { value: 'ollama', label: 'Ollama (Local)' },
          ],
        },
        { key: 'gemini_model', label: 'Gemini Model', type: 'text' },
        { key: 'anthropic_model', label: 'Claude Model', type: 'text' },
        { key: 'llm_temperature', label: 'Temperature', type: 'range', min: 0, max: 1, step: 0.1 },
      ],
    },
    {
      title: 'Ollama (Local LLM)',
      fields: [
        { key: 'ollama_base_url', label: 'Base URL', type: 'text' },
        { key: 'ollama_model', label: 'Model', type: 'text' },
        { key: 'ollama_num_ctx', label: 'Context Window (num_ctx)', type: 'number', step: 1024 },
        { key: 'ollama_think', label: 'Enable /think (reasoning mode)', type: 'toggle' },
      ],
    },
    {
      title: 'Language',
      fields: [
        { key: 'output_language', label: 'Language Code', type: 'text' },
        { key: 'output_language_name', label: 'Language Name', type: 'text' },
      ],
    },
    {
      title: 'Pipeline Limits',
      fields: [
        { key: 'max_articles_per_run', label: 'Max articles per discovery run (total)', type: 'number' },
        { key: 'max_articles_per_source', label: 'Max articles per source (per run)', type: 'number' },
        { key: 'randomize_sources', label: 'Randomize source & article order', type: 'toggle' },
        { key: 'scraper_delay_seconds', label: 'Scraper delay between requests (sec)', type: 'number', step: 0.5 },
        { key: 'enable_dalle_fallback', label: 'Enable DALL·E Fallback', type: 'toggle' },
      ],
    },
    {
      title: 'Auto-Approval',
      fields: [
        { key: 'auto_approve', label: 'Auto-approve articles after pipeline', type: 'toggle' },
        { key: 'auto_approve_select_image', label: 'Auto-select first image as hero', type: 'toggle' },
      ],
    },
    {
      title: 'Scheduled Runs',
      fields: [
        { key: 'scheduler_enabled', label: 'Enable automatic scheduled runs', type: 'toggle' },
        {
          key: 'scheduler_mode',
          label: 'Schedule type',
          type: 'select',
          options: [
            { value: 'interval', label: 'Repeat every N minutes' },
            { value: 'daily', label: 'Run at specific times each day' },
          ],
        },
        ...(config.scheduler_mode === 'daily'
          ? [
              { key: 'scheduler_time_of_day', label: 'Run times (local, comma-separated e.g. 08:00, 16:30)', type: 'text' } as ConfigField,
            ]
          : [
              { key: 'scheduler_interval_minutes', label: 'Run every (minutes)', type: 'number' } as ConfigField,
              { key: 'scheduler_quiet_hours_start', label: 'Quiet hours start (0-23, -1 = off)', type: 'number' } as ConfigField,
              { key: 'scheduler_quiet_hours_end', label: 'Quiet hours end (0-23, -1 = off)', type: 'number' } as ConfigField,
            ]),
        {
          key: 'scheduler_task',
          label: 'Task to run',
          type: 'select',
          options: [
            { value: 'full_pipeline', label: 'Full Pipeline (RSS + Crawl)' },
            { value: 'discover_feeds', label: 'RSS Feeds Only' },
            { value: 'discover_crawl', label: 'Web Crawl Only' },
          ],
        },
      ],
    },
  ];

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-headline text-on-surface">Pipeline Configuration</h2>
          <p className="text-on-surface-variant mt-1 lg:mt-2 text-sm lg:text-lg">Adjust LLM, language, and scraping settings.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full lg:w-auto sm:items-center gap-2 lg:gap-3">
          {/* Worker status indicator */}
          <div className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 sm:py-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/15 w-full sm:w-auto">
            <span className={`w-2 h-2 rounded-full ${
              workerStatus?.alive ? 'bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/50' : 'bg-red-400'
            }`} />
            <span className="text-xs text-on-surface-variant whitespace-nowrap">
              Worker {workerStatus?.alive ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => saveMutation.mutate(config)}
            disabled={saveMutation.isPending || restartMutation.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:opacity-50 transition-colors font-medium w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => restartMutation.mutate(config)}
            disabled={saveMutation.isPending || restartMutation.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary hover:translate-y-[-1px] disabled:opacity-50 transition-all font-semibold w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            {restartMutation.isPending ? 'Restarting...' : 'Save & Restart'}
          </button>
        </div>
      </div>

      {configSections.map((section) => (
        <div key={section.title} className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            {section.title === 'Auto-Approval' && <span className="material-symbols-outlined text-[18px] text-emerald-500">verified</span>}
            {section.title === 'Scheduled Pipeline' && <span className="material-symbols-outlined text-[18px] text-amber-500">schedule</span>}
            {section.title}
            {section.title === 'Auto-Approval' && config.auto_approve && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 normal-case font-normal">Active</span>
            )}
            {section.title === 'Auto-Approval' && !config.auto_approve && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant normal-case font-normal">Disabled</span>
            )}
          </h3>
          {section.title === 'Auto-Approval' && (
            <p className="text-xs text-on-surface-variant -mt-2">
              When enabled, articles skip the "draft" review step and go directly to "approved" after the pipeline finishes.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {section.fields.map((field) => (
              <div key={field.key} className={field.type === 'toggle' ? 'flex items-center justify-between col-span-1 sm:col-span-2' : ''}>
                <label className="text-[11px] lg:text-xs text-on-surface-variant block mb-1.5 font-medium">{field.label}</label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={String(config[field.key])}
                    onChange={(e) => updateConfig(field.key, e.target.value as any)}
                    className="w-full px-3 py-2.5 lg:py-2 rounded-lg bg-surface-container border border-outline-variant/15 text-on-surface text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={Number(config[field.key])}
                    onChange={(e) => updateConfig(field.key, Number(e.target.value) as any)}
                    step={field.step || 1}
                    className="w-full px-3 py-2.5 lg:py-2 rounded-lg bg-surface-container border border-outline-variant/15 text-on-surface text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={String(config[field.key])}
                    onChange={(e) => updateConfig(field.key, e.target.value as any)}
                    className="w-full px-3 py-2.5 lg:py-2 rounded-lg bg-surface-container border border-outline-variant/15 text-on-surface text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {field.type === 'range' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={Number(config[field.key])}
                      onChange={(e) => updateConfig(field.key, Number(e.target.value) as any)}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-sm text-on-surface-variant font-mono w-8 text-right">
                      {Number(config[field.key]).toFixed(1)}
                    </span>
                  </div>
                )}

                {field.type === 'toggle' && (
                  <button
                    onClick={() => updateConfig(field.key, !config[field.key] as any)}
                    className={`w-12 h-6 lg:w-10 lg:h-5 rounded-full transition-all relative flex-shrink-0 ${
                      config[field.key] ? 'bg-emerald-500' : 'bg-surface-container-high'
                    }`}
                  >
                    <span className={`w-4 h-4 lg:w-3.5 lg:h-3.5 rounded-full bg-surface-container-lowest absolute top-[4px] lg:top-[3px] transition-all ${
                      config[field.key] ? 'left-[26px] lg:left-5' : 'left-1'
                    }`} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Scheduler Status Card */}
      {schedulerStatus && (
        <div className={`bg-surface-container-low border rounded-2xl p-6 space-y-4 ${
          schedulerStatus.enabled
            ? 'border-amber-500/30'
            : 'border-outline-variant/15'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-500">schedule</span>
              Scheduler Status
              {schedulerStatus.enabled ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant normal-case font-normal">
                  Inactive
                </span>
              )}
              {schedulerStatus.is_quiet_hours && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 normal-case font-normal">
                  🌙 Quiet Hours
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              {!schedulerStatus.enabled ? (
                <button
                  onClick={() => schedulerStartMutation.mutate()}
                  disabled={schedulerStartMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors font-medium disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                  {schedulerStartMutation.isPending ? 'Starting...' : 'Start Scheduler'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => schedulerRunNowMutation.mutate()}
                    disabled={schedulerRunNowMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors font-medium disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    {schedulerRunNowMutation.isPending ? 'Running...' : 'Run Now'}
                  </button>
                  <button
                    onClick={() => schedulerStopMutation.mutate()}
                    disabled={schedulerStopMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors font-medium disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">stop</span>
                    {schedulerStopMutation.isPending ? 'Stopping...' : 'Stop'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-surface-container/60 p-3 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-outline uppercase tracking-wider">
                  {schedulerStatus.mode === 'daily' ? 'Daily At' : 'Interval'}
                </span>
                <span className="material-symbols-outlined text-[16px] text-amber-600">timer</span>
              </div>
              {schedulerStatus.mode === 'daily' ? (
                <p className="text-[13px] leading-tight font-bold text-amber-600 mt-1 line-clamp-2">{schedulerStatus.time_of_day}</p>
              ) : (
                <p className="text-xl font-bold text-amber-600">{schedulerStatus.interval_minutes}m</p>
              )}
              <p className="text-[10px] text-outline mt-0.5">
                {schedulerStatus.mode === 'daily' ? 'Local Times' : 'Between runs'}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container/60 p-3 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-outline uppercase tracking-wider">Task</span>
                <span className="material-symbols-outlined text-[16px] text-blue-600">rocket_launch</span>
              </div>
              <p className="text-sm font-bold text-blue-600 truncate">{
                schedulerStatus.task === 'full_pipeline' ? 'Full Pipeline' :
                schedulerStatus.task === 'discover_feeds' ? 'RSS Only' : 'Crawl Only'
              }</p>
              <p className="text-[10px] text-outline mt-0.5">Scheduled task</p>
            </div>
            <div className="rounded-xl bg-surface-container/60 p-3 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-outline uppercase tracking-wider">Total Runs</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-600">counter_1</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">{schedulerStatus.total_runs}</p>
              <p className="text-[10px] text-outline mt-0.5">Since startup</p>
            </div>
            <div className="rounded-xl bg-surface-container/60 p-3 border border-outline-variant/15">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-outline uppercase tracking-wider">Last Run</span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">history</span>
              </div>
              <p className="text-sm font-bold text-on-surface-variant truncate">
                {schedulerStatus.last_run_at
                  ? new Date(schedulerStatus.last_run_at).toLocaleTimeString()
                  : '—'}
              </p>
              <p className="text-[10px] text-outline mt-0.5">
                {schedulerStatus.last_run_at
                  ? new Date(schedulerStatus.last_run_at).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>

          {schedulerStatus.last_error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                Last error: {schedulerStatus.last_error}
              </p>
            </div>
          )}

          {schedulerStatus.quiet_hours.start >= 0 && schedulerStatus.quiet_hours.end >= 0 && (
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-3">
              <p className="text-xs text-purple-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">bedtime</span>
                Quiet hours: {schedulerStatus.quiet_hours.start}:00 – {schedulerStatus.quiet_hours.end}:00 UTC
                {schedulerStatus.is_quiet_hours && ' (currently active)'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-4 border border-amber-200">
        <p className="text-xs text-amber-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">warning</span>
          Changes to LLM provider, models, and language require a Celery worker restart to take effect.
        </p>
      </div>
    </div>
  );
}
