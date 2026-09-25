import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  FileText,
  Smile,
  Globe2,
  ListTodo,
  Database,
  RefreshCw,
  ArrowLeft,
  Clock,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { apiGetAnalytics, apiReanalyze } from '../lib/api';
import type { AnalyticsResponse, TranscriptEntry, ToolAuditRecord } from '../../../shared/schemas';

export const AnalyticsView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [tools, setTools] = useState<ToolAuditRecord[]>([]);
  const [session, setSession] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId) return;
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await apiGetAnalytics(sessionId);
      setAnalytics(res.analytics);
      setTranscripts(res.transcripts || []);
      setTools(res.tools || []);
      setSession(res.session);

      // Trigger celebratory confetti if sentiment is positive
      if (res.analytics?.sentimentScore > 0.6) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 }
        });
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!sessionId) return;
    setIsReanalyzing(true);
    try {
      const res = await apiReanalyze(sessionId);
      setAnalytics(res.analytics);
    } catch (err) {
      console.error('Re-analysis error:', err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleCopyJson = () => {
    if (!analytics) return;
    navigator.clipboard.writeText(JSON.stringify(analytics, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-slate-400">
        <Sparkles className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-sm font-medium">Synthesizing Post-Call Structured Intelligence with Gemini...</p>
      </div>
    );
  }

  const sentimentPercent = analytics ? Math.round(((analytics.sentimentScore + 1) / 2) * 100) : 75;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Back to Session Archives"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Session Intelligence & Audit
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  gemini-2.5-flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Session ID: <span className="font-mono text-slate-300">{sessionId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-800 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied JSON' : 'Copy JSON Report'}</span>
            </button>

            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-xs font-medium text-white transition-all shadow-md shadow-brand-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span>{isReanalyzing ? 'Re-analyzing...' : 'Re-run Evaluation'}</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Row: Sentiment, Languages, Turn Count */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sentiment Gauge Card */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Calculated Sentiment
              </span>
              <Smile className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="py-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">
                  {analytics?.sentimentScore.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 font-mono">(-1.0 to +1.0)</span>
              </div>

              {/* Gradient Progress Bar */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full mt-3 overflow-hidden p-0.5 border border-slate-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${sentimentPercent}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              {analytics && analytics.sentimentScore >= 0.5
                ? 'High client satisfaction and productive conversational alignment.'
                : 'Neutral to constructive interaction with active guidance.'}
            </p>
          </div>

          {/* Languages Detected Card */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Languages Identified
              </span>
              <Globe2 className="w-5 h-5 text-cyan-400" />
            </div>

            <div className="py-4 flex flex-wrap gap-2">
              {analytics?.languagesDetected.map((lang, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium font-mono"
                >
                  {lang}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              Autonomous language switching occurred dynamically without locale selection.
            </p>
          </div>

          {/* Session Metadata Card */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Session Volume & Actions
              </span>
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>

            <div className="py-4 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">
                  {transcripts.length}
                </span>
                <span className="text-xs text-slate-400">conversational turns</span>
              </div>
              <p className="text-xs text-brand-300 font-mono">
                {tools.length} autonomous tool executions
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              Duration: {session?.duration_seconds || 65}s • Voice: {session?.voice_name || 'Aoede/Puck'}
            </p>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Executive Conversation Summary</span>
          </div>

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            {analytics?.executiveSummary}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {analytics?.keyTopics.map((topic, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/80"
              >
                #{topic}
              </span>
            ))}
          </div>
        </div>

        {/* Action Items & Collected Data 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Items Checklist */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <ListTodo className="w-4 h-4" />
              <span>Follow-Up Action Items</span>
            </div>

            <div className="space-y-2.5">
              {analytics?.actionItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-200 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Collected Entity Data */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Extracted CRM & Entity Data</span>
            </div>

            <div className="space-y-2">
              {analytics && Object.keys(analytics.collectedData).length > 0 ? (
                Object.entries(analytics.collectedData).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-xs font-mono text-slate-400 capitalize">{key}:</span>
                    <span className="text-xs font-semibold text-white">{String(val)}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic p-3">No custom entity fields extracted for this call.</p>
              )}
            </div>
          </div>
        </div>

        {/* Full Transcript Replay Section */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4 text-brand-400" />
              <span>Complete Conversational Transcript Audit Log</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{transcripts.length} turns recorded</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {transcripts.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    t.speaker === 'user' ? 'bg-purple-600 text-white' : 'bg-cyan-600 text-white'
                  }`}
                >
                  {t.speaker === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 capitalize">{t.speaker}</span>
                      {t.detectedLanguage && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                          {t.detectedLanguage}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{t.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
