import React, { useEffect } from 'react';

const backdropClass =
  'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
const panelClass =
  'bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col min-w-[320px] max-w-lg w-full';

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onEscape = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={backdropClass}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="px-5 py-4 border-b border-slate-700/80">
            <h2 id="modal-title" className="text-base font-semibold text-slate-100">
              {title}
            </h2>
          </div>
        )}
        <div className="px-5 py-4 overflow-auto flex-1 text-sm text-slate-300">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4 border-t border-slate-700/80 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  const isDanger = variant === 'danger';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => { onConfirm?.(); onCancel?.(); }}
            className={`px-4 py-2 rounded-xl border transition ${
              isDanger
                ? 'border-red-500/70 text-red-200 bg-red-500/20 hover:bg-red-500/30'
                : 'border-indigo-500/70 text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30'
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="whitespace-pre-wrap">{message}</p>
    </Modal>
  );
}

export function AlertModal({ open, title, message, buttonLabel = 'OK', onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-indigo-500/70 text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 transition"
        >
          {buttonLabel}
        </button>
      }
    >
      <p className="whitespace-pre-wrap">{message}</p>
    </Modal>
  );
}
