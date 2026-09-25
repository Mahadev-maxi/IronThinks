import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface LanguageIndicatorBadgeProps {
  language: string;
  code?: string;
  flag?: string;
  confidence?: number;
  className?: string;
}

export const LanguageIndicatorBadge: React.FC<LanguageIndicatorBadgeProps> = ({
  language,
  code = 'auto',
  flag = '🌐',
  confidence = 0.98,
  className = ''
}) => {
  const [isChanging, setIsChanging] = useState<boolean>(false);

  useEffect(() => {
    setIsChanging(true);
    const timer = setTimeout(() => setIsChanging(false), 800);
    return () => clearTimeout(timer);
  }, [language]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${isChanging
        ? 'bg-brand-500/20 border-brand-400 text-brand-300 scale-105 shadow-lg shadow-brand-500/20'
        : 'bg-slate-900/80 border-slate-700/70 text-slate-200'
        } backdrop-blur-md text-xs font-medium ${className}`}
      title={`Auto-detected language: ${language} (${code}) with ${(confidence * 100).toFixed(0)}% confidence`}
    >
      <span className="text-base select-none">{flag}</span>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold tracking-wide text-slate-100">{language}</span>
          {code !== 'auto' && (
            <span className="text-[10px] text-slate-400 uppercase font-mono px-1 py-0.5 rounded bg-slate-800">
              {code}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 pl-1 border-l border-slate-700/50">
        <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
        <span className="text-[10px] text-cyan-300">Auto-Detect (70+)</span>
      </div>
    </div>
  );
};
