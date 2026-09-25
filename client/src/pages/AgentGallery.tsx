import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  Calendar,
  Languages,
  HeartPulse,
  TrendingUp,
  Volume2
} from 'lucide-react';
import { apiStartSession } from '../lib/api';
import { AGENT_PERSONAS } from '../../../server/config/agentPersonas';
import type { PersonaId, SessionMode } from '../../../shared/schemas';

export const AgentGallery: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<SessionMode>('voice_live');
  const [isStarting, setIsStarting] = useState<string | null>(null);

  // Audio mic test states
  const [isTestingMic, setIsTestingMic] = useState<boolean>(false);
  const [testMicVolume, setTestMicVolume] = useState<number>(0);
  const [testMicStream, setTestMicStream] = useState<MediaStream | null>(null);

  const personaList = Object.values(AGENT_PERSONAS);

  // Start live session for persona
  const handleLaunchSession = async (personaId: PersonaId, defaultVoice: string) => {
    setIsStarting(personaId);
    try {
      const result = await apiStartSession({
        personaId,
        mode: selectedMode,
        voiceName: defaultVoice as any,
        preferredLanguage: 'auto'
      });

      navigate(`/session/${personaId}?sessionId=${result.sessionId}&mode=${selectedMode}&voice=${defaultVoice}`);
    } catch (err: any) {
      console.warn('[AgentGallery] Backend session init notice:', err.message);
      // Fallback direct route
      const fallbackId = crypto.randomUUID();
      navigate(`/session/${personaId}?sessionId=${fallbackId}&mode=${selectedMode}&voice=${defaultVoice}`);
    } finally {
      setIsStarting(null);
    }
  };

  // Toggle Live Microphone Tester
  const toggleMicTest = async () => {
    if (isTestingMic) {
      if (testMicStream) {
        testMicStream.getTracks().forEach(t => t.stop());
        setTestMicStream(null);
      }
      setIsTestingMic(false);
      setTestMicVolume(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTestMicStream(stream);
      setIsTestingMic(true);

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const interval = setInterval(() => {
        if (!stream.active) {
          clearInterval(interval);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setTestMicVolume(Math.min(1.0, avg / 120));
      }, 70);
    } catch (err) {
      alert('Unable to access microphone for testing. Please check browser permissions.');
    }
  };

  useEffect(() => {
    return () => {
      if (testMicStream) {
        testMicStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [testMicStream]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold tracking-wide shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>GEMINI LIVE WEBRTC/WEBSOCKET ENGINE</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Real-Time Multilingual <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Autonomous AI Voice Agents
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Zero-latency conversational intelligence with automatic language identification across 70+ languages, 
            bidirectional 16kHz/24kHz PCM audio streaming, live 1 FPS vision grounding, and autonomous CRM tool executions.
          </p>

          {/* Interactive Dual-Mode Selector */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <button
                type="button"
                onClick={() => setSelectedMode('voice_live')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedMode === 'voice_live'
                    ? 'bg-gradient-to-r from-cyan-500 to-brand-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Voice-First Engine (Live PCM)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('interactive_tts')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedMode === 'interactive_tts'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Interactive TTS Mode (Quiet/Terminal)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Audio Input Tester Pill */}
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isTestingMic ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-200">Microphone & Hardware Input Check</h4>
              <p className="text-[11px] text-slate-400">
                {isTestingMic ? 'Speak now to check your input levels' : 'Verify your 16kHz PCM audio stream before calling'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isTestingMic && (
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-brand-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(10, testMicVolume * 100))}%` }}
                />
              </div>
            )}

            <button
              onClick={toggleMicTest}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isTestingMic
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              {isTestingMic ? 'Stop Test' : 'Test Mic'}
            </button>
          </div>
        </div>

        {/* Featured Agent Personas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {personaList.map((persona) => {
            const isCurrentStarting = isStarting === persona.id;

            return (
              <div
                key={persona.id}
                className="group relative rounded-3xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Background ambient gradient glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-500/5 to-indigo-500/0 rounded-full blur-2xl pointer-events-none group-hover:from-brand-500/10 transition-all" />

                <div className="space-y-4">
                  {/* Top Bar with Icon & Voice */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${persona.avatarBg} flex items-center justify-center text-white shadow-lg`}>
                      {persona.id === 'intake_specialist' && <Calendar className="w-6 h-6" />}
                      {persona.id === 'polyglot_tutor' && <Languages className="w-6 h-6" />}
                      {persona.id === 'health_concierge' && <HeartPulse className="w-6 h-6" />}
                      {persona.id === 'wealth_advisor' && <TrendingUp className="w-6 h-6" />}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-cyan-300 flex items-center gap-1.5">
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        Voice: {persona.primaryVoice}
                      </span>
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {persona.name}
                    </h3>
                    <p className="text-xs text-brand-400 font-medium mt-0.5">
                      {persona.domainScope}
                    </p>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {persona.tagline}
                    </p>
                  </div>

                  {/* Autonomous Tools Included */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Autonomous Tools Included:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {persona.tools.map((tool) => (
                        <span
                          key={tool.name}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300/90"
                        >
                          {tool.name}()
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Launch Button */}
                <div className="pt-6">
                  <button
                    onClick={() => handleLaunchSession(persona.id, persona.primaryVoice)}
                    disabled={isCurrentStarting}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 via-blue-600 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-all hover:scale-[1.01]"
                  >
                    <span>{isCurrentStarting ? 'Initializing Studio...' : `Connect with ${persona.name.split(' ')[0]}`}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Features Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <Globe2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-semibold text-slate-200">70+ Language Auto-Switching</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Detects language inflection within 300ms without requiring manual language pickers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-semibold text-slate-200">Instant Barge-In Interruption</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Web Audio buffer flushing halts agent speech instantaneously as soon as you begin speaking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-semibold text-slate-200">Post-Call Intelligence & RLS</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Automated sentiment scoring, key entity extraction, and tenant-isolated Supabase persistence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
