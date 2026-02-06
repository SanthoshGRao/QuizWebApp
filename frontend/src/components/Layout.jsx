import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import { NotificationCenter } from './NotificationCenter.jsx';

export function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isQuizTakePage = location.pathname.startsWith('/quiz/');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes to avoid stale open state
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'student' ? '/student' : '/login';

  const renderNavItems = (onItemClick) => {
    if (user?.role === 'admin') {
      return (
        <>
          <NavItem to="/admin" label="Dashboard" end onClick={onItemClick} />
          <NavItem to="/admin/quizzes" label="Quizzes" onClick={onItemClick} />
          <NavItem to="/admin/students" label="Students" onClick={onItemClick} />
          <NavItem to="/admin/bank" label="Question Bank" onClick={onItemClick} />
          <NavItem to="/leaderboard" label="Leaderboard" onClick={onItemClick} />
          <NavItem to="/analytics" label="Analytics" onClick={onItemClick} />
          <NavItem to="/admin/logs" label="Logs" onClick={onItemClick} />
        </>
      );
    }

    if (user?.role === 'student') {
      return (
        <>
          <NavItem to="/student" label="Dashboard" end onClick={onItemClick} />
          <NavItem to="/student/quizzes" label="Quizzes" onClick={onItemClick} />
          <NavItem to="/student/results" label="Results" onClick={onItemClick} />
          <NavItem to="/leaderboard" label="Leaderboard" onClick={onItemClick} />
          <NavItem to="/analytics" label="Analytics" onClick={onItemClick} />
          <NavItem to="/student/profile" label="Profile" onClick={onItemClick} />
        </>
      );
    }

    return null;
  };

  const topBar = (
    // Top navbar for both mobile and desktop
    <header className="safe-top w-full flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-2">
        {!isQuizTakePage && user && (
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/80 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-0"
            aria-label="Open navigation menu"
          >
            <span className="flex flex-col gap-[3px]">
              <span className="block w-4 h-[2px] rounded-full bg-slate-200" />
              <span className="block w-4 h-[2px] rounded-full bg-slate-200" />
              <span className="block w-4 h-[2px] rounded-full bg-slate-200" />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => !isQuizTakePage && navigate(dashboardPath)}
          className={`font-semibold text-lg tracking-tight text-left ${isQuizTakePage ? 'cursor-default' : ''}`}
        >
          Quiz<span className="text-indigo-400">App</span>
        </button>
      </div>
      {!isQuizTakePage && (
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-xl border border-red-500/40 text-red-300/90 px-3 py-1.5 hover:bg-red-500/10 transition text-sm md:text-xs min-h-[40px]"
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
      {/* Mobile drawer sidebar */}
      {!isQuizTakePage && user && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
              mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl md:hidden transform transition-transform duration-200 ease-out ${
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            aria-label="Sidebar navigation"
          >
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-800/80">
              <span className="font-semibold text-lg tracking-tight">
                Quiz<span className="text-indigo-400">App</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-0"
                aria-label="Close navigation menu"
              >
                <span className="sr-only">Close</span>
                <span className="relative block h-3 w-3">
                  <span className="absolute inset-0 h-[2px] w-full bg-slate-200 rotate-45 rounded-full" />
                  <span className="absolute inset-0 h-[2px] w-full bg-slate-200 -rotate-45 rounded-full" />
                </span>
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 text-sm overflow-y-auto">
              {renderNavItems(() => setMobileNavOpen(false))}
            </nav>
          </aside>
        </>
      )}
      <div className="flex-1 flex min-h-0">
        <aside className="hidden md:flex w-64 flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0">
          {!isQuizTakePage && (
            <nav className="flex-1 px-4 py-4 space-y-1 text-sm overflow-auto">
              {renderNavItems()}
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

function NavItem({ to, label, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
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

