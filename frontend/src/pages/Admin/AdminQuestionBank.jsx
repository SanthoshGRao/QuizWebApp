import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../state/ToastContext.jsx';
import { Spinner } from '../../components/Loading.jsx';
import { Select } from '../../components/Select.jsx';
import { FileUpload } from '../../components/FileUpload.jsx';

export default function AdminQuestionBank() {
  const { addToast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [cloneQuizId, setCloneQuizId] = useState('');
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (subject) params.subject = subject;
    if (topic) params.topic = topic;
    if (difficulty) params.difficulty = difficulty;
    apiClient
      .get('/bank', { params })
      .then((r) => {
        setQuestions(r.data.questions || []);
      })
      .catch(() => addToast('Failed to load bank', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiClient.get('/quizzes').then((r) => setQuizzes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [subject, topic, difficulty]);

  const handleSearch = () => load();

  const handleClone = async (bankId) => {
    if (!cloneQuizId) {
      addToast('Select a quiz first', 'error');
      return;
    }
    try {
      await apiClient.post(`/bank/${bankId}/clone`, { quizId: cloneQuizId });
      addToast('Question added to quiz', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Clone failed', 'error');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('target', 'bank');
      const res = await apiClient.post('/import-export/questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      addToast(`${res.data.added} added, ${res.data.failed?.length || 0} failed`, res.data.failed?.length ? 'info' : 'success');
      setFile(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">
            Question Bank
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse, filter, and add questions to quizzes
          </p>
        </header>

        <section className="card border-slate-700/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/40">
            <div className="flex flex-wrap gap-3 items-center">
              <input
                className="input max-w-[220px] text-sm"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm font-medium transition"
              >
                Search
              </button>
              <Select
                value={subject}
                onChange={setSubject}
                options={[{ value: '', label: 'All subjects' }]}
              />
              <Select
                value={difficulty}
                onChange={setDifficulty}
                options={[
                  { value: '', label: 'All difficulty' },
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
              <Select
                value={cloneQuizId}
                onChange={setCloneQuizId}
                options={[
                  { value: '', label: 'Add to quiz…' },
                  ...quizzes.map((q) => ({ value: q.id, label: q.title })),
                ]}
              />
              <button
                type="button"
                onClick={() => setShowImport(!showImport)}
                className="ml-auto px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm transition"
              >
                {showImport ? 'Hide import' : 'Import Excel/CSV'}
              </button>
            </div>
          </div>

          {showImport && (
            <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/20">
              <p className="text-xs text-slate-500 mb-3">
                Expected columns: <code>question_text</code>, <code>option1</code>–
                <code>option4</code>, <code>correct_option</code>, <code>subject</code>,{' '}
                <code>topic</code>, <code>difficulty</code>
              </p>
              <div className="flex flex-wrap gap-3 items-end mb-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const header =
                      'question_text,option1,option2,option3,option4,correct_option,subject,topic,difficulty';
                    const example =
                      'What is 2+2?,1,2,3,4,option4,Math,Numbers,easy';
                    const blob = new Blob([[header, example].join('\n')], {
                      type: 'text/csv;charset=utf-8;',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'question_bank_sample.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
                >
                  Download sample
                </button>
              </div>
              <form onSubmit={handleImport} className="flex flex-wrap gap-3 items-end">
                <FileUpload
                  value={file}
                  onChange={setFile}
                  accept=".xlsx,.xls,.csv"
                  hint=".xlsx, .csv"
                />
                <button
                  type="submit"
                  disabled={!file || importing}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {importing ? <Spinner /> : 'Import'}
                </button>
              </form>
            </div>
          )}

          <div className="p-4 md:p-5">
            {loading ? (
              <div className="flex justify-center py-20">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-800/40 hover:border-slate-700/80 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-100 leading-relaxed">
                        {q.question_text?.slice(0, 160)}
                        {(q.question_text?.length || 0) > 160 ? '…' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {q.subject && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs">
                            {q.subject}
                          </span>
                        )}
                        {q.topic && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs">
                            {q.topic}
                          </span>
                        )}
                        {q.difficulty && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs ${
                              q.difficulty === 'easy'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : q.difficulty === 'hard'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-indigo-500/20 text-indigo-300'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClone(q.id)}
                      disabled={!cloneQuizId}
                      className="shrink-0 px-4 py-2 rounded-xl border border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/20 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add to quiz
                    </button>
                  </div>
                ))}
                {questions.length === 0 && (
                  <div className="py-16 text-center text-slate-500 text-sm rounded-xl border border-dashed border-slate-700">
                    No questions in bank. Use Import Excel/CSV or add questions from Quizzes.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
