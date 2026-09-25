import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radio, History, Settings, LogOut } from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export const Header: React.FC = () => {
  const { user, logout } = useSupabaseAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white font-sans">
                Ironthinks
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Agentic Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Multilingual Voice & Vision Engine</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isActive('/')
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Agents Gallery
          </Link>
          <Link
            to="/history"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isActive('/history')
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Session Archives</span>
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isActive('/settings')
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>
        </nav>

        {/* User Info & Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <Link
                to="/settings"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors group"
                title="Manage Account & Settings"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:scale-105 transition-transform">
                  {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-200 leading-tight group-hover:text-cyan-300 transition-colors">
                    {user.fullName}
                  </span>
                  <span className={`text-[10px] leading-tight font-medium ${user.isDemo ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {user.isDemo ? 'Sandbox Session' : 'Supabase Secured'}
                  </span>
                </div>
              </Link>

              {user.isDemo ? (
                <Link
                  to="/auth"
                  className="hidden md:inline-flex px-3 py-1.5 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/40 text-xs font-medium transition-all"
                >
                  Create Account
                </Link>
              ) : null}

              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-all shadow-md shadow-brand-500/20"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
