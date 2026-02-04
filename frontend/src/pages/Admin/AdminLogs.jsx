import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client.js';
import { AppLayout } from '../../components/Layout.jsx';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { Select } from '../../components/Select.jsx';

export default function AdminLogs() {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    status: '',
    userId: '',
    search: '',
  });

  useEffect(() => {
    setLoading(true);
    apiClient
      .get('/admin/logs', {
        params: {
          page,
          limit: 20,
          from: filters.from || undefined,
          to: filters.to || undefined,
          status: filters.status || undefined,
          userId: filters.userId || undefined,
          search: filters.search || undefined,
        },
      })
      .then((res) => {
        setLogs(res.data.data);
        setTotal(res.data.total || 0);
      })
      .catch(() => addToast('Failed to load logs', 'error'))
      .finally(() => setLoading(false));
  }, [addToast, page, filters.from, filters.to, filters.status, filters.userId, filters.search]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Activity logs</h1>
        <div className="card px-4 py-4 text-xs space-y-3">
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="From">
              <input
                type="date"
                className="input"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                className="input"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={filters.status}
                onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
                options={[
                  { value: '', label: 'Any status' },
                  { value: 'success', label: 'Success' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'info', label: 'Info' },
                ]}
                placeholder="Any status"
              />
            </Field>
            <Field label="User ID">
              <input
                className="input"
                value={filters.userId}
                onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                placeholder="Filter by user id"
              />
            </Field>
            <Field label="Search">
              <input
                className="input"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search action or IP"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() =>
                setFilters({ from: '', to: '', status: '', userId: '', search: '' })
              }
              className="hover:text-slate-200"
            >
              Clear filters
            </button>
            <div className="flex items-center gap-2">
              <span>
                Page {page} of {Math.max(1, Math.ceil((total || 0) / 20))}
              </span>
              <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 disabled:opacity-40 hover:bg-slate-800"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const maxPage = Math.max(1, Math.ceil((total || 0) / 20));
                    setPage((p) => Math.min(maxPage, p + 1));
                  }}
                  disabled={page >= Math.max(1, Math.ceil((total || 0) / 20))}
                  className="px-2 py-1 disabled:opacity-40 hover:bg-slate-800 border-l border-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card px-4 py-4 text-xs space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          ) : (
            logs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between border-b border-slate-800/60 last:border-0 py-2"
              >
                <div>
                  <div className="text-slate-200">{l.action}</div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(l.created_at).toLocaleString()} · {l.ip}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-[10px] ${
                    l.status === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : l.status === 'failed'
                      ? 'bg-red-500/10 text-red-300'
                      : 'bg-sky-500/10 text-sky-300'
                  }`}
                >
                  {l.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-slate-400">{label}</div>
      {children}
    </div>
  );
}

