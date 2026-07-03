export function Field({ label, error, children, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

const baseInputClass =
  'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export function TextInput(props) {
  return <input {...props} className={baseInputClass} />;
}

export function NumberInput(props) {
  return <input type="number" min="0" step="any" {...props} className={baseInputClass} />;
}

export function TextArea(props) {
  return <textarea {...props} rows={props.rows || 4} className={baseInputClass} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={baseInputClass}>
      {children}
    </select>
  );
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" {...props} />
      {label}
    </label>
  );
}
