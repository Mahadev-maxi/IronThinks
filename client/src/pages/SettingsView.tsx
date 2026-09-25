import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mic, Camera, Sliders, CheckCircle2, Shield, Radio, Key, Sparkles, ExternalLink, User, Trash2, AlertTriangle, ShieldCheck, LogOut, X } from 'lucide-react';
import { apiGetHealth } from '../lib/api';
import { getGeminiApiKey, setGeminiApiKey, cleanApiKey } from '../lib/geminiInBrowser';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import type { GeminiVoice } from '../../../shared/schemas';

export const SettingsView: React.FC = () => {
  const [defaultVoice, setDefaultVoice] = useState<GeminiVoice>(
    (localStorage.getItem('pref_voice') as GeminiVoice) || 'Aoede'
  );
  const [sensitivity, setSensitivity] = useState<number>(
    Number(localStorage.getItem('pref_sensitivity') || 85)
  );
  const [geminiKey, setGeminiKeyState] = useState<string>(getGeminiApiKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedCam, setSelectedCam] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);

  const navigate = useNavigate();
  const { user, logout, deleteAccount, isLoading: isAuthLoading } = useSupabaseAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') return;
    setDeleteError(null);
    const res = await deleteAccount(undefined, deleteConfirmText);
    if (res.success) {
      setDeleteSuccess(res.message || 'Account successfully deleted from Supabase.');
      setIsDeleteModalOpen(false);
      setTimeout(() => {
        navigate('/auth');
      }, 1500);
    } else {
      setDeleteError(res.error || 'Failed to delete account.');
    }
  };

  useEffect(() => {
    // Enumerate hardware devices
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const cams = devices.filter((d) => d.kind === 'videoinput');
        setAudioInputDevices(mics);
        setVideoDevices(cams);
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
        if (cams.length > 0) setSelectedCam(cams[0].deviceId);
      }).catch(console.error);
    }

    apiGetHealth().then(setHealthInfo).catch(console.error);
  }, []);

  const handleSave = () => {
    localStorage.setItem('pref_voice', defaultVoice);
    localStorage.setItem('pref_sensitivity', sensitivity.toString());
    const cleaned = cleanApiKey(geminiKey);
    setGeminiApiKey(cleaned);
    setGeminiKeyState(cleaned);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const voices: Array<{ name: GeminiVoice; description: string; gender: string }> = [
    { name: 'Aoede', description: 'Warm, clear, and engaging vocal tone (Recommended for Intake & Concierge)', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, natural, and expressive cadence (Recommended for Tutor)', gender: 'Male' },
    { name: 'Kore', description: 'Calm, empathetic, and gentle delivery (Recommended for Triage)', gender: 'Female' },
    { name: 'Fenrir', description: 'Authoritative, analytical, and structured voice (Recommended for Finance)', gender: 'Male' },
    { name: 'Charon', description: 'Deep, steady, and resonant baseline', gender: 'Male' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-brand-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              System & Audio Preferences
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure microphone specs, Web Audio buffers, preferred Gemini vocal model, and language detection sensitivity.
          </p>
        </div>

        {/* Global Notifications */}
        {deleteSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{deleteSuccess}</span>
          </div>
        )}

        {/* Section: User Account & Supabase Security Management */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>User Profile & Supabase Security</span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
              user?.isDemo
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{user?.isDemo ? 'Sandbox Demo Session' : 'Active Supabase User'}</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-cyan-500/20">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{user?.fullName || 'User'}</h3>
                <p className="text-xs text-slate-400 font-mono">{user?.email || 'user@ironthinks.ai'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  UID: <span className="font-mono text-slate-400">{user?.id || '0000-0000-0000'}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {user?.isDemo ? (
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-medium shadow-md shadow-brand-500/20 transition-all hover:scale-105"
                >
                  Create / Sign In to Account
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={logout}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText('');
                      setDeleteError(null);
                      setIsDeleteModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all hover:scale-105 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete Account</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section 0: Gemini AI Engine API Key (In-Browser Live AI) */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Key className="w-4 h-4" />
              <span>Google Gemini AI Engine (Direct In-Browser)</span>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              <span>Get Free Gemini Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Enter your Google AI Studio Gemini API key to activate direct real-time Gemini 2.0 Flash reasoning right in your browser. If empty, the resilient autonomous agentic engine powers your sessions.
          </p>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKeyState(cleanApiKey(e.target.value))}
                placeholder="AIzaSy... (Paste Gemini API Key from Google AI Studio)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 pr-20"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            {geminiKey && !geminiKey.startsWith('AIzaSy') && (
              <p className="text-[11px] text-amber-400">
                Note: Google AI Studio API keys typically begin with &apos;AIzaSy...&apos;. Verify yours at aistudio.google.com/apikey.
              </p>
            )}
            {geminiKey && (
              <button
                type="button"
                onClick={() => setGeminiKeyState('')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Status:{' '}
              <strong className={geminiKey ? 'text-emerald-400' : 'text-slate-300'}>
                {geminiKey ? 'Active (Gemini 2.0 Flash Enabled)' : 'Autonomous Simulator Mode (No Key Needed)'}
              </strong>
            </span>
          </div>
        </div>

        {/* Section 1: Prebuilt Agentic Voice Selection */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Radio className="w-4 h-4" />
            <span>Default Agentic Vocal Model</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {voices.map((v) => (
              <div
                key={v.name}
                onClick={() => setDefaultVoice(v.name)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  defaultVoice === v.name
                    ? 'bg-brand-500/15 border-brand-500 shadow-md shadow-brand-500/10 scale-[1.02]'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">{v.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {v.gender}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Multilingual Language Auto-Detect Sensitivity */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>Language Auto-Detection Responsiveness</span>
            </div>
            <span className="text-xs font-mono font-semibold text-brand-300">
              {sensitivity}% (Fast Turnaround)
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min="50"
              max="100"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Standard (500ms confirmation)</span>
              <span className="text-cyan-400">Instantaneous (300ms shift match)</span>
              <span>Ultra-Strict</span>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware Device Selectors */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
          <div className="text-slate-300 font-bold text-xs uppercase tracking-wider">
            Audio & Video Hardware Routing
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Microphone Input Device (16kHz Capture)</span>
              </label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                {audioInputDevices.length > 0 ? (
                  audioInputDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default System Microphone</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                <span>Camera Device (1 FPS Vision Stream)</span>
              </label>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default WebCam</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: System Architecture & Health Status */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Platform Connectivity & Specifications</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Audio Ingestion Spec:</span>
              <span className="font-mono text-cyan-300">16,000Hz 16-bit Mono PCM</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Audio Playback Spec:</span>
              <span className="font-mono text-cyan-300">24,000Hz 16-bit PCM Little-Endian</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Supabase RLS Engine:</span>
              <span className="font-mono text-emerald-400">
                {healthInfo?.services?.supabase === 'connected' ? 'Cloud Connected' : 'In-Memory Resilient Active'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Gemini Live SDK:</span>
              <span className="font-mono text-indigo-300">
                {healthInfo?.services?.geminiApiKeyConfigured ? 'Live Cloud Key Active' : 'Autonomous Agent Simulator'}
              </span>
            </div>
          </div>
        </div>

        {/* Save Preferences Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Preferences saved successfully!</span>
            </div>
          )}

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/25 transition-all hover:scale-105 active:scale-95"
          >
            Save Preferences
          </button>
        </div>

        {/* Delete Account Secured Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl shadow-rose-950/40 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <span>Delete Supabase User Account</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-2xl">
                <p className="font-semibold text-rose-300">
                  Warning: This action is permanent and cannot be reversed.
                </p>
                <p className="text-slate-400">
                  Deleting your account will purge your profile from Supabase PostgreSQL, cascade delete all audio sessions, transcribed voice records, and agent tool execution logs.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {deleteError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  To confirm deletion, type <span className="font-mono text-rose-400 font-bold">DELETE</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText.trim() !== 'DELETE' || isAuthLoading}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  {isAuthLoading ? 'Purging Account...' : 'Permanently Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
