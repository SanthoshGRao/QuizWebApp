import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/AuthContext.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { Spinner } from '../../components/Loading.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', {
        email,
        password,
        rememberMe: remember,
      });

      login(res.data.token, res.data.user, navigate);

      if (res.data.requirePasswordReset) {
        addToast('Please change your password before continuing.', 'info');
      } else if (!res.data.user?.first_login) {
        addToast('Logged in successfully', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="card w-full max-w-md px-8 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-400">
            Sign in to access your quizzes and analytics.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-sm">
            <label className="block text-slate-200">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="block text-slate-200">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-indigo-500"
              />
              <span>Remember this device</span>
            </label>
            <Link to="/forgot-password" className="text-indigo-300 hover:text-indigo-200">
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? <Spinner /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

