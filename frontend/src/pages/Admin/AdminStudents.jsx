import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client.js';
import { AppLayout } from '../../components/Layout.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { Spinner } from '../../components/Loading.jsx';
import { FileUpload } from '../../components/FileUpload.jsx';
import { Modal } from '../../components/Modal.jsx';

export default function AdminStudents() {
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ firstname: '', middlename: '', lastname: '', email: '', className: '' });
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState('manage');
  const [bulkResult, setBulkResult] = useState({
    open: false,
    added: 0,
    addedStudents: [],
    skipped: [],
    failed: [],
  });
  const [performanceModal, setPerformanceModal] = useState({ open: false, data: null, loading: false });
  const [bulkFailedTab, setBulkFailedTab] = useState(false);

  const load = () => {
    setLoading(true);
    apiClient
      .get('/students', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
        },
      })
      .then((res) => {
        setStudents(res.data.data);
        setTotal(res.data.total || 0);
      })
      .catch(() => addToast('Failed to load students', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const request = apiClient.post('/students', form);
    // Attach a noop catch so if we time out, the eventual rejection doesn't surface as unhandled
    request.catch(() => {});
    const timeoutMs = 15000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs),
    );
    try {
      const res = await Promise.race([request, timeoutPromise]);
      addToast('Student created. Reset email sent if possible.', 'success');
      if (res.data?.emailNotice) {
        addToast(res.data.emailNotice, 'error');
      }
      setForm({ firstname: '', middlename: '', lastname: '', email: '', className: '' });
      load();
    } catch (err) {
      if (err?.message === 'timeout') {
        addToast('Upload completed, but response delayed. Refresh list.', 'warning');
      } else {
        addToast(err.response?.data?.message || 'Failed to create student', 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    if (!file) return;
    setCreating(true);
    const fd = new FormData();
    fd.append('file', file);
    const request = apiClient.post('/students/bulk', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Attach a noop catch so if we time out, the eventual rejection doesn't surface as unhandled
    request.catch(() => {});
    const timeoutMs = 15000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs),
    );
    try {
      const res = await Promise.race([request, timeoutPromise]);
      const added = res.data?.added ?? 0;
      const skipped = Array.isArray(res.data?.skipped) ? res.data.skipped : [];
      const failed = Array.isArray(res.data?.failed) ? res.data.failed : [];
      const addedStudents = Array.isArray(res.data?.addedStudents) ? res.data.addedStudents : [];
      setFile(null);
      load();
      setBulkResult({ open: true, added, addedStudents, skipped, failed });
      addToast(
        `${added} student${added !== 1 ? 's' : ''} added, ${skipped.length} skipped, ${failed.length} failed`,
        failed.length ? 'error' : 'success',
      );
      setBulkFailedTab(failed.length > 0);
    } catch (err) {
      if (err?.message === 'timeout') {
        addToast('Upload completed, but response delayed. Refresh list.', 'warning');
      } else {
        const data = err.response?.data || {};
        const added = data.added ?? 0;
        const skipped = Array.isArray(data.skipped) ? data.skipped : [];
        const failed = Array.isArray(data.failed) ? data.failed : [];
        const addedStudents = Array.isArray(data.addedStudents) ? data.addedStudents : [];
        if (Array.isArray(failed) || Array.isArray(skipped) || Array.isArray(addedStudents)) {
          setBulkResult({ open: true, added, addedStudents, skipped, failed });
          setBulkFailedTab(true);
        } else {
          addToast(err.response?.data?.message || 'Bulk upload failed', 'error');
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const openPerformance = async (studentId) => {
    setPerformanceModal({ open: true, data: null, loading: true });
    try {
      const res = await apiClient.get(`/admin/students/${studentId}/performance`);
      setPerformanceModal({ open: true, data: res.data, loading: false });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load performance', 'error');
      setPerformanceModal((p) => ({ ...p, loading: false }));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Students</h1>
        <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-2 border-b-2 ${
              activeTab === 'manage'
                ? 'border-indigo-400 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Manage students
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3 py-2 border-b-2 ${
              activeTab === 'list'
                ? 'border-indigo-400 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Students list
          </button>
        </div>

        {activeTab === 'manage' && (
          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={handleCreate} className="card px-4 py-4 space-y-3 text-xs">
              <div className="font-medium text-slate-100">Add single student</div>
              <Field label="First name">
                <input
                  className="input"
                  value={form.firstname}
                  onChange={(e) => setForm({ ...form, firstname: e.target.value })}
                  required
                />
              </Field>
              <Field label="Middle name (optional)">
                <input
                  className="input"
                  value={form.middlename}
                  onChange={(e) => setForm({ ...form, middlename: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Last name">
                <input
                  className="input"
                  value={form.lastname}
                  onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
              <Field label="Class">
                <input
                  className="input"
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                  placeholder="e.g. Grade 10A"
                  required
                />
              </Field>
              <button type="submit" disabled={creating} className="btn-primary w-full mt-2">
                {creating ? <Spinner /> : 'Create'}
              </button>
            </form>
            <form onSubmit={handleBulk} className="card px-4 py-4 space-y-3 text-xs">
              <div className="font-medium text-slate-100">Bulk upload (CSV)</div>
              <p className="text-[11px] text-slate-400">
                File should contain <code>firstname</code>, <code>middlename</code> (optional), <code>lastname</code>, <code>email</code>, <code>class</code>.
                Initial password will be lowercase firstname+middlename+lastname (no spaces).
              </p>
              <FileUpload
                accept=".csv"
                label="CSV file"
                value={file}
                onChange={setFile}
                hint="Accepts .csv files"
              />
              <button
                type="submit"
                disabled={creating || !file}
                className="btn-primary w-full mt-2"
              >
                {creating ? <Spinner /> : 'Upload'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'list' && (
          <>
            <div className="card px-4 py-4 space-y-3 text-xs">
              <Field label="Search">
                <input
                  className="input"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Search name or email"
                />
              </Field>
            </div>
            <div className="card px-4 py-4">
              <div className="flex items-center justify-between text-xs mb-3">
                <div className="font-medium text-slate-100">Students list</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>
                    Page {page} of {Math.max(1, Math.ceil((total || 0) / 10))}
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
                        const maxPage = Math.max(1, Math.ceil((total || 0) / 10));
                        setPage((p) => Math.min(maxPage, p + 1));
                      }}
                      disabled={page >= Math.max(1, Math.ceil((total || 0) / 10))}
                      className="px-2 py-1 disabled:opacity-40 hover:bg-slate-800 border-l border-slate-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {students.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 px-3 py-2 hover:border-indigo-500/40 transition cursor-pointer"
                      onClick={() => openPerformance(s.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openPerformance(s.id)}
                    >
                      <div>
                        <div className="text-slate-100 font-medium">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.email}</div>
                      </div>
                      <div className="text-[11px] text-slate-400">Class {s.class}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Bulk upload result modal */}
        <Modal
          open={bulkResult.open}
          onClose={() => setBulkResult((r) => ({ ...r, open: false }))}
          title="Bulk upload result"
          footer={
            <button
              type="button"
              onClick={() => setBulkResult((r) => ({ ...r, open: false }))}
              className="px-4 py-2 rounded-xl border border-indigo-500/70 text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 transition"
            >
              Done
            </button>
          }
        >
          <div className="space-y-4 text-[11px]">
            <p className="text-emerald-300 font-medium">
              {bulkResult.added} student{bulkResult.added !== 1 ? 's' : ''} added,{' '}
              {bulkResult.skipped.length} skipped, {bulkResult.failed.length} failed.
            </p>
            <div className="flex gap-2 border-b border-slate-700 mb-2">
              <button
                type="button"
                onClick={() => setBulkFailedTab(false)}
                className={`px-2 py-1 ${!bulkFailedTab ? 'text-indigo-300 border-b-2 border-indigo-400' : 'text-slate-400'}`}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setBulkFailedTab(true)}
                className={`px-2 py-1 ${bulkFailedTab ? 'text-indigo-300 border-b-2 border-indigo-400' : 'text-slate-400'}`}
              >
                Failed ({bulkResult.failed.length})
              </button>
            </div>
            {!bulkFailedTab ? (
              <div className="space-y-3">
                {bulkResult.addedStudents.length > 0 && (
                  <div>
                    <div className="text-slate-300 font-medium mb-1">Added students</div>
                    <div className="max-h-32 overflow-auto space-y-1">
                      {bulkResult.addedStudents.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 flex justify-between"
                        >
                          <span className="text-slate-100 text-[11px]">{s.name || s.email}</span>
                          <span className="text-slate-400 text-[10px]">{s.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {bulkResult.skipped.length > 0 && (
                  <div>
                    <div className="text-slate-300 font-medium mb-1">Skipped (duplicates)</div>
                    <div className="max-h-24 overflow-auto space-y-1">
                      {bulkResult.skipped.map((s, i) => (
                        <div
                          key={`${s.email || i}`}
                          className="rounded-lg border border-slate-600/60 bg-slate-900/60 px-2 py-1"
                        >
                          <span className="text-slate-200">{s.name || s.email}</span>
                          {s.email && <span className="text-slate-500"> ({s.email})</span>}
                          {s.reason && <div className="text-slate-400 mt-0.5">{s.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {bulkResult.failed.length === 0 && bulkResult.skipped.length === 0 && bulkResult.addedStudents.length === 0 && (
                  <p className="text-slate-400">No details available.</p>
                )}
              </div>
            ) : (
              <div className="max-h-48 overflow-auto space-y-2">
                {bulkResult.failed.map((f, i) => (
                  <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/5 px-2 py-1.5">
                    <span className="text-slate-200">{f.name || f.email || 'Row ' + (i + 1)}</span>
                    {f.email && f.email !== (f.name || '') && <span className="text-slate-500"> ({f.email})</span>}
                    <div className="text-red-300/90 mt-0.5">{f.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>

        {/* Student performance modal */}
        <Modal
          open={performanceModal.open}
          onClose={() => setPerformanceModal({ open: false, data: null, loading: false })}
          title={performanceModal.data ? performanceModal.data.student?.name : 'Student performance'}
          footer={
            <button
              type="button"
              onClick={() => setPerformanceModal({ open: false, data: null, loading: false })}
              className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
            >
              Close
            </button>
          }
        >
          {performanceModal.loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : performanceModal.data ? (
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Performance &amp; results</div>
                {performanceModal.data.performance?.length ? (
                  <div className="space-y-2">
                    {performanceModal.data.performance.map((r) => (
                      <div key={r.id} className="flex justify-between rounded-lg border border-slate-700 px-3 py-2">
                        <span className="text-slate-200">{r.title}</span>
                        <span className="text-indigo-300">{r.score} / {r.total}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No quizzes attempted yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
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

