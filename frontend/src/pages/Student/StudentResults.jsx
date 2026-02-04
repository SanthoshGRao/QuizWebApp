import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';

export default function StudentResults() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/student/results')
      .then((res) => setResults(res.data || []))
      .catch(() => addToast('Failed to load results', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Results</h1>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        ) : results.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="text-slate-300">No results yet.</p>
            <p className="text-xs text-slate-500 mt-1">Complete quizzes to see your results here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/result/${r.quiz_id}`)}
                className="card px-4 py-3 text-left space-y-2 hover:border-indigo-500/40 hover:-translate-y-0.5 transition"
              >
                <div className="text-sm font-medium text-slate-100">{r.title}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Score:</span>
                  <span className="font-semibold text-indigo-300">
                    {r.score}/{r.total}
                  </span>
                  <span className="text-slate-500">
                    ({Math.round((r.score / r.total) * 1000) / 10}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">View details →</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
