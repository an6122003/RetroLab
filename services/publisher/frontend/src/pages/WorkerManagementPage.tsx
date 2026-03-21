import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api';
import AppShell from '../components/AppShell';

type WorkerTab = 'workers' | 'queues' | 'activity' | 'ollama';

const QUEUE_META: Record<string, { label: string; icon: string; color: string }> = {
  scraper_queue:     { label: 'Scraper',  icon: 'terminal',      color: 'text-blue-600' },
  rewriter_queue:    { label: 'Rewriter', icon: 'auto_awesome',  color: 'text-purple-600' },
  image_search_queue:{ label: 'Images',   icon: 'image_search',  color: 'text-cyan-600' },
  default:           { label: 'Default',  icon: 'inventory_2',   color: 'text-on-surface-variant' },
};

export default function WorkerManagementPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<WorkerTab>('workers');

  // ── Real data queries ──
  const { data: workerStatus, isLoading: workersLoading } = useQuery({
    queryKey: ['worker-status'],
    queryFn: api.getWorkerStatus,
    refetchInterval: 5000,
  });

  const { data: queueStatus } = useQuery({
    queryKey: ['queue-status'],
    queryFn: api.getQueueStatus,
    refetchInterval: 3000,
  });

  const { data: pipelineStatus } = useQuery({
    queryKey: ['pipeline-status'],
    queryFn: api.getPipelineStatus,
    refetchInterval: 5000,
  });

  const { data: activity } = useQuery({
    queryKey: ['pipeline-activity'],
    queryFn: api.getPipelineActivity,
    refetchInterval: 3000,
  });

  const { data: ollamaStatus } = useQuery({
    queryKey: ['ollama-status'],
    queryFn: api.getOllamaStatus,
    refetchInterval: 5000,
  });

  const { data: stoppedStatus } = useQuery({
    queryKey: ['pipeline-stopped'],
    queryFn: api.isPipelineStopped,
    refetchInterval: 3000,
  });
  const isStopped = stoppedStatus?.stopped ?? false;

  // ── Mutations ──
  const restartMutation = useMutation({
    mutationFn: () => api.restartWorker(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worker-status'] });
      toast.success(data.message || 'Worker restarted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelAll(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-status'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stopped'] });
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

  const spawnMutation = useMutation({
    mutationFn: (queues: string[]) => api.spawnWorker(queues),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worker-status'] });
      toast.success(data.message || `Worker ${data.name} spawned`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopMutation = useMutation({
    mutationFn: (name: string) => api.stopWorker(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worker-status'] });
      toast.success(data.message || `Worker ${data.name} stopping`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Derived data ──
  const workers = workerStatus?.workers || [];
  const isAlive = workerStatus?.alive ?? false;
  const totalQueued = queueStatus?.total_queued ?? 0;
  const totalArticles = pipelineStatus?.total_articles ?? 0;
  const rawDone = pipelineStatus?.raw_articles?.done ?? 0;
  const rawFailed = pipelineStatus?.raw_articles?.scrape_failed ?? 0;
  const hasStuck = queueStatus?.stuck && Object.values(queueStatus.stuck).some(v => v > 0);

  // ── Header ──
  const headerContent = (
    <>
      <div className="flex items-center gap-12">
        <h1 className="text-2xl font-extrabold font-headline tracking-tight text-primary">Worker Management</h1>
        <nav className="flex gap-8">
          {([
            { key: 'workers' as WorkerTab, label: 'Workers' },
            { key: 'queues' as WorkerTab, label: 'Queues' },
            { key: 'activity' as WorkerTab, label: 'Activity' },
            { key: 'ollama' as WorkerTab, label: 'LLM Engine' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`font-medium pb-2 transition-all border-b-2 ${
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
      <div className="flex items-center gap-4">
        <button className="p-2 text-outline hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        {!isStopped ? (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-error text-on-error font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">stop_circle</span>
            {cancelMutation.isPending ? 'Stopping...' : 'Stop All'}
          </button>
        ) : (
          <button
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            {resumeMutation.isPending ? 'Resuming...' : 'Resume Pipeline'}
          </button>
        )}
      </div>
    </>
  );

  return (
    <AppShell header={headerContent}>
      <div className="p-12 min-h-screen">
        {/* ── Stopped banner ── */}
        {isStopped && (
          <div className="mb-8 rounded-xl bg-error-container border border-error/20 p-4 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
            <span className="text-sm text-on-error-container font-medium">
              Pipeline is stopped — all tasks will abort. Click Resume to restart.
            </span>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center gap-6">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isAlive ? 'bg-[#dbe1ff] text-primary' : 'bg-error-container text-error'}`}>
              <span className="material-symbols-outlined text-3xl">smart_toy</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">Celery Workers</p>
              <p className="text-3xl font-bold font-headline">
                {workers.length}
                <span className={`text-sm font-normal ml-2 ${isAlive ? 'text-emerald-600' : 'text-error'}`}>
                  {isAlive ? '● online' : '● offline'}
                </span>
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-3xl">bolt</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">Queued Tasks</p>
              <p className="text-3xl font-bold font-headline">
                {totalQueued}
                <span className="text-sm font-normal text-outline ml-2">in queues</span>
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#dbe1ff] flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">Processed</p>
              <p className="text-3xl font-bold font-headline">
                {rawDone}
                <span className="text-sm font-normal text-outline ml-2">scraped</span>
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15 flex items-center gap-6">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${rawFailed > 0 ? 'bg-error-container text-error' : 'bg-[#dbe1ff] text-primary'}`}>
              <span className="material-symbols-outlined text-3xl">{rawFailed > 0 ? 'error' : 'article'}</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">{rawFailed > 0 ? 'Failed' : 'Articles'}</p>
              <p className="text-3xl font-bold font-headline">
                {rawFailed > 0 ? rawFailed : totalArticles}
                <span className="text-sm font-normal text-outline ml-2">{rawFailed > 0 ? 'errors' : 'total'}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── Tab Content ── */}
        {tab === 'workers' && (
          <WorkersTab
            workers={workers}
            isAlive={isAlive}
            isLoading={workersLoading}
            onRestart={() => restartMutation.mutate()}
            isRestarting={restartMutation.isPending}
            activeTaskCount={queueStatus?.active_tasks?.length ?? 0}
            activeTasks={queueStatus?.active_tasks || []}
            system={workerStatus?.system}
            onSpawn={(queues) => spawnMutation.mutate(queues)}
            onStop={(name) => stopMutation.mutate(name)}
            isSpawning={spawnMutation.isPending}
            isStopping={stopMutation.isPending}
          />
        )}

        {tab === 'queues' && (
          <QueuesTab
            queueStatus={queueStatus}
            hasStuck={!!hasStuck}
            onRetry={(target) => retryMutation.mutate(target)}
            onPurge={(queue) => {
              if (window.confirm(`Purge all tasks from ${queue === 'all' ? 'all queues' : queue}?`))
                purgeMutation.mutate(queue);
            }}
            isRetrying={retryMutation.isPending}
            isPurging={purgeMutation.isPending}
          />
        )}

        {tab === 'activity' && (
          <ActivityTab activity={activity} recentArticles={pipelineStatus?.recent} />
        )}

        {tab === 'ollama' && (
          <OllamaTab
            status={ollamaStatus}
            onPreload={() => preloadMutation.mutate()}
            onOffload={() => offloadMutation.mutate()}
            isPreloading={preloadMutation.isPending}
            isOffloading={offloadMutation.isPending}
          />
        )}
      </div>

      {/* Ambient glow */}
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10 pointer-events-none" />
    </AppShell>
  );
}


/* ═══════════════════════════════════════════════════════════════════
 *  WORKERS TAB — Real Celery worker status + system metrics
 * ═══════════════════════════════════════════════════════════════════ */
function WorkersTab({ workers, isAlive, isLoading, onRestart, isRestarting, activeTaskCount, activeTasks, system, onSpawn, onStop, isSpawning, isStopping }: {
  workers: { name: string; status: string; active_tasks: number; total_processed: number; pool: string; concurrency: number; pid: number | null; queues: string[] }[];
  isAlive: boolean;
  isLoading: boolean;
  onRestart: () => void;
  isRestarting: boolean;
  activeTaskCount: number;
  activeTasks: { id: string; name: string; args: string; started: number | null; worker: string }[];
  system?: { cpu_percent: number; memory_percent: number; memory_used_gb: number; memory_total_gb: number };
  onSpawn: (queues: string[]) => void;
  onStop: (name: string) => void;
  isSpawning: boolean;
  isStopping: boolean;
}) {
  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const [spawnQueues, setSpawnQueues] = useState<string[]>(['default', 'scraper_queue', 'rewriter_queue', 'image_search_queue']);

  const allQueues = ['default', 'scraper_queue', 'rewriter_queue', 'image_search_queue'];

  return (
    <section className="space-y-8">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight font-headline mb-2">Celery Workers</h2>
          <p className="text-on-surface-variant text-lg">Real-time status of the news-pipeline Celery task workers.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSpawnDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Spawn Worker
          </button>
          <button
            onClick={onRestart}
            disabled={isRestarting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">restart_alt</span>
            {isRestarting ? 'Restarting...' : 'Restart All'}
          </button>
        </div>
      </div>

      {/* Spawn Worker Dialog */}
      {showSpawnDialog && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-6 space-y-4 animate-fade-in-up">
          <h3 className="text-lg font-bold font-headline">Spawn New Worker</h3>
          <p className="text-sm text-on-surface-variant">Select which queues this worker should listen to:</p>
          <div className="flex flex-wrap gap-2">
            {allQueues.map(q => {
              const meta = QUEUE_META[q] || { label: q, icon: 'inventory_2', color: 'text-outline' };
              const isSelected = spawnQueues.includes(q);
              return (
                <button
                  key={q}
                  onClick={() => {
                    setSpawnQueues(prev =>
                      isSelected ? prev.filter(x => x !== q) : [...prev, q]
                    );
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    isSelected
                      ? 'bg-primary-container text-white border-primary'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/15 hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                onSpawn(spawnQueues);
                setShowSpawnDialog(false);
              }}
              disabled={isSpawning || spawnQueues.length === 0}
              className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isSpawning ? 'Spawning...' : 'Launch Worker'}
            </button>
            <button
              onClick={() => setShowSpawnDialog(false)}
              className="px-5 py-2 bg-surface-container text-on-surface-variant font-medium rounded-lg text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* System Metrics */}
      {system && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">memory</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">CPU Usage</p>
                  <p className="text-[10px] text-outline">System-wide</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${system.cpu_percent > 80 ? 'text-error' : system.cpu_percent > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {system.cpu_percent}%
              </span>
            </div>
            <div className="h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  system.cpu_percent > 80 ? 'bg-error' : system.cpu_percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${system.cpu_percent}%` }}
              />
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/15">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600">storage</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">Memory Usage</p>
                  <p className="text-[10px] text-outline">{system.memory_used_gb} / {system.memory_total_gb} GB</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${system.memory_percent > 85 ? 'text-error' : system.memory_percent > 60 ? 'text-amber-600' : 'text-purple-600'}`}>
                {system.memory_percent}%
              </span>
            </div>
            <div className="h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  system.memory_percent > 85 ? 'bg-error' : system.memory_percent > 60 ? 'bg-amber-500' : 'bg-purple-500'
                }`}
                style={{ width: `${system.memory_percent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Worker Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/15 h-48 animate-pulse" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-error/10 p-12 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-error-container flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[40px] text-error">cloud_off</span>
          </div>
          <h3 className="text-xl font-bold font-headline text-on-surface mb-2">No Workers Online</h3>
          <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
            No Celery workers are responding. The pipeline cannot process tasks without active workers.
          </p>
          <button
            onClick={() => onSpawn(allQueues)}
            disabled={isSpawning}
            className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:translate-y-[-2px] transition-all disabled:opacity-50"
          >
            {isSpawning ? 'Spawning...' : 'Start a Worker'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {workers.map((w) => {
            const isOnline = w.status === 'online';
            const workerTasks = activeTasks.filter(t => t.worker === w.name);

            return (
              <div key={w.name} className={`bg-surface-container-lowest p-8 rounded-xl flex flex-col gap-6 hover:shadow-xl transition-all ${
                isOnline ? 'border border-outline-variant/15 hover:shadow-primary/5' : 'border-2 border-error/10 hover:shadow-error/5'
              }`}>
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isOnline ? 'bg-slate-100' : 'bg-error/5'}`}>
                      <span className={`material-symbols-outlined ${isOnline ? 'text-slate-500' : 'text-error'}`}>
                        {isOnline ? 'dns' : 'error'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold font-headline leading-tight">
                        {w.name.replace(/celery@/, '')}
                      </h4>
                      <p className="text-on-surface-variant text-xs mt-1 font-mono">{w.name}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-error-container text-on-error-container'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-error animate-pulse'}`} />
                    {w.status}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 py-4 border-y border-outline-variant/10">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Active</p>
                    <p className="text-xl font-bold">{w.active_tasks}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Processed</p>
                    <p className="text-xl font-bold">{w.total_processed}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Pool</p>
                    <p className="text-sm font-medium text-on-surface-variant mt-1">{w.pool}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">PID</p>
                    <p className="text-sm font-mono text-on-surface-variant mt-1">{w.pid || '—'}</p>
                  </div>
                </div>

                {/* Queues */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Listening on</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(w.queues || []).map(q => {
                      const meta = QUEUE_META[q] || { label: q, icon: 'inventory_2', color: 'text-on-surface-variant' };
                      return (
                        <span key={q} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface-container border border-outline-variant/15 ${meta.color}`}>
                          <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      );
                    })}
                    {(!w.queues || w.queues.length === 0) && (
                      <span className="text-xs text-outline italic">Unknown</span>
                    )}
                  </div>
                </div>

                {/* Active tasks on this worker */}
                {workerTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Running Tasks</p>
                    {workerTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs bg-surface-container/40 rounded-lg px-3 py-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-medium text-on-surface truncate">{t.name.split('.').pop()}</span>
                        <span className="text-outline truncate flex-1">{t.args}</span>
                        <span className="text-[10px] text-outline font-mono">{t.id.slice(0, 8)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      if (window.confirm(`Stop worker ${w.name.replace(/celery@/, '')}?`))
                        onStop(w.name);
                    }}
                    disabled={isStopping}
                    className="text-error text-sm font-bold hover:underline disabled:opacity-50"
                  >
                    Stop
                  </button>
                  <button
                    onClick={onRestart}
                    disabled={isRestarting}
                    className="text-primary text-sm font-bold hover:underline disabled:opacity-50"
                  >
                    Restart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


/* ═══════════════════════════════════════════════════════════════════
 *  QUEUES TAB — Real queue depths + stuck articles + active tasks
 * ═══════════════════════════════════════════════════════════════════ */
function QueuesTab({ queueStatus, hasStuck, onRetry, onPurge, isRetrying, isPurging }: {
  queueStatus: any;
  hasStuck: boolean;
  onRetry: (target: string) => void;
  onPurge: (queue: string) => void;
  isRetrying: boolean;
  isPurging: boolean;
}) {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight font-headline mb-2">Queue Management</h2>
          <p className="text-on-surface-variant text-lg">Monitor and manage Celery task queues. Auto-refreshes every 3s.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onRetry('all')}
            disabled={isRetrying}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">replay</span>
            {isRetrying ? 'Retrying...' : 'Retry Stuck'}
          </button>
          <button
            onClick={() => onPurge('all')}
            disabled={isPurging}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 font-semibold rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            {isPurging ? 'Purging...' : 'Purge All'}
          </button>
        </div>
      </div>

      {/* Queue depth cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Object.entries(QUEUE_META).map(([key, meta]) => {
          const depth = queueStatus?.queues?.[key] ?? 0;
          const stuckCount = key === 'scraper_queue' ? (queueStatus?.stuck?.raw_new ?? 0) :
                             key === 'rewriter_queue' ? (queueStatus?.stuck?.raw_done ?? 0) + (queueStatus?.stuck?.raw_processing ?? 0) :
                             key === 'image_search_queue' ? (queueStatus?.stuck?.image_pending ?? 0) : 0;

          return (
            <div key={key} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/15 flex flex-col gap-6 hover:shadow-xl hover:shadow-primary/5 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500">{meta.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold font-headline leading-tight">{meta.label} Queue</h4>
                    <p className="text-on-surface-variant text-xs mt-1 font-mono">{key}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  depth > 0
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${depth > 0 ? 'bg-blue-500' : 'bg-slate-400'}`} />
                  {depth > 0 ? 'Active' : 'Empty'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 py-4 border-y border-outline-variant/10">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Queued</p>
                  <p className={`text-xl font-bold ${meta.color}`}>{depth}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Stuck</p>
                  <p className={`text-xl font-bold ${stuckCount > 0 ? 'text-error' : 'text-on-surface'}`}>{stuckCount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Status</p>
                  <p className="text-sm font-medium text-on-surface-variant mt-1">
                    {depth > 0 ? 'Processing' : 'Idle'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                {stuckCount > 0 ? (
                  <div className="bg-error-container/20 px-4 py-1.5 rounded-lg">
                    <p className="text-xs text-error font-medium">{stuckCount} tasks stuck — not in any queue</p>
                  </div>
                ) : (
                  <div className="flex -space-x-2">
                    <div className={`w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600`}>Q</div>
                  </div>
                )}
                <div className="flex gap-3">
                  {stuckCount > 0 && (
                    <button
                      onClick={() => {
                        const target = key === 'scraper_queue' ? 'scrape' :
                                       key === 'rewriter_queue' ? 'rewrite' :
                                       key === 'image_search_queue' ? 'images' : 'all';
                        onRetry(target);
                      }}
                      disabled={isRetrying}
                      className="text-primary text-sm font-bold hover:underline disabled:opacity-50"
                    >
                      Retry Stuck
                    </button>
                  )}
                  {depth > 0 && (
                    <button
                      onClick={() => onPurge(key)}
                      disabled={isPurging}
                      className="p-2 text-outline hover:text-error transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active tasks */}
      {queueStatus?.active_tasks && queueStatus.active_tasks.length > 0 && (
        <div className="bg-surface-container p-1 rounded-2xl">
          <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
            <h3 className="text-xl font-bold font-headline mb-4">Active Tasks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10">
                    <th className="pb-4 font-bold text-sm text-outline uppercase tracking-widest">Task</th>
                    <th className="pb-4 font-bold text-sm text-outline uppercase tracking-widest">Arguments</th>
                    <th className="pb-4 font-bold text-sm text-outline uppercase tracking-widest">Worker</th>
                    <th className="pb-4 font-bold text-sm text-outline uppercase tracking-widest text-right">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {queueStatus.active_tasks.map((t: any) => (
                    <tr key={t.id} className="border-t border-outline-variant/5">
                      <td className="py-4 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-medium">{t.name.split('.').pop()}</span>
                      </td>
                      <td className="py-4 text-on-surface-variant text-sm max-w-xs truncate">{t.args}</td>
                      <td className="py-4 text-on-surface-variant text-sm">{t.worker.replace(/celery@/, '')}</td>
                      <td className="py-4 text-right font-mono text-outline text-sm">{t.id.slice(0, 12)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


/* ═══════════════════════════════════════════════════════════════════
 *  ACTIVITY TAB — Real pipeline activity feed + recent articles
 * ═══════════════════════════════════════════════════════════════════ */
function ActivityTab({ activity, recentArticles }: {
  activity?: { ts: string; step: string; detail: string; status: string }[];
  recentArticles?: { id: string; title: string; status: string; source: string; created_at: string }[];
}) {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight font-headline mb-2">Live Activity</h2>
        <p className="text-on-surface-variant text-lg">Real-time pipeline processing feed. Auto-refreshes every 3s.</p>
      </div>

      {/* Activity feed */}
      {activity && activity.length > 0 ? (
        <div className="bg-surface-container p-1 rounded-2xl">
          <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-headline">Processing Log</h3>
              {activity.some(a => a.status === 'running') && (
                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {activity.map((a, i) => (
                <div key={i} className={`flex items-center gap-3 text-sm px-4 py-2.5 rounded-lg transition-colors ${
                  a.status === 'running' ? 'bg-amber-50 border border-amber-200' :
                  a.status === 'error' ? 'bg-error-container/10 border border-error/10' :
                  'bg-surface-container/30 hover:bg-surface-container/50'
                }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    a.status === 'done' ? 'bg-emerald-500' :
                    a.status === 'error' ? 'bg-error' :
                    'bg-amber-500 animate-pulse'
                  }`} />
                  <span className="text-on-surface font-medium flex-shrink-0 w-[140px] text-xs">{a.step}</span>
                  <span className="text-on-surface-variant truncate flex-1" title={a.detail}>{a.detail}</span>
                  <span className="text-[10px] text-outline flex-shrink-0 font-mono">
                    {new Date(a.ts).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-12 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-container flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[40px] text-outline">history</span>
          </div>
          <h3 className="text-xl font-bold font-headline text-on-surface mb-2">No Activity Yet</h3>
          <p className="text-on-surface-variant">Run the pipeline to see live processing activity here.</p>
        </div>
      )}

      {/* Recent articles */}
      {recentArticles && recentArticles.length > 0 && (
        <div className="bg-surface-container p-1 rounded-2xl">
          <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
            <h3 className="text-xl font-bold font-headline mb-4">Recent Articles</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/10">
                    <th className="pb-4 font-bold text-sm text-outline uppercase tracking-widest">Status</th>
                    <th className="pb-4 font-bold text-sm text-outline uppercase tracking-widest">Title</th>
                    <th className="pb-4 font-bold text-sm text-outline uppercase tracking-widest text-right">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {recentArticles.map((a) => (
                    <tr key={a.id} className="border-t border-outline-variant/5">
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          a.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                          a.status === 'published' ? 'bg-emerald-50 text-emerald-700' :
                          a.status === 'approved' ? 'bg-blue-50 text-blue-700' :
                          'bg-error-container text-on-error-container'
                        }`}>{a.status}</span>
                      </td>
                      <td className="py-4 font-medium max-w-md truncate">{a.title}</td>
                      <td className="py-4 text-right text-on-surface-variant text-sm">{a.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


/* ═══════════════════════════════════════════════════════════════════
 *  OLLAMA TAB — Real LLM engine status
 * ═══════════════════════════════════════════════════════════════════ */
function OllamaTab({ status, onPreload, onOffload, isPreloading, isOffloading }: {
  status: any;
  onPreload: () => void;
  onOffload: () => void;
  isPreloading: boolean;
  isOffloading: boolean;
}) {
  if (!status) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-12 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[40px] text-outline">model_training</span>
        </div>
        <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Loading LLM Status...</h3>
        <p className="text-on-surface-variant">Connecting to the LLM engine.</p>
      </div>
    );
  }

  const isOllama = status.provider === 'ollama';
  const isOnline = isOllama ? status.server_online : true;
  const hasLoaded = isOllama && status.loaded_models?.length > 0;

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight font-headline mb-2">LLM Engine</h2>
        <p className="text-on-surface-variant text-lg">
          {isOllama ? 'Local Ollama server for article rewriting.' : `Using cloud provider: ${status.provider}`}
        </p>
      </div>

      {/* Main status card */}
      <div className={`bg-surface-container-lowest p-8 rounded-xl flex flex-col gap-6 hover:shadow-xl transition-all ${
        isOnline ? 'border border-outline-variant/15 hover:shadow-primary/5' : 'border-2 border-error/10 hover:shadow-error/5'
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isOnline ? 'bg-[#dbe1ff]' : 'bg-error/5'}`}>
              <span className={`material-symbols-outlined text-3xl ${isOnline ? 'text-primary' : 'text-error'}`}>
                {isOllama ? 'model_training' : 'cloud'}
              </span>
            </div>
            <div>
              <h4 className="text-2xl font-bold font-headline leading-tight">
                {isOllama ? 'Ollama' : status.provider.charAt(0).toUpperCase() + status.provider.slice(1)}
              </h4>
              <p className="text-on-surface-variant text-sm mt-1">
                {isOllama ? `Model: ${status.configured_model}` : `Provider: ${status.provider}`}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isOnline
              ? hasLoaded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              : 'bg-error-container text-on-error-container'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? hasLoaded ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500' : 'bg-error animate-pulse'
            }`} />
            {isOnline ? (hasLoaded ? 'Loaded' : 'Ready') : 'Offline'}
          </div>
        </div>

        {isOllama && (
          <div className="grid grid-cols-3 gap-8 py-4 border-y border-outline-variant/10">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Context Window</p>
              <p className="text-xl font-bold">{status.num_ctx?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Thinking Mode</p>
              <p className={`text-sm font-semibold mt-1 ${status.think_enabled ? 'text-purple-600' : 'text-on-surface-variant'}`}>
                {status.think_enabled ? '✓ Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Server</p>
              <p className={`text-sm font-semibold mt-1 ${isOnline ? 'text-emerald-600' : 'text-error'}`}>
                {isOnline ? '● Online' : '● Offline'}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          {hasLoaded ? (
            <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium">
                ✓ {status.loaded_models[0].name} — {status.loaded_models[0].processor} ({status.loaded_models[0].vram_gb}GB VRAM)
              </p>
            </div>
          ) : isOnline ? (
            <p className="text-sm text-on-surface-variant">No model loaded in GPU memory</p>
          ) : (
            <div className="bg-error-container/20 px-4 py-1.5 rounded-lg">
              <p className="text-xs text-error font-medium">Server not responding</p>
            </div>
          )}
          <div className="flex gap-3">
            {isOllama && isOnline && (
              hasLoaded ? (
                <button
                  onClick={onOffload}
                  disabled={isOffloading}
                  className="bg-error text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-error/90 transition-colors disabled:opacity-50"
                >
                  {isOffloading ? 'Offloading...' : 'Offload Model'}
                </button>
              ) : (
                <button
                  onClick={onPreload}
                  disabled={isPreloading}
                  className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-4 py-1.5 rounded-lg text-sm font-bold hover:translate-y-[-1px] transition-all disabled:opacity-50"
                >
                  {isPreloading ? 'Loading...' : 'Load to GPU'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Available models */}
      {isOllama && status.available_models && status.available_models.length > 0 && (
        <div className="bg-surface-container p-1 rounded-2xl">
          <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
            <h3 className="text-xl font-bold font-headline mb-4">Available Models</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {status.available_models.map((m: any) => {
                const isActive = status.configured_model === m.name;
                const isLoaded = status.loaded_models?.some((l: any) => l.name === m.name);
                return (
                  <div key={m.name} className={`p-4 rounded-xl border transition-all ${
                    isActive ? 'border-primary/30 bg-primary-fixed/20' :
                    'border-outline-variant/15 hover:bg-surface-container/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{m.name}</span>
                      {isLoaded && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">IN GPU</span>}
                      {isActive && !isLoaded && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">CONFIGURED</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant">{m.size_gb} GB</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
