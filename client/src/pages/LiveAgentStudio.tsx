import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useGeminiLiveSession } from '../hooks/useGeminiLiveSession';
import { AudioVisualizerCanvas } from '../components/AudioVisualizerCanvas';
import { LanguageIndicatorBadge } from '../components/LanguageIndicatorBadge';
import { LiveTranscriptDrawer } from '../components/LiveTranscriptDrawer';
import { ToolAuditDrawer } from '../components/ToolAuditDrawer';
import { VideoVisionPreview } from '../components/VideoVisionPreview';
import { InteractiveTTSTerminal } from '../components/InteractiveTTSTerminal';
import { MediaControls } from '../components/MediaControls';
import { getPersonaConfig } from '../../../server/config/agentPersonas';
import type { PersonaId, GeminiVoice, SessionMode } from '../../../shared/schemas';
import { Clock, AlertCircle, Sparkles, X, ExternalLink } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey, hasGeminiApiKey, cleanApiKey } from '../lib/geminiInBrowser';

export const LiveAgentStudio: React.FC = () => {
  const { personaId = 'intake_specialist' } = useParams<{ personaId: PersonaId }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get('sessionId') || crypto.randomUUID();
  const voiceName = (searchParams.get('voice') as GeminiVoice) || 'Puck';
  const mode = (searchParams.get('mode') as SessionMode) || 'voice_live';

  const persona = getPersonaConfig(personaId as PersonaId);

  // Call duration counter
  const [callDuration, setCallDuration] = useState<number>(0);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(getGeminiApiKey());
  const [hasKey, setHasKey] = useState<boolean>(hasGeminiApiKey());

  const handleSaveApiKey = () => {
    const cleaned = cleanApiKey(apiKeyInput);
    setGeminiApiKey(cleaned);
    setApiKeyInput(cleaned);
    setHasKey(Boolean(cleaned));
    setShowKeyModal(false);
  };

  const {
    status,
    errorMessage,
    isMicMuted,
    isSpeakerMuted,
    userAudioLevel,
    isModelSpeaking,
    isListening,
    interimSpeech,
    detectedLanguage,
    transcripts,
    toolAudits,
    activeVisualDiagram,
    isVideoEnabled,
    isScreenShareEnabled,
    player,
    sendTextMessage,
    handleBargeIn,
    toggleMic,
    toggleSpeaker,
    toggleVideo,
    endSession,
    setLanguage
  } = useGeminiLiveSession({
    sessionId,
    personaId: personaId as PersonaId,
    voiceName,
    mode,
    onSessionEnded: () => {
      navigate(`/analytics/${sessionId}`);
    }
  });

  // Increment duration timer
  useEffect(() => {
    let interval: any = null;
    if (status === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await endSession();
    navigate(`/analytics/${sessionId}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Top Cockpit Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl">
        {/* Persona Info */}
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${persona.avatarBg} flex items-center justify-center text-white shadow-lg font-bold text-sm`}>
            {persona.name[0]}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{persona.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Voice: {voiceName}
              </span>
            </div>
            <p className="text-xs text-brand-400 font-medium">{persona.domainScope}</p>
          </div>
        </div>

        {/* Real-time Multilingual Detection Badge */}
        <div className="flex items-center gap-3">
          <LanguageIndicatorBadge
            language={detectedLanguage.name}
            code={detectedLanguage.code}
            flag={detectedLanguage.flag}
            confidence={detectedLanguage.confidence}
            onSelectLanguage={setLanguage}
          />

          {/* Duration Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(callDuration)}</span>
          </div>

          {/* Listening State Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                !isMicMuted && isListening
                  ? 'bg-cyan-400 animate-pulse'
                  : isMicMuted
                  ? 'bg-rose-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="text-slate-300">
              {isMicMuted ? 'Muted' : isListening ? 'Listening...' : 'Mic Ready'}
            </span>
          </div>

          {/* Gemini Mode Pill Button */}
          <button
            onClick={() => {
              setApiKeyInput(getGeminiApiKey());
              setShowKeyModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition-all ${
              hasKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Configure Google Gemini API Key"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{hasKey ? 'Gemini 2.0 Live' : 'Smart Agentic (Add Key)'}</span>
          </button>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-400'
              }`}
            />
            <span className="capitalize text-slate-300">{status}</span>
          </div>
        </div>
      </div>

      {/* Gemini API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Google Gemini API Key</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste your Gemini API key to activate direct, real-time Gemini 2.0 Flash reasoning right in your browser.
            </p>

            <div className="space-y-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(cleanApiKey(e.target.value))}
                placeholder="AIzaSy... (Paste Gemini API Key from Google AI Studio)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
              {apiKeyInput && !apiKeyInput.startsWith('AIzaSy') && (
                <p className="text-[11px] text-amber-400">
                  Note: Google AI Studio API keys typically begin with &apos;AIzaSy...&apos;. Verify yours at aistudio.google.com/apikey.
                </p>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-brand-400 hover:underline"
                >
                  <span>Get Free Key on AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                {apiKeyInput && (
                  <button
                    type="button"
                    onClick={() => setApiKeyInput('')}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Clear key
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/25 transition-all"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[440px]">
        {/* Left Column: Visualizer, Video Preview & Interactive TTS Terminal (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main Visualizer or Video Window */}
          <div className="relative flex-1 min-h-[280px]">
            {isVideoEnabled || isScreenShareEnabled ? (
              <VideoVisionPreview
                isVideoEnabled={isVideoEnabled}
                isScreenShareEnabled={isScreenShareEnabled}
                onToggleCamera={() => toggleVideo(false)}
                onToggleScreenShare={() => toggleVideo(true)}
                className="w-full h-full"
              />
            ) : (
              <AudioVisualizerCanvas
                player={player}
                userAudioLevel={userAudioLevel}
                isModelSpeaking={isModelSpeaking}
                isMicMuted={isMicMuted}
                className="w-full h-full"
              />
            )}
          </div>

          {/* Live Voice Input Hearing Banner */}
          {interimSpeech && (
            <div className="px-4 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 animate-pulse">
              <span className="font-semibold text-cyan-300 shrink-0">🎙️ Hearing you:</span>
              <span className="italic truncate text-slate-100">"{interimSpeech}..."</span>
            </div>
          )}

          {/* Interactive TTS Fallback Terminal */}
          <InteractiveTTSTerminal
            onSendMessage={sendTextMessage}
            suggestedPrompts={persona.suggestedPrompts}
            disabled={status !== 'connected'}
          />
        </div>

        {/* Right Column: Live Transcripts & Autonomous Tool Audit Drawers (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-[560px]">
          {/* Synchronized Transcripts Drawer (60% height) */}
          <div className="flex-1 min-h-0">
            <LiveTranscriptDrawer
              transcripts={transcripts}
              activeVisualDiagram={activeVisualDiagram}
            />
          </div>

          {/* Autonomous Tool Executions Drawer (40% height) */}
          <div className="h-[210px] min-h-0">
            <ToolAuditDrawer tools={toolAudits} />
          </div>
        </div>
      </div>

      {/* Bottom Media Controls Floating Bar */}
      <MediaControls
        isMicMuted={isMicMuted}
        isSpeakerMuted={isSpeakerMuted}
        isModelSpeaking={isModelSpeaking}
        isVideoEnabled={isVideoEnabled}
        isScreenShareEnabled={isScreenShareEnabled}
        userAudioLevel={userAudioLevel}
        onToggleMic={toggleMic}
        onToggleSpeaker={toggleSpeaker}
        onBargeIn={handleBargeIn}
        onToggleCamera={() => toggleVideo(false)}
        onToggleScreenShare={() => toggleVideo(true)}
        onEndCall={handleEndCall}
      />
    </div>
  );
};
