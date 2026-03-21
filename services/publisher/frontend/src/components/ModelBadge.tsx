/**
 * ModelBadge — Displays the AI model that rewrote an article as a styled pill.
 */

interface ModelBadgeProps {
  model: string;
  /** Optional size variant */
  size?: 'sm' | 'md';
}

export default function ModelBadge({ model, size = 'sm' }: ModelBadgeProps) {
  // Parse model string formats:
  //   "ollama/qwen3:14b"           → provider=ollama, model=qwen3:14b
  //   "gemini:gemini-2.5-flash"    → provider=gemini, model=gemini-2.5-flash
  //   "anthropic:claude-sonnet-4-6" → provider=anthropic, model=claude-sonnet-4-6
  //   "gemini-2.0-flash"           → provider=gemini, model=gemini-2.0-flash
  //   "claude-sonnet-4-6"           → provider=anthropic, model=claude-sonnet-4-6
  let provider = 'ai';
  let displayName = model;

  if (model.startsWith('ollama/')) {
    provider = 'ollama';
    displayName = model.replace('ollama/', '');
  } else if (model.includes(':')) {
    const colonIdx = model.indexOf(':');
    provider = model.substring(0, colonIdx).toLowerCase();
    displayName = model.substring(colonIdx + 1);
  } else if (model.startsWith('gemini')) {
    provider = 'gemini';
  } else if (model.startsWith('claude')) {
    provider = 'anthropic';
  }

  const providerKey = provider.includes('ollama') ? 'ollama'
    : provider.includes('gemini') ? 'gemini'
    : provider.includes('anthropic') ? 'anthropic'
    : 'default';

  const styles: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
    ollama:    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'smart_toy', label: 'Ollama' },
    gemini:    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'auto_awesome', label: 'Gemini' },
    anthropic: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'psychology', label: 'Claude' },
    default:   { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: 'smart_toy', label: 'AI' },
  };
  const s = styles[providerKey] || styles.default;

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'text-[12px]' : 'text-[14px]';
  const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-lg ${textSize} font-bold border ${s.bg} ${s.text} ${s.border}`}
      title={`Rewritten by ${s.label}: ${model}`}
    >
      <span className={`material-symbols-outlined ${iconSize}`}>{s.icon}</span>
      {s.label} · {displayName}
    </span>
  );
}
