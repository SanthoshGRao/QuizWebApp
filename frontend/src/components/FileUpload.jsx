import React, { useRef, useEffect, useState } from 'react';

/**
 * Beautified file upload component with drag-and-drop zone.
 * - accept: e.g. "image/*" or ".csv"
 * - label: e.g. "Upload CSV" or "Upload image"
 * - value: File | null
 * - onChange: (file) => void
 */
export function FileUpload({ accept, label, value, onChange, hint }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (value?.type?.startsWith('image/')) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [value]);

  const handleBrowseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0] || null;
    onChange?.(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0] || null;
    if (file) onChange?.(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const fileName = value?.name || '';
  const hasFile = !!value;

  return (
    <div className="space-y-1">
      {label && <div className="text-[11px] text-slate-400">{label}</div>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          flex flex-col items-center justify-center min-h-[120px] rounded-xl border-2 border-dashed
          transition-all duration-200
          ${hasFile
            ? 'border-indigo-500/60 bg-indigo-500/5'
            : 'border-slate-600 bg-slate-900/40'
          }
        `}
      >
        {hasFile ? (
          <div className="flex flex-col items-center gap-1 px-4 py-3">
            {value?.type?.startsWith('image/') && previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-24 max-w-[200px] rounded-lg border border-slate-700 object-contain"
              />
            ) : (
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span className="text-sm text-slate-200 font-medium truncate max-w-[200px]">{fileName}</span>
            <button
              type="button"
              onClick={handleBrowseClick}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 mt-1"
            >
              Choose another file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-3">
            <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-slate-400">Drag file here or</span>
            <button
              type="button"
              onClick={handleBrowseClick}
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 text-sm hover:bg-slate-800 transition"
            >
              Browse
            </button>
            {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
