import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/AuthContext.jsx';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [liveQuizzes, setLiveQuizzes] = useState([]);

  useEffect(() => {
    Promise.all([
      apiClient.get('/student/results').then((res) => res.data || []),
      apiClient.get('/quizzes').then((res) => res.data || []),
    ])
      .then(([r, q]) => {
        setResults(r);
        setLiveQuizzes(Array.isArray(q) ? q : []);
      })
      .catch(() => addToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const avgScore = results.length
    ? Math.round((results.reduce((acc, r) => acc + (r.total ? (r.score / r.total) * 100 : 0), 0) / results.length) * 10) / 10
    : 0;

  const lineChartData = results.slice(0, 12).map((r, i) => ({
    name: r.title || 'Quiz',
    shortLabel: String(i + 1),
    score: r.total ? Math.round((r.score / r.total) * 100) : 0,
    raw: `${r.score}/${r.total}`,
  }));

  const availableToTake = liveQuizzes.filter((q) => !q.attempted);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Hi, {user?.name?.split(' ')[0] || 'Student'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track your progress and take quizzes here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 border border-slate-800 rounded-xl px-3 py-2">
              Class <span className="text-slate-100">{user?.class || '-'}</span>
            </div>
            <Link
              to="/student/quizzes"
              className="text-xs px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/30"
            >
              View quizzes
            </Link>
            <Link
              to="/student/results"
              className="text-xs px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800"
            >
              My results
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Completed quizzes" value={results.length} />
          <StatCard label="Average score" value={results.length ? `${avgScore}%` : '-'} />
          <StatCard label="Available now" value={availableToTake.length} />
        </div>

        {availableToTake.length > 0 && (
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-medium text-slate-200">Quizzes available now</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableToTake.map((q) => (
                <button
                  key={q.id}
                  onClick={() => navigate(`/quiz/${q.id}`)}
                  className="text-left rounded-xl border border-slate-800 px-4 py-3 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition"
                >
                  <div className="text-sm font-medium text-slate-100">{q.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Ends {new Date(q.end_time).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-indigo-400 mt-2">Start quiz</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-medium text-slate-200">Score trend</h2>
            <p className="text-[11px] text-slate-500">Your score by quiz (most recent first)</p>
            {loading ? (
              <div className="flex items-center justify-center h-56">
                <Spinner />
              </div>
            ) : lineChartData.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="shortLabel" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9ca3af" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                      formatter={(v, name, props) => [`${v}% (${props.payload.raw})`, props.payload.name]}
                    />
                    <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-500 text-sm">No quiz results yet</div>
            )}
          </div>

          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-medium text-slate-200">Recent results</h2>
            <div className="max-h-56 overflow-auto space-y-2">
              {results.length ? (
                results.slice(0, 8).map((r) => {
                  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
                  return (
                    <Link
                      key={r.id}
                      to={`/result/${r.quiz_id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-xs hover:border-indigo-500/40 hover:bg-slate-800/50 transition"
                    >
                      <span className="text-slate-100 truncate flex-1">{r.title}</span>
                      <span className="ml-2 text-indigo-300 font-mono shrink-0">{r.score}/{r.total} ({pct}%)</span>
                    </Link>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 text-sm">No quizzes taken yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

