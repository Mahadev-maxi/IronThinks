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
import { Clock, AlertCircle } from 'lucide-react';

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

  const {
    status,
    errorMessage,
    isMicMuted,
    isSpeakerMuted,
    userAudioLevel,
    isModelSpeaking,
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
    endSession
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
          />

          {/* Duration Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(callDuration)}</span>
          </div>

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
