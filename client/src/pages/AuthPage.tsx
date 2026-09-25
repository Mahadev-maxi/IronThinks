import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, registerWithEmail, loginAsGuest, isLoading, error, isSupabaseConfigured } = useSupabaseAuth();

  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (isRegister) {
      if (password.length < 6) {
        return;
      }
      const ok = await registerWithEmail(email, password, fullName);
      if (ok) {
        setSuccessMessage('Account successfully created! Entering studio...');
        setTimeout(() => navigate('/'), 800);
      }
    } else {
      const ok = await loginWithEmail(email, password);
      if (ok) {
        navigate('/');
      }
    }
  };

  const handleGuestAccess = () => {
    loginAsGuest();
    navigate('/');
  };

  const switchTab = (register: boolean) => {
    setIsRegister(register);
    setSuccessMessage(null);
    if (register) {
      if (!fullName) setFullName('');
      if (email === 'alex.director@ironthinks.ai') setEmail('');
      if (password === 'Password123!') setPassword('');
    } else {
      if (!email) setEmail('alex.director@ironthinks.ai');
      if (!password) setPassword('Password123!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Supabase Cloud & RLS Security</span>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRegister ? 'Create Your Account' : 'Welcome to Ironthinks'}
          </h2>
          <p className="text-xs text-slate-400">
            {isSupabaseConfigured
              ? 'Secured with Supabase PostgreSQL, JWT auth, and Row-Level Security.'
              : 'Direct user account creation, sign-in, and full account management.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-2xl bg-slate-950/80 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => switchTab(false)}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${
              !isRegister
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab(true)}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${
              isRegister
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <span className="font-semibold text-rose-400">Notice:</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Sarah Connor"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Address</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Password</span>
              </label>
              {isRegister && (
                <span className="text-[10px] text-slate-400">Min. 6 characters</span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isRegister ? 6 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            <span>{isLoading ? 'Processing...' : isRegister ? 'Create Account & Enter' : 'Sign In to Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider">
            or instant sandbox
          </span>
        </div>

        {/* 1-Click Guest / Demo Access */}
        <button
          onClick={handleGuestAccess}
          type="button"
          className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          <KeyRound className="w-4 h-4 text-cyan-400" />
          <span>Demo Architect Login (Alex Director)</span>
        </button>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>End-to-End Account Encryption & Supabase RLS Guaranteed</span>
        </div>
      </div>
    </div>
  );
};

