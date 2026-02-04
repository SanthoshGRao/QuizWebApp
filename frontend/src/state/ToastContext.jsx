import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 space-y-2 z-[100] pointer-events-none flex flex-col items-end">
        {toasts.map((t) => {
          const style =
            t.type === 'error'
              ? 'border-red-500/50 bg-red-950/40 text-red-100 shadow-lg shadow-red-500/10'
              : t.type === 'success'
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-100 shadow-lg shadow-emerald-500/10'
                : 'border-indigo-500/50 bg-slate-900/95 text-slate-100 shadow-lg shadow-indigo-500/10';
          return (
            <div
              key={t.id}
              className={`rounded-xl border px-4 py-3 text-sm backdrop-blur-sm max-w-sm ${style}`}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

