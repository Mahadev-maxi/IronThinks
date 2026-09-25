import React, { useEffect, useRef } from 'react';
import { User, Bot, Sparkles, MessageSquare, Clock, Layout } from 'lucide-react';
import type { TranscriptEntry } from '../../../shared/schemas';

interface LiveTranscriptDrawerProps {
  transcripts: TranscriptEntry[];
  activeVisualDiagram?: {
    title: string;
    diagramType: string;
    contentSummary: string;
  } | null;
  className?: string;
}

export const LiveTranscriptDrawer: React.FC<LiveTranscriptDrawerProps> = ({
  transcripts,
  activeVisualDiagram,
  className = ''
}) => {
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, activeVisualDiagram]);

  return (
    <div className={`flex flex-col h-full bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">Synchronized Transcript</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
            {transcripts.length} turns
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Real-Time Sync</span>
        </div>
      </div>

      {/* Transcript Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {transcripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
            <p className="text-sm font-medium text-slate-400">Conversation transcript will stream live here.</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Speak or type in any of 70+ languages. Automatic language identification and vocal turns appear synchronously.
            </p>
          </div>
        ) : (
          transcripts.map((entry) => {
            const isUser = entry.speaker === 'user';
            const timeStr = entry.timestamp
              ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '';

            return (
              <div
                key={entry.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start group`}
              >
                {/* Speaker Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                    isUser
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white'
                      : 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-medium text-slate-400">
                      {isUser ? 'You' : 'Agent'}
                    </span>
                    {entry.detectedLanguage && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 border border-slate-700/60 text-cyan-300 font-mono">
                        {entry.detectedLanguage}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{timeStr}</span>
                  </div>

                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-none'
                    }`}
                  >
                    {entry.content}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Visual Diagram Overlay if requested by autonomous tool */}
        {activeVisualDiagram && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-700/50 shadow-xl space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs tracking-wide">
              <Layout className="w-4 h-4 text-indigo-400" />
              <span>VISUAL AGENT CARD: {activeVisualDiagram.title}</span>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {activeVisualDiagram.contentSummary}
            </p>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};
