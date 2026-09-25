import React, { useEffect, useRef } from 'react';
import { PcmStreamPlayer } from '../lib/pcmPlayer';

interface AudioVisualizerCanvasProps {
  player: PcmStreamPlayer | null;
  userAudioLevel: number;
  isModelSpeaking: boolean;
  isMicMuted: boolean;
  className?: string;
}

export const AudioVisualizerCanvas: React.FC<AudioVisualizerCanvasProps> = ({
  player,
  userAudioLevel,
  isModelSpeaking,
  isMicMuted,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(128);

    const render = () => {
      phaseRef.current += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Fetch model audio frequency data if player exists
      if (player) {
        player.getFrequencyData(freqData);
      } else {
        freqData.fill(0);
      }

      // Calculate model activity intensity
      let modelSum = 0;
      for (let i = 0; i < 32; i++) {
        modelSum += freqData[i];
      }
      const modelIntensity = Math.min(1.0, (modelSum / 32) / 100);

      // Determine active energy source: user or model
      const userEnergy = isMicMuted ? 0 : userAudioLevel;
      const energy = Math.max(isModelSpeaking ? modelIntensity : 0, userEnergy * 1.5, 0.06);

      // Background subtle glow pulse
      const bgGradient = ctx.createRadialGradient(
        width / 2, centerY, 10,
        width / 2, centerY, width / 2
      );
      if (isModelSpeaking) {
        bgGradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
        bgGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else if (userEnergy > 0.1) {
        bgGradient.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
        bgGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else {
        bgGradient.addColorStop(0, 'rgba(30, 41, 59, 0.08)');
        bgGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw multi-layered sine oscilloscope waveforms
      const waveCount = 3;
      const colors = isModelSpeaking
        ? ['#38bdf8', '#0284c7', '#0ea5e9']
        : userEnergy > 0.1
        ? ['#c084fc', '#a855f7', '#7c3aed']
        : ['#475569', '#334155', '#1e293b'];

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.lineWidth = w === 0 ? 3 : 1.5;
        ctx.strokeStyle = colors[w];
        ctx.shadowColor = colors[0];
        ctx.shadowBlur = w === 0 ? 14 : 6;

        const waveFreq = 0.015 + w * 0.008;
        const waveAmp = (40 + w * 18) * energy;
        const waveSpeed = phaseRef.current * (1 + w * 0.4);

        for (let x = 0; x < width; x += 3) {
          const envelope = Math.sin((Math.PI * x) / width);
          const y = centerY + Math.sin(x * waveFreq + waveSpeed) * waveAmp * envelope;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Draw dynamic frequency bar cluster at center
      const barCount = 36;
      const barWidth = 4;
      const barSpacing = 5;
      const totalWidth = barCount * (barWidth + barSpacing);
      const startX = (width - totalWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        const binIndex = Math.floor((i / barCount) * 48);
        const binValue = freqData[binIndex] || 0;
        const barHeight = Math.max(4, (binValue / 255) * (height * 0.42) * energy + Math.sin(phaseRef.current * 2 + i * 0.2) * 6 * energy);

        const x = startX + i * (barWidth + barSpacing);
        const yTop = centerY - barHeight / 2;

        const barGradient = ctx.createLinearGradient(x, yTop, x, yTop + barHeight);
        if (isModelSpeaking) {
          barGradient.addColorStop(0, '#38bdf8');
          barGradient.addColorStop(0.5, '#60a5fa');
          barGradient.addColorStop(1, '#0284c7');
        } else if (userEnergy > 0.1) {
          barGradient.addColorStop(0, '#e879f9');
          barGradient.addColorStop(0.5, '#c084fc');
          barGradient.addColorStop(1, '#9333ea');
        } else {
          barGradient.addColorStop(0, '#64748b');
          barGradient.addColorStop(1, '#334155');
        }

        ctx.fillStyle = barGradient;
        ctx.shadowColor = colors[0];
        ctx.shadowBlur = 8;
        ctx.fillRect(x, yTop, barWidth, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [player, userAudioLevel, isModelSpeaking, isMicMuted]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-surface-darkest border border-slate-800 shadow-2xl ${className}`}>
      <canvas
        ref={canvasRef}
        width={720}
        height={240}
        className="w-full h-full object-cover"
      />

      {/* Real-time Status Badge in visualizer */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-300">
        <span className={`w-2 h-2 rounded-full ${
          isModelSpeaking
            ? 'bg-cyan-400 animate-ping'
            : userAudioLevel > 0.1
            ? 'bg-purple-400 animate-pulse'
            : 'bg-emerald-400'
        }`} />
        <span>
          {isModelSpeaking
            ? 'Agent Speaking (24kHz PCM)'
            : userAudioLevel > 0.1
            ? 'Listening to User (16kHz PCM)'
            : 'Live Audio Channel Ready'}
        </span>
      </div>

      {/* Barge-In Helper Prompt */}
      {isModelSpeaking && (
        <div className="absolute bottom-4 inset-x-0 mx-auto w-max px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/70 text-[11px] text-slate-400 flex items-center gap-1.5 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Speak naturally at any time to barge in</span>
        </div>
      )}
    </div>
  );
};
