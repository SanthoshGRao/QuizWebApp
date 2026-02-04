import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { BlockMath } from 'react-katex';
import { Select } from '../../components/Select.jsx';
import { FileUpload } from '../../components/FileUpload.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { uploadQuestionImage } from '../../utils/imageUpload.js';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const clean = String(url).replace(/^\/+/, '');
  return `${API_ORIGIN}/${clean}`;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'math', label: 'LaTeX Math' },
  { value: 'comprehension', label: 'Comprehension' },
];

export default function AdminQuestionManage() {
  const { quizId } = useParams();
  const { addToast } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm('text'));
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'file' | 'bank'
  const [importTab, setImportTab] = useState('bank');
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSelectedIds, setBankSelectedIds] = useState([]);
  const [bankSearch, setBankSearch] = useState('');
  const [importPreview, setImportPreview] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/quizzes/${quizId}`);
        setQuiz(res.data.quiz);
        setQuestions(res.data.questions || []);
      } catch (err) {
        addToast('Failed to load quiz/questions', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quizId, addToast]);

  useEffect(() => {
    if (activeTab !== 'bank') return;
    const loadBank = async () => {
      setBankLoading(true);
      try {
        const params = {};
        if (bankSearch) params.search = bankSearch;
        const res = await apiClient.get('/bank', { params });
        setBankQuestions(res.data?.questions || []);
      } catch {
        addToast('Failed to load question bank', 'error');
      } finally {
        setBankLoading(false);
      }
    };
    loadBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bankSearch]);

  const onEdit = (q) => {
    setEditing(q.id);
    setForm({
      id: q.id,
      question_text: q.question_text || '',
      type: q.type || 'text',
      paragraph: q.paragraph || '',
      option1: q.option1 || '',
      option2: q.option2 || '',
      option3: q.option3 || '',
      option4: q.option4 || '',
      correct_option: q.correct_option || 'option1',
      latex: q.latex || '',
      explanation: q.explanation || '',
      imageFile: null,
    });
  };

  const onCancelEdit = () => {
    setEditing(null);
    setForm(emptyForm(form.type));
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Client-side guard: ensure all four options are filled
    const options = [form.option1, form.option2, form.option3, form.option4].map((o) =>
      (o || '').trim(),
    );
    if (options.some((o) => !o)) {
      addToast('Please provide text for all 4 options.', 'error');
      return;
    }
    setSaving(true);
    try {
      // Upload image directly to Supabase Storage if present
      let imageUrl = null;
      if (form.imageFile) {
        try {
          imageUrl = await uploadQuestionImage(form.imageFile, quizId);
        } catch (uploadErr) {
          addToast(uploadErr.message || 'Failed to upload image', 'error');
          setSaving(false);
          return;
        }
      }

      // Send JSON payload with image_url instead of FormData
      const payload = {
        question_text: form.question_text,
        type: form.type,
        paragraph: form.paragraph || '',
        option1: form.option1,
        option2: form.option2,
        option3: form.option3,
        option4: form.option4,
        correct_option: form.correct_option,
        latex: form.latex,
        explanation: form.explanation,
        ...(imageUrl && { image_url: imageUrl }),
      };

      if (editing) {
        await apiClient.put(`/quizzes/questions/${editing}`, payload);
        addToast('Question updated', 'success');
      } else {
        await apiClient.post(`/quizzes/${quizId}/questions`, payload);
        addToast('Question created', 'success');
      }

      const res = await apiClient.get(`/quizzes/${quizId}`);
      setQuestions(res.data.questions || []);
      setEditing(null);
      setForm(emptyForm(form.type));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save question', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleBankSelect = (id) => {
    setBankSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAddFromBank = async () => {
    if (!bankSelectedIds.length) {
      addToast('Select at least one question from the bank', 'error');
      return;
    }
    try {
      const res = await apiClient.post(`/quizzes/${quizId}/add-from-bank`, {
        bankQuestionIds: bankSelectedIds,
      });
      const added = res.data?.added ?? bankSelectedIds.length;
      addToast(
        `${added} question${added !== 1 ? 's' : ''} added from bank`,
        'success',
      );
      setBankSelectedIds([]);
      const refreshed = await apiClient.get(`/quizzes/${quizId}`);
      setQuestions(refreshed.data.questions || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add questions from bank', 'error');
    }
  };

  const handleExportQuiz = async () => {
    try {
      const res = await apiClient.get(`/import-export/quiz/${quizId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(quiz?.title || 'quiz').replace(/[^a-z0-9_-]/gi, '_')}_export.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Export started', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    const name = importFile.name || '';
    const lower = name.toLowerCase();
    if (!(/\.(csv|xlsx|xls)$/.test(lower))) {
      addToast('Please select a CSV or Excel file', 'error');
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('target', quizId);
      const res = await apiClient.post('/import-export/questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      addToast(`${res.data.added} added, ${res.data.failed?.length || 0} failed`, res.data.failed?.length ? 'info' : 'success');
      setImportFile(null);
      setImportPreview([]);
      const r = await apiClient.get(`/quizzes/${quizId}`);
      setQuestions(r.data.questions || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/quizzes/questions/${id}`);
      setQuestions((qs) => qs.filter((q) => q.id !== id));
      addToast('Question deleted', 'success');
      setDeleteConfirmId(null);
    } catch (err) {
      addToast('Failed to delete question', 'error');
    }
  };

  const isPublished = !!quiz?.published;

  return (
    <AppLayout>
      {loading ? (
        <div className="flex items-center justify-center min-h-[320px]">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-10 pb-6">
          <header className="border-b border-slate-700/60 pb-6">
            <nav className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <Link to="/admin/quizzes" className="hover:text-indigo-300 transition">
                Quizzes
              </Link>
              <span aria-hidden className="text-slate-600">/</span>
              <span className="text-slate-200 font-medium truncate">{quiz?.title || 'Quiz'}</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">
              Questions
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              {isPublished
                ? 'This quiz is published. Questions cannot be edited or deleted.'
                : 'Add, edit, or reorder questions. You need at least one question to publish.'}
            </p>
          </header>

          {isPublished && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
              Questions cannot be edited or deleted after the quiz is published.
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
            {!isPublished && (
              <div className="card p-6 space-y-5 border-slate-700/80 bg-slate-800/30 shadow-lg shadow-black/20 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 mb-3">
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className={`px-3 py-1.5 rounded-xl border-b-2 ${
                        activeTab === 'manual'
                          ? 'border-indigo-400 text-slate-100'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Add Questions Manually
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('file')}
                      className={`px-3 py-1.5 rounded-xl border-b-2 ${
                        activeTab === 'file'
                          ? 'border-indigo-400 text-slate-100'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Import from CSV / Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bank')}
                      className={`px-3 py-1.5 rounded-xl border-b-2 ${
                        activeTab === 'bank'
                          ? 'border-indigo-400 text-slate-100'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Add from Question Bank
                    </button>
                  </div>
                  {editing && activeTab === 'manual' && (
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="text-xs text-slate-400 hover:text-slate-200 transition px-2 py-1 rounded-lg hover:bg-slate-700/50"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>

                {activeTab === 'manual' && (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {form.type === 'comprehension' && (
                      <Field label="Paragraph">
                        <textarea
                          className="input min-h-[100px] text-[11px] rounded-xl"
                          value={form.paragraph}
                          onChange={(e) => handleChange('paragraph', e.target.value)}
                          placeholder="Enter the comprehension passage/paragraph here."
                          required
                        />
                      </Field>
                    )}
                    <Field label={form.type === 'comprehension' ? 'Question' : 'Question text'}>
                      <textarea
                        className="input min-h-[80px] rounded-xl"
                        value={form.question_text}
                        onChange={(e) => handleChange('question_text', e.target.value)}
                        required
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Type">
                        <Select
                          value={form.type}
                          onChange={(val) => {
                            const t = val || 'text';
                            setForm((f) => ({ ...emptyForm(t), ...f, type: t }));
                          }}
                          options={QUESTION_TYPES}
                          placeholder="Select type"
                        />
                      </Field>
                      <Field label="Correct answer">
                        <Select
                          value={form.correct_option}
                          onChange={(val) => handleChange('correct_option', val)}
                          options={['option1', 'option2', 'option3', 'option4'].map((key) => {
                            const text = (form[key] || '').trim() || `Option ${key.replace('option', '')}`;
                            return {
                              value: key,
                              label: text.length > 60 ? `${text.slice(0, 57)}...` : text,
                            };
                          })}
                          placeholder="Select correct option"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {['option1', 'option2', 'option3', 'option4'].map((key, idx) => (
                        <Field key={key} label={`Option ${idx + 1}`}>
                          <input
                            className="input rounded-xl"
                            value={form[key]}
                            onChange={(e) => handleChange(key, e.target.value)}
                            required
                          />
                        </Field>
                      ))}
                    </div>

                    {form.type === 'image' && (
                      <Field label="Image">
                        <FileUpload
                          accept="image/*"
                          label=""
                          value={form.imageFile}
                          onChange={(file) => {
                            if (file && !file.type.startsWith('image/')) {
                              addToast('Please select a valid image file', 'error');
                              return;
                            }
                            setForm((f) => ({ ...f, imageFile: file || null }));
                          }}
                          hint="PNG, JPG, GIF, WebP"
                        />
                      </Field>
                    )}

                    {form.type === 'math' && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="LaTeX expression">
                          <textarea
                            className="input min-h-[60px] font-mono text-[11px] rounded-xl"
                            value={form.latex}
                            onChange={(e) => handleChange('latex', e.target.value)}
                            placeholder="e.g. E = mc^2"
                          />
                        </Field>
                        <Field label="Preview">
                          <div className="min-h-[60px] rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2.5">
                            {form.latex ? (
                              <SafeTeX latex={form.latex} />
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                Live preview will appear here as you type.
                              </span>
                            )}
                          </div>
                        </Field>
                      </div>
                    )}

                    <Field label="Explanation (optional)">
                      <textarea
                        className="input min-h-[60px] text-[11px] rounded-xl"
                        value={form.explanation}
                        onChange={(e) => handleChange('explanation', e.target.value)}
                        placeholder="Explain why this answer is correct."
                      />
                    </Field>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary px-6 py-2.5 text-sm font-medium rounded-xl"
                      >
                        {saving ? <Spinner /> : editing ? 'Update question' : 'Create question'}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'file' && (
                  <div className="space-y-4 text-xs">
                    <p className="text-slate-400">
                      Import multiple questions at once from a CSV or Excel file. Existing questions are kept;
                      duplicates (same question text and options) are skipped.
                    </p>
                    <div className="flex flex-wrap gap-3 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          const header = 'question_text,option1,option2,option3,option4,correct_option,explanation';
                          const example = 'What is 2+2?,1,2,3,4,option4,Simple math question';
                          const blob = new Blob([[header, example].join('\n')], {
                            type: 'text/csv;charset=utf-8;',
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'quiz_questions_sample.csv';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
                      >
                        Download sample
                      </button>
                      <span className="text-[11px] text-slate-500">
                        Expected columns: question_text, option1–4, correct_option, explanation
                      </span>
                    </div>
                    <form onSubmit={handleImport} className="flex flex-wrap gap-4 items-end">
                      <FileUpload
                        value={importFile}
                        onChange={setImportFile}
                        accept=".xlsx,.xls,.csv"
                        hint="CSV or Excel (.csv, .xlsx, .xls)"
                      />
                      <button
                        type="submit"
                        disabled={!importFile || importing}
                        className="btn-primary px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importing ? <Spinner /> : 'Import'}
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'bank' && (
                  <div className="space-y-3 text-xs">
                    <p className="text-slate-400">
                      Reuse questions from the central Question Bank. Select one or more questions and add them
                      to this quiz.
                    </p>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="w-full md:w-64">
                        <Field label="Search in bank">
                          <input
                            className="input"
                            value={bankSearch}
                            onChange={(e) => setBankSearch(e.target.value)}
                            placeholder="Search bank questions..."
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddFromBank}
                        disabled={!bankSelectedIds.length || bankLoading}
                        className="btn-primary px-4 py-2 text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bankLoading ? <Spinner /> : `Add selected (${bankSelectedIds.length})`}
                      </button>
                    </div>
                    <div className="max-h-72 overflow-auto space-y-2 pr-1">
                      {bankLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Spinner />
                        </div>
                      ) : bankQuestions.length ? (
                        bankQuestions.map((q) => {
                          const checked = bankSelectedIds.includes(q.id);
                          return (
                            <div
                              key={q.id}
                              className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-xs cursor-pointer ${
                                checked
                                  ? 'border-indigo-500/60 bg-indigo-500/10'
                                  : 'border-slate-700/80 bg-slate-900/40 hover:bg-slate-800/50 hover:border-slate-600/80'
                              }`}
                              onClick={() => toggleBankSelect(q.id)}
                            >
                              <input
                                type="checkbox"
                                className="mt-1 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                                checked={checked}
                                onChange={() => toggleBankSelect(q.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-slate-100 text-sm">
                                  {q.question_text?.slice(0, 140)}
                                  {(q.question_text?.length || 0) > 140 ? '…' : ''}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {q.subject && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]">
                                      {q.subject}
                                    </span>
                                  )}
                                  {q.topic && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]">
                                      {q.topic}
                                    </span>
                                  )}
                                  {q.difficulty && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] capitalize bg-slate-800 text-slate-400">
                                      {q.difficulty}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-10 text-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                          No questions in bank yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="card p-6 space-y-4 border-slate-700/80 bg-slate-800/30 shadow-lg shadow-black/20 rounded-2xl">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-indigo-500" />
                Questions <span className="font-normal text-slate-400">({questions.length})</span>
              </h2>
              <div className="space-y-3 max-h-[520px] overflow-auto pr-1 scrollbar-thin">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-700/80 bg-slate-900/50 px-4 py-3.5 space-y-2.5 hover:border-indigo-500/30 hover:bg-slate-900/70 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/25 text-indigo-300 text-xs font-semibold">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-500 capitalize font-medium">{q.type}</span>
                        </div>
                        <div className="text-slate-100 text-sm leading-relaxed">
                          {q.type === 'comprehension' ? (
                            <div className="space-y-2">
                              {!!q.paragraph && (
                                <div className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-300 whitespace-pre-wrap">
                                  {q.paragraph}
                                </div>
                              )}
                              {!!q.question_text && <div>{q.question_text}</div>}
                              {!!q.latex && <SafeTeX latex={q.latex} />}
                            </div>
                          ) : q.type === 'math' ? (
                            <div className="space-y-2">
                              {!!q.question_text && <div>{q.question_text}</div>}
                              {!!q.latex && <SafeTeX latex={q.latex} />}
                            </div>
                          ) : (
                            q.question_text
                          )}
                        </div>
                      </div>
                      {!isPublished && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEdit(q)}
                          className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-600 text-xs font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(q.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300/90 hover:bg-red-500/15 text-xs font-medium transition"
                        >
                          Delete
                        </button>
                      </div>
                      )}
                    </div>
                    {q.type === 'image' && q.image_url && (
                      <div className="mt-2">
                        <img
                          src={resolveMediaUrl(q.image_url)}
                          alt="Question"
                          className="max-h-28 rounded-lg border border-slate-700 object-contain"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['option1', 'option2', 'option3', 'option4'].map((key) => (
                        <div
                          key={key}
                          className={`text-xs px-3 py-2 rounded-lg border ${
                            q.correct_option === key
                              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                              : 'border-slate-700/80 bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          {q[key]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {questions.length === 0 && (
                  <div className="py-14 text-center text-slate-500 text-sm rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/30">
                    No questions yet. Add one with the form above or import from Excel/CSV at the bottom of the page.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteConfirmId}
        title="Delete question"
        message="Delete this question? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </AppLayout>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function emptyForm(type) {
  return {
    question_text: '',
    type,
    paragraph: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_option: 'option1',
    latex: '',
    explanation: '',
    imageFile: null,
  };
}

// Simple guard around TeX to prevent malformed LaTeX from breaking the UI
function SafeTeX({ latex }) {
  if (!latex) return null;
  try {
    return <BlockMath math={latex} />;
  } catch (e) {
    return (
      <span className="text-[11px] text-red-400">
        Invalid LaTeX expression
      </span>
    );
  }
}

