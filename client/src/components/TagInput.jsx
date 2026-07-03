import { useState } from 'react';

const MAX_SUGGESTIONS_SHOWN = 12;

// Deliberately not rendered inside a <label> (e.g. via the shared <Field>
// wrapper): a <label> containing multiple interactive children (this
// draft input plus the tag-remove and suggestion buttons) makes the
// browser fire an extra synthetic click on the label's associated
// control whenever any nested button is clicked, which can silently
// revert a just-added tag. TagInput renders its own label text instead.
export function TagInput({ label, required, value, onChange, placeholder, suggestions }) {
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

  function addSuggestion(skill) {
    const existing = new Set(value.map((v) => v.toLowerCase()));
    if (existing.has(skill.toLowerCase())) return;
    onChange([...value, skill]);
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

  const visibleSuggestions = (suggestions || []).slice(0, MAX_SUGGESTIONS_SHOWN);

  return (
    <div>
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
      )}
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

      {visibleSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleSuggestions.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => addSuggestion(skill)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              + {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
