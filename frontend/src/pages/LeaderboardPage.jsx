import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/Layout.jsx';
import { apiClient } from '../api/client.js';
import { useToast } from '../state/ToastContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { Spinner } from '../components/Loading.jsx';
import { Select } from '../components/Select.jsx';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [quizId, setQuizId] = useState('');
  const [className, setClassName] = useState(user?.class || '');

  useEffect(() => {
    apiClient.get('/leaderboard/classes').then((r) => setClasses(r.data.classes || [])).catch(() => {});
    apiClient.get('/leaderboard/quizzes').then((r) => setQuizzes(r.data.quizzes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!quizId && !className) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = {};
    if (quizId) params.quizId = quizId;
    if (className) params.className = className;
    apiClient
      .get('/leaderboard', { params })
      .then((r) => setLeaderboard(r.data.leaderboard || []))
      .catch(() => addToast('Failed to load leaderboard', 'error'))
      .finally(() => setLoading(false));
  }, [quizId, className, addToast]);

  const handleExport = async () => {
    if (!quizId && !className) {
      addToast('Select quiz or class first', 'error');
      return;
    }
    try {
      const params = {};
      if (quizId) params.quizId = quizId;
      if (className) params.className = className;
      const res = await apiClient.get('/leaderboard/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leaderboard_${quizId || className || 'export'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Download started', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={quizId}
              onChange={setQuizId}
              options={[{ value: '', label: 'All quizzes' }, ...quizzes.map((q) => ({ value: q.id, label: q.title }))]}
              placeholder="Quiz"
            />
            <Select
              value={className}
              onChange={setClassName}
              options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c, label: c }))]}
              placeholder="Class"
            />
            {user?.role === 'admin' && (
              <button onClick={handleExport} className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs">
                Export CSV
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="card p-12 text-center text-slate-500">No data. Select a quiz or class.</div>
        ) : (
          <>
            <div className="card p-6">
              <div className="flex items-end justify-center gap-4 md:gap-8 pb-4">
                {top3[1] && (
                  <PodiumSlot rank={2} name={top3[1].name} score={top3[1].percentage} className="order-2" />
                )}
                {top3[0] && (
                  <PodiumSlot rank={1} name={top3[0].name} score={top3[0].percentage} className="order-1 h-32" />
                )}
                {top3[2] && (
                  <PodiumSlot rank={3} name={top3[2].name} score={top3[2].percentage} className="order-3" />
                )}
              </div>
            </div>
            <div className="card p-4">
              <div className="space-y-2">
                {rest.map((r) => (
                  <div
                    key={r.userId}
                    className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-2 text-sm"
                  >
                    <span className="text-slate-400 w-8">#{r.rank}</span>
                    <span className="text-slate-100 flex-1">{r.name}</span>
                    {r.class && <span className="text-slate-500 text-xs">{r.class}</span>}
                    <span className="text-indigo-300 font-mono ml-2">{r.score}/{r.total} ({r.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function PodiumSlot({ rank, name, score, className = '' }) {
  const colors = { 1: 'from-amber-500/30 to-amber-600/10 border-amber-500/50', 2: 'from-slate-400/30 to-slate-500/10 border-slate-400/50', 3: 'from-amber-700/30 to-amber-800/10 border-amber-700/50' };
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`rounded-t-xl border px-6 py-2 bg-gradient-to-b ${colors[rank] || ''}`}>
        <div className="text-xs font-medium text-slate-200">{name}</div>
        <div className="text-lg font-bold text-indigo-300">{score}%</div>
      </div>
      <div className="w-20 h-12 rounded-b-lg bg-slate-800/80 border border-t-0 border-slate-700 flex items-center justify-center text-2xl font-bold text-slate-400">
        {rank}
      </div>
    </div>
  );
}
