import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';

export default function StudentQuizzes() {
  const { addToast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .get('/quizzes')
      .then((res) => setQuizzes(res.data))
      .catch(() => addToast('Failed to load quizzes', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Active quizzes</h1>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="text-slate-300">No test right now.</p>
            <p className="text-xs text-slate-500 mt-1">
              Quizzes appear here when they are live (between start and end time).
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate(q.attempted ? `/result/${q.id}` : `/quiz/${q.id}`)}
                className="card px-4 py-3 text-left space-y-1 hover:border-indigo-500/40 hover:-translate-y-0.5 transition"
              >
                <div className="text-sm font-medium text-slate-100">{q.title}</div>
                <div className="text-[11px] text-slate-400">
                  {new Date(q.start_time).toLocaleString()} –{' '}
                  {new Date(q.end_time).toLocaleString()}
                </div>
                {q.attempted && (
                  <div className="text-[11px] text-emerald-400 mt-1">Already attempted — View result</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

