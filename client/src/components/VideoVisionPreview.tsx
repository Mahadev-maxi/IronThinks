import React, { useRef } from 'react';
import { Camera, Monitor, VideoOff, Eye } from 'lucide-react';

interface VideoVisionPreviewProps {
  isVideoEnabled: boolean;
  isScreenShareEnabled: boolean;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  className?: string;
}

export const VideoVisionPreview: React.FC<VideoVisionPreviewProps> = ({
  isVideoEnabled,
  isScreenShareEnabled,
  onToggleCamera,
  onToggleScreenShare,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isStreaming = isVideoEnabled || isScreenShareEnabled;

  return (
    <div className={`relative flex flex-col items-center justify-center rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-2xl ${className}`}>
      {/* Live Video Feed or Placeholder */}
      {isStreaming ? (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* 1 FPS Streaming Indicator Pill */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-cyan-500/50 text-[11px] font-medium text-cyan-300 shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>1 FPS Multimodal Grounding Active</span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={isScreenShareEnabled ? onToggleScreenShare : onToggleCamera}
              className="p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-600/80 text-white transition-colors border border-slate-700"
              title="Stop video streaming"
            >
              <VideoOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
            <Eye className="w-6 h-6 text-slate-400" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-200">Multimodal Visual Grounding</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Stream your camera or screen at 1 FPS to let the autonomous agent analyze documents, physical objects, or code in real time.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onToggleCamera}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700/70 transition-all hover:scale-105"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Camera</span>
            </button>

            <button
              onClick={onToggleScreenShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700/70 transition-all hover:scale-105"
            >
              <Monitor className="w-3.5 h-3.5 text-purple-400" />
              <span>Share Screen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
