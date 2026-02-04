import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { AppLayout } from '../../components/Layout.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { Spinner } from '../../components/Loading.jsx';
import { Select } from '../../components/Select.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { DateTimePicker } from '../../components/DateTimePicker.jsx';

const nowIso = () => new Date().toISOString();

export default function AdminQuizzes() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [quizListTab, setQuizListTab] = useState('active');
  const [confirmPublish, setConfirmPublish] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({
    title: '',
    className: '',
    start_time: '',
    end_time: '',
  });

  const loadClasses = () => {
    apiClient
      .get('/admin/classes')
      .then((res) => setClasses(res.data.classes || []))
      .catch(() => {
        // Non-fatal: quiz class dropdown will just be empty if this fails
      });
  };

  const load = () => {
    setLoading(true);
    apiClient
      .get('/quizzes')
      .then((res) => setQuizzes(res.data))
      .catch(() => addToast('Failed to load quizzes', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadClasses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(form.start_time) >= new Date(form.end_time)) {
      addToast('End time must be after start time', 'error');
      return;
    }

    setCreating(true);
    try {
      // Convert datetime-local (local time) to ISO UTC so backend stores correct instant
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };
      if (editingId) {
        await apiClient.put(`/admin/quizzes/${editingId}`, payload);
        addToast('Quiz updated', 'success');
      } else {
        await apiClient.post('/quizzes', payload);
        addToast('Quiz created', 'success');
      }
      setForm({
        title: '',
        className: '',
        start_time: '',
        end_time: '',
      });
      setEditingId(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save quiz', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (quiz) => {
    const toInputDateTime = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
      )}:${pad(d.getMinutes())}`;
    };
    setEditingId(quiz.id);
    setForm({
      title: quiz.title || '',
      className: quiz.class || '',
      start_time: toInputDateTime(quiz.start_time),
      end_time: toInputDateTime(quiz.end_time),
    });
  };

  const handlePublishNow = async (quiz) => {
    try {
      await apiClient.post(`/admin/quizzes/${quiz.id}/publish-now`);
      addToast('Quiz published and live now', 'success');
      setConfirmPublish(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to publish', 'error');
    }
  };

  const handleDelete = async (quiz) => {
    try {
      await apiClient.delete(`/admin/quizzes/${quiz.id}`);
      addToast('Quiz deleted', 'success');
      if (editingId === quiz.id) {
        setEditingId(null);
        setForm({
          title: '',
          className: '',
          start_time: '',
          end_time: '',
        });
      }
      setConfirmDelete(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete quiz', 'error');
    }
  };

  const handleExportExcel = async (quiz) => {
    try {
      const res = await apiClient.get(`/admin/quizzes/${quiz.id}/export`, { responseType: 'blob' });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(quiz.title || 'quiz').replace(/[^a-z0-9_-]/gi, '_')}_${(quiz.class || 'class').replace(/[^a-z0-9_-]/gi, '_')}_results.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast('Download started', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Download failed', 'error');
    }
  };

  const activeQuizzes = quizzes.filter((q) => new Date(q.end_time) > new Date());
  const finishedQuizzes = quizzes.filter((q) => new Date(q.end_time) <= new Date());

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Quizzes</h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="card px-4 py-4 grid gap-3 md:grid-cols-5 items-end text-xs"
        >
          <Field label="Title">
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Class">
            <Select
              value={form.className}
              onChange={(val) => setForm({ ...form, className: val })}
              options={classes.map((c) => ({ value: c, label: c }))}
              placeholder="Select class"
            />
          </Field>
          <Field label="Start time">
            <DateTimePicker
              value={form.start_time}
              onChange={(v) => setForm({ ...form, start_time: v })}
              min={nowIso().slice(0, 16)}
              required
            />
          </Field>
          <Field label="End time">
            <DateTimePicker
              value={form.end_time}
              onChange={(v) => setForm({ ...form, end_time: v })}
              min={form.start_time || nowIso().slice(0, 16)}
              required
            />
          </Field>
          <div className="flex flex-col gap-2">
            <button type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? <Spinner /> : editingId ? 'Update quiz' : 'Create quiz'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    title: '',
                    className: '',
                    start_time: '',
                    end_time: '',
                  });
                }}
                className="w-full text-[11px] text-slate-400 hover:text-slate-200 mt-1"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
        <div className="flex gap-2 border-b border-slate-800 text-xs mb-4">
          <button
            type="button"
            onClick={() => setQuizListTab('active')}
            className={`px-3 py-2 border-b-2 ${quizListTab === 'active' ? 'border-indigo-400 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setQuizListTab('finished')}
            className={`px-3 py-2 border-b-2 ${quizListTab === 'finished' ? 'border-indigo-400 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Finished
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(quizListTab === 'active' ? activeQuizzes : finishedQuizzes).map((q) => {
              const scheduleNotStarted = new Date(q.start_time) > new Date();
              const scheduleEnded = new Date(q.end_time) <= new Date();
              const canEditOrDelete = scheduleNotStarted || scheduleEnded;
              return (
              <div
                key={q.id}
                className="card px-4 py-3 space-y-2 text-sm text-left hover:border-indigo-500/40 hover:-translate-y-0.5 transition"
              >
                <div className="font-medium text-slate-100">{q.title}</div>
                <div className="text-xs text-slate-400 flex justify-between flex-wrap gap-1">
                  <span>Class: {q.class}</span>
                  <span>{q.published ? 'Published' : 'Draft'}</span>
                  <span>{typeof q.question_count === 'number' ? `${q.question_count} question${q.question_count !== 1 ? 's' : ''}` : ''}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {new Date(q.start_time).toLocaleString()} –{' '}
                  {new Date(q.end_time).toLocaleString()}
                </div>
                <div className="flex items-center justify-between pt-2 text-[11px] flex-wrap gap-2">
                  {scheduleNotStarted && !q.published && (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/quizzes/${q.id}/questions`)}
                      className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800"
                    >
                      Manage questions
                    </button>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {scheduleNotStarted && !q.published && (
                      <button
                        type="button"
                        onClick={() => (q.question_count > 0 ? setConfirmPublish(q) : addToast('Add at least one question to publish.', 'error'))}
                        className={`px-2 py-1 rounded-lg border ${(q.question_count ?? 0) > 0 ? 'border-green-500/70 text-green-300 hover:bg-green-500/10' : 'border-slate-600 text-slate-500 cursor-not-allowed'}`}
                        title={(q.question_count ?? 0) === 0 ? 'Add questions first' : 'Publish now'}
                      >
                        Publish now
                      </button>
                    )}
                    {quizListTab === 'active' && canEditOrDelete && (
                      <button
                        type="button"
                        onClick={() => handleEdit(q)}
                        className="px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800"
                      >
                        Edit
                      </button>
                    )}
                    {quizListTab === 'active' && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(q)}
                        className="px-2 py-1 rounded-lg border border-red-500/70 text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    )}
                    {quizListTab === 'finished' && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(q)}
                        className="px-2 py-1 rounded-lg border border-red-500/70 text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    )}
                    {quizListTab === 'finished' && (
                      <button
                        type="button"
                        onClick={() => handleExportExcel(q)}
                        className="px-2 py-1 rounded-lg border border-indigo-500/70 text-indigo-300 hover:bg-indigo-500/10"
                      >
                        Download result
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        <ConfirmModal
          open={!!confirmPublish}
          title="Publish quiz"
          message={confirmPublish ? `Publish "${confirmPublish.title}" now? It will become live immediately.` : ''}
          confirmLabel="Publish"
          cancelLabel="Cancel"
          variant="primary"
          onConfirm={() => confirmPublish && confirmPublish.question_count > 0 && handlePublishNow(confirmPublish)}
          onCancel={() => setConfirmPublish(null)}
        />
        <ConfirmModal
          open={!!confirmDelete}
          title="Delete quiz"
          message={confirmDelete ? `Are you sure you want to delete "${confirmDelete.title}"?\n${new Date(confirmDelete.end_time) > new Date() ? 'This quiz is currently active. Deleting it will remove it immediately and students will no longer be able to access it.' : 'This action cannot be undone.'}` : ''}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
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

