import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import { NotificationCenter } from './NotificationCenter.jsx';

export function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isQuizTakePage = location.pathname.startsWith('/quiz/');

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'student' ? '/student' : '/login';

  const topBar = (
    <header className="w-full flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0">
      <button
        type="button"
        onClick={() => !isQuizTakePage && navigate(dashboardPath)}
        className={`font-semibold text-lg tracking-tight text-left ${isQuizTakePage ? 'cursor-default' : ''}`}
      >
        Quiz<span className="text-indigo-400">App</span>
      </button>
      {!isQuizTakePage && (
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={logout}
            className="rounded-xl border border-red-500/40 text-red-300/90 px-3 py-1.5 hover:bg-red-500/10 transition text-sm md:text-xs"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {topBar}
      <div className="flex-1 flex min-h-0">
        <aside className="hidden md:flex w-64 flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0">
          {!isQuizTakePage && (
            <nav className="flex-1 px-4 py-4 space-y-1 text-sm overflow-auto">
              {user?.role === 'admin' ? (
                <>
                  <NavItem to="/admin" label="Dashboard" end />
                  <NavItem to="/admin/quizzes" label="Quizzes" />
                  <NavItem to="/admin/students" label="Students" />
                  <NavItem to="/admin/bank" label="Question Bank" />
                  <NavItem to="/leaderboard" label="Leaderboard" />
                  <NavItem to="/analytics" label="Analytics" />
                  <NavItem to="/admin/logs" label="Logs" />
                </>
              ) : user?.role === 'student' ? (
                <>
                  <NavItem to="/student" label="Dashboard" end />
                  <NavItem to="/student/quizzes" label="Quizzes" />
                  <NavItem to="/student/results" label="Results" />
                  <NavItem to="/leaderboard" label="Leaderboard" />
                  <NavItem to="/analytics" label="Analytics" />
                  <NavItem to="/student/profile" label="Profile" />
                </>
              ) : null}
            </nav>
          )}
        </aside>
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-xl px-3 py-2 transition ${
          isActive
            ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
            : 'text-slate-300 hover:bg-slate-900/80'
        }`
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}

