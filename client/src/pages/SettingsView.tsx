import React, { useState, useEffect } from 'react';
import { Settings, Mic, Volume2, Camera, Sliders, CheckCircle2, Shield, Info, Radio } from 'lucide-react';
import { apiGetHealth } from '../lib/api';
import { GeminiVoice } from '../../../shared/schemas';

export const SettingsView: React.FC = () => {
  const [defaultVoice, setDefaultVoice] = useState<GeminiVoice>(
    (localStorage.getItem('pref_voice') as GeminiVoice) || 'Aoede'
  );
  const [sensitivity, setSensitivity] = useState<number>(
    Number(localStorage.getItem('pref_sensitivity') || 85)
  );
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedCam, setSelectedCam] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);

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
      </div>
    </div>
  );
};
