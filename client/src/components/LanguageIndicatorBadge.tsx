import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../hooks/useGeminiLiveSession';

interface LanguageIndicatorBadgeProps {
  language: string;
  code?: string;
  flag?: string;
  confidence?: number;
  className?: string;
  onSelectLanguage?: (lang: { name: string; code: string; flag: string }) => void;
}

export const LanguageIndicatorBadge: React.FC<LanguageIndicatorBadgeProps> = ({
  language,
  code = 'auto',
  flag = '🌐',
  confidence = 0.98,
  className = '',
  onSelectLanguage
}) => {
  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsChanging(true);
    const timer = setTimeout(() => setIsChanging(false), 800);
    return () => clearTimeout(timer);
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => onSelectLanguage && setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
          isChanging
            ? 'bg-brand-500/20 border-brand-400 text-brand-300 scale-105 shadow-lg shadow-brand-500/20'
            : 'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:border-slate-500'
        } backdrop-blur-md text-xs font-medium cursor-pointer ${className}`}
        title={`Language: ${language} (${code}) [${(confidence * 100).toFixed(0)}% confidence]. Click to switch.`}
      >
        <span className="text-base select-none">{flag}</span>
        <div className="flex flex-col text-left">
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
          <span className="text-[10px] text-cyan-300">Live (70+)</span>
          {onSelectLanguage && <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />}
        </div>
      </button>

      {/* Language Selector Dropdown */}
      {isOpen && onSelectLanguage && (
        <div className="absolute top-full left-0 mt-2 w-64 max-h-72 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl p-2 z-50 space-y-1">
          <div className="px-2 py-1 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800">
            Select Language
          </div>
          {SUPPORTED_LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                onSelectLanguage(item);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                language.toLowerCase() === item.name.toLowerCase()
                  ? 'bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.flag}</span>
                <span>{item.name}</span>
                <span className="text-[11px] text-slate-400">({item.nativeName})</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">{item.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
