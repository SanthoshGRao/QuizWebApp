import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { BlockMath } from 'react-katex';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const clean = String(url).replace(/^\/+/, '');
  return `${API_ORIGIN}/${clean}`;
}

const OPTION_KEYS = ['option1', 'option2', 'option3', 'option4'];

function getOptionLabel(key) {
  const idx = key.replace('option', '');
  return String.fromCharCode(64 + parseInt(idx, 10));
}

export default function ResultPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    apiClient
      .get(`/student/result/${quizId}`)
      .then((res) => setData(res.data))
      .catch(() => addToast('Failed to load result', 'error'))
      .finally(() => setLoading(false));
  }, [quizId, addToast]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-80">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="card px-6 py-8 text-center">
          <p className="text-slate-400">Result not found.</p>
          <button
            type="button"
            onClick={() => navigate('/student/results')}
            className="mt-4 btn-primary text-sm"
          >
            Back to Results
          </button>
        </div>
      </AppLayout>
    );
  }

  const { result, quiz, breakdown } = data;
  const pct = result.total ? Math.round((result.score / result.total) * 1000) / 10 : 0;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="card px-6 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">{quiz?.title} – Result</h1>
            <button
              type="button"
              onClick={() => navigate('/student/results')}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ← Back to Results
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Score" value={`${result.score}/${result.total}`} />
            <Stat label="Correct" value={result.score} />
            <Stat label="Percentage" value={`${pct}%`} />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-slate-200">Answer breakdown</h2>
          {breakdown.map((item, idx) => (
            <div
              key={item.questionId}
              className={`card px-4 py-4 space-y-3 ${
                item.isCorrect ? 'border-green-500/40' : 'border-red-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium ${
                    item.isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-xs text-slate-500">
                  {item.isCorrect ? 'Correct' : 'Wrong'}
                </span>
              </div>
              {item.type === 'comprehension' && item.paragraph && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 whitespace-pre-wrap">
                  {item.paragraph}
                </div>
              )}
              <div className="text-sm text-slate-100">{item.question_text}</div>
              {item.latex && <BlockMath math={item.latex} />}
              {item.image_url && (
                <img
                  src={resolveMediaUrl(item.image_url)}
                  alt="Question"
                  className="max-h-48 rounded-xl border border-slate-800 object-contain"
                />
              )}
              <div className="grid gap-2">
                {OPTION_KEYS.map((key) => {
                  const text = item[key];
                  if (!text) return null;
                  const isCorrectOpt = item.correct_option === key;
                  const isUserOpt = item.user_answer === key;
                  let bg = 'border-slate-800 bg-slate-900/40';
                  if (isCorrectOpt) bg = 'border-green-500/60 bg-green-500/10 text-green-200';
                  else if (isUserOpt && !item.isCorrect) bg = 'border-red-500/60 bg-red-500/10 text-red-200';
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border px-3 py-2 text-xs ${bg}`}
                    >
                      <span className="font-medium">{getOptionLabel(key)}. </span>
                      {text}
                      {isCorrectOpt && <span className="ml-2 text-green-400">✓ Correct answer</span>}
                      {isUserOpt && !item.isCorrect && (
                        <span className="ml-2 text-red-400">← Your answer</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {item.explanation && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
                  <span className="font-medium text-slate-200">Reason: </span>
                  {item.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
