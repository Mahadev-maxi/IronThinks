import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, registerWithEmail, loginAsGuest, isLoading, error, isSupabaseConfigured } = useSupabaseAuth();

  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('alex.director@ironthinks.ai');
  const [password, setPassword] = useState<string>('Password123!');
  const [fullName, setFullName] = useState<string>('Alex Director');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      const ok = await registerWithEmail(email, password, fullName);
      if (ok) navigate('/');
    } else {
      const ok = await loginWithEmail(email, password);
      if (ok) navigate('/');
    }
  };

  const handleGuestAccess = () => {
    loginAsGuest();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Ambient background blur */}
      <div className="absolute w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Supabase Auth & RLS Guard</span>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRegister ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-400">
            {isSupabaseConfigured
              ? 'Secured with Supabase PostgreSQL and Row-Level Security.'
              : 'Development Mode active. Quick 1-Click Guest sign-in available below.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 pl-10"
                  placeholder="Alex Director"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 pl-10"
                placeholder="name@company.com"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 pl-10"
                placeholder="••••••••"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.01]"
          >
            <span>{isLoading ? 'Authenticating...' : isRegister ? 'Register & Enter Studio' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider">
            or instant access
          </span>
        </div>

        {/* 1-Click Guest Access */}
        <button
          onClick={handleGuestAccess}
          type="button"
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Continue as Demo Architect (Alex Director)</span>
        </button>

        {/* Toggle sign in / register */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            {isRegister ? 'Already have an account? Sign in here' : 'Need an account? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
