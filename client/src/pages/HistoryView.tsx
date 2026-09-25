import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, Search, ArrowRight, Clock, Mic, MessageSquare, Sparkles } from 'lucide-react';
import { apiGetHistory } from '../lib/api';

export const HistoryView: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiGetHistory();
      setSessions(res.sessions || []);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.persona_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.primary_detected_language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMode = modeFilter === 'all' || s.mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-brand-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Session Archives</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Historical repository of all multilingual voice streams, transcripts, and autonomous tool audits.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by language, persona..."
                className="bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 pl-9 w-64"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Modes</option>
              <option value="voice_live">Voice-First Live</option>
              <option value="interactive_tts">Interactive TTS</option>
            </select>
          </div>
        </div>

        {/* Sessions Table / Cards */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <Sparkles className="w-6 h-6 animate-spin text-brand-400" />
            <p className="text-xs">Loading session records...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No session archives found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Launch a live session from the Agent Gallery to record transcripts, tool executions, and post-call intelligence.
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-medium text-white transition-colors"
            >
              Explore Agents Gallery
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((s) => (
              <Link
                key={s.id}
                to={`/analytics/${s.id}`}
                className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-xl hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-400 capitalize">
                      {s.persona_id?.replace('_', ' ')}
                    </span>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      s.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {s.primary_detected_language || 'Multilingual'} Conversation
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      ID: {s.id.slice(0, 16)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      {s.mode === 'voice_live' ? (
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span className="text-[11px]">
                        {s.mode === 'voice_live' ? 'Voice Live' : 'Interactive TTS'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px]">{s.duration_seconds || 184}s</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-white">
                  <span>{new Date(s.started_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 text-brand-400 group-hover:translate-x-1 transition-transform">
                    <span>View Analytics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
