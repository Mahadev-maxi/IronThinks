import React, { useState } from 'react';
import { Send, Volume2, Sparkles, CornerDownLeft } from 'lucide-react';

interface InteractiveTTSTerminalProps {
  onSendMessage: (text: string) => void;
  suggestedPrompts?: string[];
  disabled?: boolean;
  className?: string;
}

export const InteractiveTTSTerminal: React.FC<InteractiveTTSTerminalProps> = ({
  onSendMessage,
  suggestedPrompts = [],
  disabled = false,
  className = ''
}) => {
  const [inputText, setInputText] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSelectPrompt = (prompt: string) => {
    if (disabled) return;
    onSendMessage(prompt);
  };

  return (
    <div className={`flex flex-col gap-2 p-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl ${className}`}>
      {/* Quick Prompts Chips */}
      {suggestedPrompts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0 ml-1" />
          {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPrompt(prompt)}
              className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all hover:scale-[1.02]"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={disabled}
            placeholder="Type in any language (English, Español, Français, हिन्दी, etc.)..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-slate-500 pointer-events-none">
            <CornerDownLeft className="w-3.5 h-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || disabled}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Volume2 className="w-4 h-4" />
          <span>Speak</span>
        </button>
      </form>
    </div>
  );
};
