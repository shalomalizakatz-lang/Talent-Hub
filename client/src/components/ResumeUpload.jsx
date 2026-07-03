import { useRef, useState } from 'react';

const ACCEPTED = '.pdf,.doc,.docx';
const MAX_BYTES = 10 * 1024 * 1024;

export function ResumeUpload({ currentFileName, currentFileUrl, onUpload, onRemove, uploading }) {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');
  const inputRef = useRef(null);

  function validateAndUpload(file) {
    setLocalError('');
    if (!file) return;
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setLocalError('File must be a PDF, DOC, or DOCX');
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError('File must be 10MB or smaller');
      return;
    }
    onUpload(file);
  }

  return (
    <div>
      {currentFileName ? (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <a
            href={currentFileUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-indigo-600 hover:underline"
          >
            📄 {currentFileName}
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-slate-500 hover:underline"
            >
              Replace
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-xs font-medium text-rose-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            validateAndUpload(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-center text-sm ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 text-slate-500'
          }`}
        >
          {uploading ? 'Uploading…' : 'Drag & drop a resume here, or click to choose a file'}
          <span className="mt-1 text-xs text-slate-400">PDF, DOC, or DOCX — up to 10MB</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => validateAndUpload(e.target.files?.[0])}
      />
      {localError && <p className="mt-1 text-xs text-rose-600">{localError}</p>}
    </div>
  );
}
