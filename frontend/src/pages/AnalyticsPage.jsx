import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/Layout.jsx';
import { apiClient } from '../api/client.js';
import { useToast } from '../state/ToastContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { Spinner } from '../components/Loading.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const endpoint = user?.role === 'admin' ? '/analytics/admin' : '/analytics/student';
    apiClient
      .get(endpoint)
      .then((r) => setData(r.data))
      .catch(() => addToast('Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, [user?.role, addToast]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>

        {user?.role === 'admin' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card p-4">
                <div className="text-xs text-slate-400">Overall accuracy</div>
                <div className="text-2xl font-semibold text-slate-100">{data?.overallAccuracy ?? 0}%</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-400">Total submissions</div>
                <div className="text-2xl font-semibold text-slate-100">{data?.totalSubmissions ?? 0}</div>
              </div>
            </div>
            <div className="card p-4">
              <h2 className="text-sm font-medium text-slate-200 mb-4">Topic performance</h2>
              {data?.topicPerformance?.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topicPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="accuracy" fill="#818cf8" name="Accuracy %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-500">No data yet</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-4">
                <div className="text-xs text-slate-400">Your accuracy</div>
                <div className="text-2xl font-semibold text-slate-100">{data?.accuracy ?? 0}%</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-400">Quizzes completed</div>
                <div className="text-2xl font-semibold text-slate-100">{data?.totalQuizzes ?? 0}</div>
              </div>
            </div>
            <div className="card p-4">
              <h2 className="text-sm font-medium text-slate-200 mb-4">Progress over time</h2>
              {data?.progress?.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.progress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="title" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-500">No quiz results yet</div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
