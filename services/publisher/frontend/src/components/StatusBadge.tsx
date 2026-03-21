const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  approved:  'bg-surface-container-high text-primary',
  published: 'bg-emerald-50 text-emerald-700',
  rejected:  'bg-error-container text-on-error-container',
};

export default function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const style = STATUS_STYLES[s] || 'bg-surface-container-high text-on-surface-variant';

  return (
    <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded ${style}`}>
      {s === 'rejected' ? 'REVISION NEEDED' : status.toUpperCase()}
    </span>
  );
}
