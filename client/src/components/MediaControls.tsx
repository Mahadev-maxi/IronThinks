import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Hand, PhoneOff, Camera, Monitor } from 'lucide-react';

interface MediaControlsProps {
  isMicMuted: boolean;
  isSpeakerMuted: boolean;
  isModelSpeaking: boolean;
  isVideoEnabled: boolean;
  isScreenShareEnabled: boolean;
  userAudioLevel: number;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onBargeIn: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  className?: string;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  isMicMuted,
  isSpeakerMuted,
  isModelSpeaking,
  isVideoEnabled,
  isScreenShareEnabled,
  userAudioLevel,
  onToggleMic,
  onToggleSpeaker,
  onBargeIn,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl ${className}`}>
      {/* Microphone & Audio Level Meter */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMic}
          className={`relative p-3.5 rounded-full transition-all duration-200 shadow-lg ${
            isMicMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/30 scale-105'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}

          {/* Volume Pulse Ripple */}
          {!isMicMuted && userAudioLevel > 0.1 && (
            <span
              className="absolute inset-0 rounded-full bg-brand-400 opacity-40 animate-ping pointer-events-none"
              style={{ transform: `scale(${1 + userAudioLevel * 0.8})` }}
            />
          )}
        </button>

        {/* Vertical Mini Meter */}
        <div className="flex flex-col gap-1 items-center">
          <div className="w-2.5 h-10 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`w-full rounded-full transition-all duration-75 ${
                isMicMuted ? 'bg-slate-600' : userAudioLevel > 0.4 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ height: `${isMicMuted ? 0 : Math.min(100, Math.max(8, userAudioLevel * 100))}%`, marginTop: 'auto' }}
            />
          </div>
          <span className="text-[9px] font-mono text-slate-500">MIC</span>
        </div>
      </div>

      {/* Center Action Cluster */}
      <div className="flex items-center gap-3">
        {/* Instant Barge-In Button */}
        <button
          onClick={onBargeIn}
          disabled={!isModelSpeaking}
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
            isModelSpeaking
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30 animate-pulse cursor-pointer'
              : 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-not-allowed opacity-50'
          }`}
          title="Instant barge-in speech interruption"
        >
          <Hand className="w-4 h-4" />
          <span>Interrupt Agent</span>
        </button>

        {/* Video Camera Toggle */}
        <button
          onClick={onToggleCamera}
          className={`p-3 rounded-xl border transition-all ${
            isVideoEnabled
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Toggle camera visual feed (1 FPS)"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3 rounded-xl border transition-all ${
            isScreenShareEnabled
              ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Toggle screen share visual grounding"
        >
          <Monitor className="w-4 h-4" />
        </button>

        {/* Speaker Mute Toggle */}
        <button
          onClick={onToggleSpeaker}
          className={`p-3 rounded-xl border transition-all ${
            isSpeakerMuted
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title={isSpeakerMuted ? 'Unmute Speaker Output' : 'Mute Speaker Output'}
        >
          {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
      >
        <PhoneOff className="w-4 h-4" />
        <span>End Session</span>
      </button>
    </div>
  );
};
