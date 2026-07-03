import { useState } from 'react';

export function TagInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  function commit(raw) {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const existing = new Set(value.map((v) => v.toLowerCase()));
    const additions = parts.filter((p) => !existing.has(p.toLowerCase()));
    if (additions.length) onChange([...value, ...additions]);
    setDraft('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag) {
    onChange(value.filter((v) => v !== tag));
  }

  return (
    <div
      className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500"
      onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-sm text-indigo-700"
        >
          {tag}
          <button
            type="button"
            className="text-indigo-400 hover:text-indigo-700"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            aria-label={`Remove ${tag}`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        className="min-w-[100px] flex-1 border-none p-1 text-sm outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length === 0 ? placeholder : ''}
      />
    </div>
  );
}
