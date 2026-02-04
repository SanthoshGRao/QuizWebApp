import React from 'react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="card px-6 py-4 flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-indigo-400 animate-ping" />
        <span className="text-sm text-slate-200">Loading session…</span>
      </div>
    </div>
  );
}

export function Spinner() {
  return <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />;
}

