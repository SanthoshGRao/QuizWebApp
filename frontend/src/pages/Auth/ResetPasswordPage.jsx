import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../state/ToastContext.jsx';
import { Spinner } from '../../components/Loading.jsx';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { addToast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      addToast('Password reset successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Invalid or missing token.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="card w-full max-w-md px-8 py-10 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-sm">
            <label className="block text-slate-200">New password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? <Spinner /> : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

