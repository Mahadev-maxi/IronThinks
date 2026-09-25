import React, { useState } from 'react';
import { Wrench, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import type { ToolAuditRecord } from '../../../shared/schemas';

interface ToolAuditDrawerProps {
  tools: ToolAuditRecord[];
  className?: string;
}

export const ToolAuditDrawer: React.FC<ToolAuditDrawerProps> = ({ tools, className = '' }) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">Agentic Tool Audit</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-amber-300 font-mono">
            {tools.length} executed
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Autonomous Actions</span>
      </div>

      {/* Tool Executions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {tools.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-2">
            <Terminal className="w-8 h-8 text-slate-600 animate-pulse" />
            <p className="text-sm font-medium text-slate-400">No autonomous tools invoked yet.</p>
            <p className="text-xs text-slate-500 max-w-xs">
              When the AI model decides to schedule an appointment, check calendars, calculate compound growth, or evaluate symptoms, tool execution audits appear in real time here.
            </p>
          </div>
        ) : (
          tools.map((record) => {
            const isExpanded = expandedIds[record.id] ?? true;
            const isSuccess = record.executionStatus === 'success';
            const isPending = record.executionStatus === 'pending';

            return (
              <div
                key={record.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden transition-all duration-200 hover:border-slate-700"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(record.id)}
                  className="flex items-center justify-between p-3 cursor-pointer bg-slate-900/60 hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-mono text-xs font-semibold text-amber-300">
                      {record.toolName}()
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3 animate-spin" />
                        Executing
                      </span>
                    ) : isSuccess ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="p-3 border-t border-slate-800/80 space-y-2.5 text-xs bg-slate-950/90 font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider mb-1">
                        Arguments
                      </div>
                      <pre className="p-2 rounded bg-slate-900 text-slate-300 overflow-x-auto text-[11px]">
                        {JSON.stringify(record.arguments, null, 2)}
                      </pre>
                    </div>

                    {record.result && (
                      <div>
                        <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider mb-1">
                          Returned Result
                        </div>
                        <pre className="p-2 rounded bg-slate-900 text-emerald-300/90 overflow-x-auto text-[11px]">
                          {JSON.stringify(record.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 font-sans pt-1">
                      Executed at: {new Date(record.executedAt).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
