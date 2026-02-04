import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/Layout.jsx';
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../state/AuthContext.jsx';
import { Spinner } from '../../components/Loading.jsx';
import { useToast } from '../../state/ToastContext.jsx';

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-slate-400">{label}</div>
      {children}
    </div>
  );
}

export default function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstname: '',
    middlename: '',
    lastname: '',
  });

  useEffect(() => {
    apiClient
      .get('/student/profile')
      .then((res) => {
        const p = res.data;
        setForm({
          firstname: p.firstname ?? p.name?.split(' ')[0] ?? '',
          middlename: p.middlename ?? '',
          lastname: p.lastname ?? (p.name ? p.name.split(' ').slice(1).join(' ') : ''),
        });
      })
      .catch(() => addToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch('/student/profile', form);
      if (refreshUser) await refreshUser();
      addToast('Profile updated', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <form onSubmit={handleSubmit} className="card px-4 py-4 space-y-4 text-xs max-w-md">
          <Field label="First name">
            <input
              className="input w-full"
              value={form.firstname}
              onChange={(e) => setForm({ ...form, firstname: e.target.value })}
              required
            />
          </Field>
          <Field label="Middle name (optional)">
            <input
              className="input w-full"
              value={form.middlename}
              onChange={(e) => setForm({ ...form, middlename: e.target.value })}
              placeholder="Optional"
            />
          </Field>
          <Field label="Last name">
            <input
              className="input w-full"
              value={form.lastname}
              onChange={(e) => setForm({ ...form, lastname: e.target.value })}
              required
            />
          </Field>
          <Field label="Email (read-only)">
            <input
              className="input w-full bg-slate-900/50 cursor-not-allowed"
              value={user?.email ?? ''}
              readOnly
              disabled
            />
          </Field>
          <Field label="Class (read-only)">
            <input
              className="input w-full bg-slate-900/50 cursor-not-allowed"
              value={user?.class ?? ''}
              readOnly
              disabled
            />
          </Field>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : 'Save'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
