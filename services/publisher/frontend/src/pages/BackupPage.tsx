import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../api';
import AppShell from '../components/AppShell';

export default function BackupPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──
  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: ['backup-list'],
    queryFn: api.listBackups,
  });

  const { data: config } = useQuery({
    queryKey: ['backup-config'],
    queryFn: api.getBackupConfig,
  });

  const { data: driveConfig } = useQuery({
    queryKey: ['drive-config'],
    queryFn: api.getDriveConfig,
  });

  const { data: driveFiles, isLoading: driveFilesLoading } = useQuery({
    queryKey: ['drive-files'],
    queryFn: api.listDriveFiles,
    enabled: !!driveConfig?.folder_id,
    refetchInterval: 30_000,
  });

  // ── Config state ──
  const [autoEnabled, setAutoEnabled] = useState<boolean | null>(null);
  const [intervalHours, setIntervalHours] = useState<number | null>(null);
  const [maxBackups, setMaxBackups] = useState<number | null>(null);

  // Drive config state
  const [driveEnabled, setDriveEnabled] = useState<boolean | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);

  // Use config values as defaults if local state is not set
  const isEnabled = autoEnabled ?? config?.enabled ?? false;
  const hours = intervalHours ?? config?.interval_hours ?? 24;
  const maxCount = maxBackups ?? config?.max_backups ?? 10;

  const isDriveEnabled = driveEnabled ?? driveConfig?.enabled ?? false;
  const currentFolderId = folderId ?? driveConfig?.folder_id ?? '';

  // ── Mutations ──
  const exportMutation = useMutation({
    mutationFn: () => api.exportBackup(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backup-list'] });
      queryClient.invalidateQueries({ queryKey: ['drive-files'] });
      const driveMsg = data.drive?.action ? ` → Synced to Drive (${data.drive.action})` : '';
      toast.success(`Backup created: ${data.filename} (${data.size_mb} MB)${driveMsg}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importBackup(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backup-list'] });
      toast.success(
        `Imported ${data.imported.raw_articles} raw + ${data.imported.articles} articles (${data.imported.skipped} skipped)`,
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => api.deleteBackup(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-list'] });
      toast.success('Backup deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const configMutation = useMutation({
    mutationFn: () => api.updateBackupConfig(isEnabled, hours, maxCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-config'] });
      toast.success('Backup settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const driveConfigMutation = useMutation({
    mutationFn: () => api.updateDriveConfig(isDriveEnabled, currentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-config'] });
      queryClient.invalidateQueries({ queryKey: ['drive-files'] });
      toast.success('Google Drive settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const driveTestMutation = useMutation({
    mutationFn: () => api.testDriveConnection(),
    onSuccess: (data) => {
      if (data.status === 'connected') {
        toast.success(`Connected to folder: ${data.folder_name}`);
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const driveUploadMutation = useMutation({
    mutationFn: (filename: string) => api.uploadToDrive(filename),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drive-files'] });
      toast.success(`Uploaded to Drive: ${data.name} (v${data.version})`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const driveRestoreMutation = useMutation({
    mutationFn: (fileId: string) => api.restoreFromDrive(fileId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backup-list'] });
      toast.success(
        `Restored from Drive: ${data.imported.raw_articles} raw + ${data.imported.articles} articles (${data.imported.skipped} skipped)`,
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = '';
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/backup/download/${encodeURIComponent(filename)}`, '_blank');
  };

  // ── Header ──
  const headerContent = (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-extrabold font-headline tracking-tight text-primary">Backup & Restore</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleImport}
          disabled={importMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface font-semibold rounded-lg hover:bg-surface-container transition-colors text-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          {importMutation.isPending ? 'Importing…' : 'Import'}
        </button>
        <button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-lg shadow-sm hover:translate-y-[-2px] active:scale-95 transition-all text-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">backup</span>
          {exportMutation.isPending ? 'Exporting…' : 'Create Backup'}
        </button>
      </div>
    </>
  );

  return (
    <AppShell header={headerContent}>
      <div className="p-12 min-h-screen space-y-10">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ── Schedule Config ── */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold font-headline mb-1">Auto-Backup Schedule</h2>
              <p className="text-sm text-on-surface-variant">Configure periodic automatic backups of all data.</p>
            </div>
            {config?.last_backup && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Last Backup</p>
                <p className="text-sm text-on-surface-variant">{new Date(config.last_backup).toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Auto-Backup</label>
              <button
                onClick={() => setAutoEnabled(!isEnabled)}
                className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all border ${
                  isEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant/15'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Interval (hours)</label>
              <input
                type="number"
                min={1}
                max={168}
                value={hours}
                onChange={(e) => setIntervalHours(parseInt(e.target.value) || 24)}
                className="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/15 text-on-surface font-medium text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block" title="Maximum number of local backup files to keep. When a new backup is created, the oldest files beyond this limit are automatically deleted.">Keep Last (files)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxCount}
                onChange={(e) => setMaxBackups(parseInt(e.target.value) || 10)}
                className="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/15 text-on-surface font-medium text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={() => configMutation.mutate()}
              disabled={configMutation.isPending}
              className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-lg text-sm hover:translate-y-[-1px] transition-all disabled:opacity-50"
            >
              {configMutation.isPending ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

          {config?.next_backup && isEnabled && (
            <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              Next backup: {new Date(config.next_backup).toLocaleString()}
            </div>
          )}
        </section>

        {/* ── Google Drive Sync ── */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 overflow-hidden">
          {/* Drive header with Google branding */}
          <div className="px-8 py-6 border-b border-outline-variant/15 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[24px]">cloud_sync</span>
              </div>
              <div>
                <h2 className="text-xl font-bold font-headline">Google Drive Sync</h2>
                <p className="text-sm text-on-surface-variant">
                  Auto-upload backups to Google Drive with version history.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {driveConfig?.key_file_found ? (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider border border-emerald-200">
                  Key Found
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-bold uppercase tracking-wider border border-red-200">
                  No Key
                </span>
              )}
              {isDriveEnabled && currentFolderId && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold uppercase tracking-wider border border-blue-200">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="p-8">
            {/* SA info */}
            {driveConfig?.sa_email && (
              <div className="mb-6 px-4 py-3 bg-surface-container rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-outline">account_circle</span>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Service Account</p>
                  <p className="text-sm text-on-surface font-mono">{driveConfig.sa_email}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              {/* Enable toggle */}
              <div>
                <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Drive Sync</label>
                <button
                  onClick={() => setDriveEnabled(!isDriveEnabled)}
                  className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all border ${
                    isDriveEnabled
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/15'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isDriveEnabled ? 'bg-blue-500' : 'bg-outline'}`} />
                    {isDriveEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
              </div>

              {/* Folder ID */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Drive Folder ID</label>
                <input
                  type="text"
                  value={currentFolderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="Paste Google Drive folder ID here"
                  className="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/15 text-on-surface font-mono text-sm focus:outline-none focus:border-primary placeholder:text-outline/50"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => driveTestMutation.mutate()}
                  disabled={driveTestMutation.isPending || !currentFolderId}
                  className="flex-1 px-4 py-3 bg-surface-container-high text-on-surface font-semibold rounded-lg text-sm hover:bg-surface-container transition-colors disabled:opacity-50"
                  title="Test connection"
                >
                  {driveTestMutation.isPending ? '…' : 'Test'}
                </button>
                <button
                  onClick={() => driveConfigMutation.mutate()}
                  disabled={driveConfigMutation.isPending}
                  className="flex-1 px-4 py-3 bg-primary text-on-primary font-semibold rounded-lg text-sm hover:translate-y-[-1px] transition-all disabled:opacity-50"
                >
                  {driveConfigMutation.isPending ? '…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Auth row */}
            <div className="mt-4 flex items-center justify-between px-1">
              <p className="text-xs text-on-surface-variant">
                Share your Drive folder with the SA email above (as Editor). The folder ID is the last part of the folder URL.
              </p>
              <button
                onClick={async () => {
                  try {
                    const result = await api.startDriveAuth();
                    if (result.auth_url) {
                      window.open(result.auth_url, '_blank');
                      toast.success('Complete authentication in the new tab, then refresh this page.');
                    } else {
                      toast.error(result.error || 'Failed to generate auth URL');
                    }
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 font-semibold rounded-lg text-xs hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">key</span>
                Re‑Authenticate
              </button>
            </div>
          </div>

          {/* Drive files list */}
          {currentFolderId && (
            <div className="border-t border-outline-variant/15 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-blue-600">cloud_done</span>
                  Files on Google Drive
                  {driveFiles?.total !== undefined && (
                    <span className="text-xs font-normal text-outline">({driveFiles.total})</span>
                  )}
                </h3>
              </div>

              {driveFilesLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-surface-container animate-pulse" />
                  ))}
                </div>
              ) : driveFiles?.error ? (
                <div className="px-4 py-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                  {driveFiles.error}
                </div>
              ) : !driveFiles?.files?.length ? (
                <div className="text-center py-8 text-on-surface-variant text-sm">
                  <span className="material-symbols-outlined text-[32px] text-outline block mb-2">cloud_off</span>
                  No backups on Drive yet. Create a backup to sync.
                </div>
              ) : (
                <div className="space-y-2">
                  {driveFiles.files.map((f) => (
                    <div
                      key={f.file_id}
                      className="flex items-center justify-between px-4 py-3 bg-surface-container/50 rounded-lg hover:bg-surface-container transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-blue-500">cloud_done</span>
                        <div>
                          <p className="text-sm font-medium text-on-surface">{f.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-on-surface-variant">
                              {new Date(f.modified_at).toLocaleString()}
                            </span>
                            <span className="text-[11px] text-outline">•</span>
                            <span className="text-[11px] text-on-surface-variant">{f.size_mb} MB</span>
                            <span className="text-[11px] text-outline">•</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">
                              v{f.version}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (window.confirm(`Restore ${f.name} from Drive?\nThis will import all articles (existing records are safely skipped).`))
                              driveRestoreMutation.mutate(f.file_id);
                          }}
                          disabled={driveRestoreMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50 text-xs font-semibold"
                          title="Restore from Drive"
                        >
                          <span className="material-symbols-outlined text-[16px]">cloud_download</span>
                          {driveRestoreMutation.isPending ? 'Restoring…' : 'Restore'}
                        </button>
                        {f.web_link && (
                          <a
                            href={f.web_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Open in Drive"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Backup List ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold font-headline mb-1">Local Backup History</h2>
              <p className="text-sm text-on-surface-variant">
                {backups?.total ?? 0} backups stored{backups?.backup_dir ? ` in ${backups.backup_dir}` : ''}
              </p>
            </div>
          </div>

          {backupsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-surface-container-lowest animate-pulse" />
              ))}
            </div>
          ) : !backups?.backups?.length ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-12 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-container flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[40px] text-outline">cloud_off</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface mb-2">No Backups Yet</h3>
              <p className="text-on-surface-variant mb-6">Create your first backup to protect your data.</p>
              <button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold rounded-lg hover:translate-y-[-2px] transition-all disabled:opacity-50"
              >
                {exportMutation.isPending ? 'Creating…' : 'Create First Backup'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.backups.map((b) => {
                const date = new Date(b.created_at);
                const isRecent = Date.now() - date.getTime() < 24 * 60 * 60 * 1000;

                return (
                  <div
                    key={b.filename}
                    className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-6 flex items-center justify-between hover:shadow-lg hover:shadow-primary/5 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isRecent ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-container text-outline'
                      }`}>
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-on-surface">{b.filename}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-on-surface-variant">{date.toLocaleString()}</span>
                          <span className="text-xs text-outline">•</span>
                          <span className="text-xs text-on-surface-variant">{b.size_mb} MB</span>
                          {isRecent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider">
                              Recent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Upload to Drive button (only if Drive is configured) */}
                      {isDriveEnabled && currentFolderId && (
                        <button
                          onClick={() => driveUploadMutation.mutate(b.filename)}
                          disabled={driveUploadMutation.isPending}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Upload to Drive"
                        >
                          <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(b.filename)}
                        className="p-2 text-primary hover:bg-primary-fixed/20 rounded-lg transition-colors"
                        title="Download"
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${b.filename}?`))
                            deleteMutation.mutate(b.filename);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Migration Guide ── */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-8">
          <h2 className="text-xl font-bold font-headline mb-4">Migration Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600">cloud_download</span>
              </div>
              <h3 className="font-semibold text-sm">1. Export</h3>
              <p className="text-xs text-on-surface-variant">
                Click "Create Backup" to export all articles, raw articles, and pipeline config to a JSON file.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600">swap_horiz</span>
              </div>
              <h3 className="font-semibold text-sm">2. Transfer</h3>
              <p className="text-xs text-on-surface-variant">
                Download the backup file and move it to your new server. Set up a fresh database on the target.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600">cloud_upload</span>
              </div>
              <h3 className="font-semibold text-sm">3. Import</h3>
              <p className="text-xs text-on-surface-variant">
                Use "Import" on the new server to restore all data. Existing records are safely skipped (upsert).
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Ambient glow */}
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10 pointer-events-none" />
    </AppShell>
  );
}
