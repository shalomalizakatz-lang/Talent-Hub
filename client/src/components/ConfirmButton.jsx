import { useState } from 'react';

export function ConfirmButton({ onConfirm, children, className, confirmText = 'Are you sure?' }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="text-slate-500">{confirmText}</span>
        <button
          type="button"
          className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          Confirm
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button type="button" className={className} onClick={() => setConfirming(true)}>
      {children}
    </button>
  );
}
