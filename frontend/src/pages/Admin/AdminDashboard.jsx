import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../state/ToastContext.jsx';
import { AppLayout } from '../../components/Layout.jsx';
import { Spinner } from '../../components/Loading.jsx';
import { NotificationCenter } from '../../components/NotificationCenter.jsx';

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    apiClient
      .get('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch(() => addToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <AppLayout>
      {loading ? (
        <div className="flex justify-center h-64 items-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <header>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">
                Admin dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Overview of your quiz app
              </p>
            </header>
            <div className="flex items-center">
              <NotificationCenter />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total students" value={data?.totalStudents ?? 0} />
            <StatCard label="Total quizzes" value={data?.totalQuizzes ?? 0} />
            <StatCard label="Active quizzes" value={data?.activeQuizzes ?? 0} />
            <StatCard label="Questions in bank" value={data?.totalBankQuestions ?? 0} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total quiz attempts" value={data?.totalAttempts ?? 0} />
            <StatCard label="Classes" value={data?.totalClasses ?? 0} />
          </div>

          {(data?.classes?.length ?? 0) > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-medium text-slate-200 mb-3">Classes</h2>
              <div className="flex flex-wrap gap-2">
                {data.classes.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800/80 text-slate-300 text-sm border border-slate-700/80"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card px-5 py-4 border-slate-700/80">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-100">{value}</div>
    </div>
  );
}
