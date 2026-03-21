import { useState, KeyboardEvent } from 'react';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagEditor({ tags, onChange }: TagEditorProps) {
  const [input, setInput] = useState('');

  const addTag = (value: string) => {
    const tag = value.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
        Tags
      </label>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-surface-container-low border border-outline-variant/15 min-h-[38px] focus-within:border-accent-500/50 transition-colors">
        {tags.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs bg-accent-600/20 text-accent-300 px-2 py-0.5 rounded-lg border border-accent-500/30 animate-fade-in-up"
          >
            {tag}
            <button
              onClick={() => removeTag(i)}
              className="text-accent-400 hover:text-on-surface transition-colors text-[10px] leading-none"
              tabIndex={-1}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          spellCheck={false}
          lang="vi"
          className="flex-1 min-w-[80px] bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
        />
      </div>
    </div>
  );
}
