import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client.js';

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = () => {
    apiClient.get('/notifications').then((r) => {
      const list = r.data.notifications || [];
      const sorted = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setNotifications(sorted);
      setUnreadCount(list.filter((n) => !n.read).length);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    if (diffMs < 60000) return 'Just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTypePill = (type) => {
    if (!type) return null;
    const normalized = String(type).toLowerCase();
    let label = normalized;
    let classes =
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-600/80';

    if (normalized === 'quiz') {
      label = 'Quiz';
      classes =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-200 border border-indigo-500/40';
    } else if (normalized === 'result') {
      label = 'Result';
      classes =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-200 border border-emerald-500/40';
    } else if (normalized === 'password' || normalized === 'password_reset') {
      label = 'Security';
      classes =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-200 border border-amber-500/40';
    } else if (normalized === 'account') {
      label = 'Account';
      classes =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-200 border border-sky-500/40';
    } else if (normalized === 'admin' || normalized === 'admin_action') {
      label = 'Admin';
      classes =
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-500/40';
    }

    return <span className={classes}>{label}</span>;
  };

  return (
    <div className="relative shrink-0 z-[9999]">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 transition"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold flex items-center justify-center text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} aria-hidden />
          <div className="fixed right-3 md:right-6 top-14 md:top-16 w-80 max-h-[min(24rem,70vh)] rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-xl backdrop-blur z-[9999]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-slate-800/50">
              <span className="text-sm font-semibold text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`px-4 py-3 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/50 transition ${
                      !n.read ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-200">{n.title}</div>
                      {renderTypePill(n.type)}
                    </div>
                    {n.message && <div className="text-xs text-slate-400 mt-0.5">{n.message}</div>}
                    {n.created_at && (
                      <div className="text-[11px] text-slate-500 mt-1">{formatTime(n.created_at)}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
