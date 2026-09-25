import { useState, useEffect, useRef, useCallback } from 'react';
import { PcmRecorder } from '../lib/pcmRecorder';
import { PcmStreamPlayer } from '../lib/pcmPlayer';
import { apiEndSession } from '../lib/api';
import { getStoredToken } from '../lib/supabaseClient';
import { generateAgentResponse } from '../lib/geminiInBrowser';
import type { PersonaId, GeminiVoice, TranscriptEntry, ToolAuditRecord } from '../../../shared/schemas';

export type SessionConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'ended';

export interface UseGeminiLiveSessionOptions {
  sessionId: string;
  personaId: PersonaId;
  voiceName?: GeminiVoice;
  mode?: 'voice_live' | 'interactive_tts';
  onSessionEnded?: (analytics: any) => void;
}

export const SUPPORTED_LANGUAGES = [
  { name: 'Kannada', code: 'kn-IN', flag: '🇮🇳', nativeName: 'ಕನ್ನಡ' },
  { name: 'English', code: 'en-US', flag: '🇺🇸', nativeName: 'English' },
  { name: 'Hindi', code: 'hi-IN', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { name: 'Spanish', code: 'es-ES', flag: '🇪🇸', nativeName: 'Español' },
  { name: 'French', code: 'fr-FR', flag: '🇫🇷', nativeName: 'Français' },
  { name: 'German', code: 'de-DE', flag: '🇩🇪', nativeName: 'Deutsch' },
  { name: 'Italian', code: 'it-IT', flag: '🇮🇹', nativeName: 'Italiano' },
  { name: 'Portuguese', code: 'pt-BR', flag: '🇧🇷', nativeName: 'Português' },
  { name: 'Japanese', code: 'ja-JP', flag: '🇯🇵', nativeName: '日本語' },
  { name: 'Mandarin Chinese', code: 'zh-CN', flag: '🇨🇳', nativeName: '中文' },
  { name: 'Korean', code: 'ko-KR', flag: '🇰🇷', nativeName: '한국어' },
  { name: 'Arabic', code: 'ar-SA', flag: '🇸🇦', nativeName: 'العربية' },
  { name: 'Russian', code: 'ru-RU', flag: '🇷🇺', nativeName: 'Русский' },
  { name: 'Telugu', code: 'te-IN', flag: '🇮🇳', nativeName: 'తెలుగు' },
  { name: 'Tamil', code: 'ta-IN', flag: '🇮🇳', nativeName: 'தமிழ்' },
  { name: 'Malayalam', code: 'ml-IN', flag: '🇮🇳', nativeName: 'മലയാളം' },
  { name: 'Bengali', code: 'bn-IN', flag: '🇮🇳', nativeName: 'বাংলা' },
  { name: 'Gujarati', code: 'gu-IN', flag: '🇮🇳', nativeName: 'ગુજરાતી' },
  { name: 'Marathi', code: 'mr-IN', flag: '🇮🇳', nativeName: 'मराठी' },
];

const LANGUAGE_DETECTION_PATTERNS: Array<{
  regex: RegExp;
  name: string;
  code: string;
  flag: string;
}> = [
  // Kannada
  { regex: /[\u0C80-\u0CFF]|(?:kannada|namaskara|hegidira|hegiddira|beku|enu|yenu|dayavittu|dhanyavada|kannadadalli|kannad)/i, name: 'Kannada', code: 'kn-IN', flag: '🇮🇳' },
  // Telugu
  { regex: /[\u0C00-\u0C7F]|(?:telugu|namaskaram|ela|unnavu|dhanyavadalu)/i, name: 'Telugu', code: 'te-IN', flag: '🇮🇳' },
  // Tamil
  { regex: /[\u0B80-\u0BFF]|(?:tamil|vanakkam|eppadi|irukinga|nandri)/i, name: 'Tamil', code: 'ta-IN', flag: '🇮🇳' },
  // Malayalam
  { regex: /[\u0D00-\u0D7F]|(?:malayalam|namaskaram|enthokke|sukhamano|nanni)/i, name: 'Malayalam', code: 'ml-IN', flag: '🇮🇳' },
  // Hindi
  { regex: /[\u0900-\u097F]|(?:hindi|namaste|kya|hai|aap|kaise|shukriya|madad|theek)/i, name: 'Hindi', code: 'hi-IN', flag: '🇮🇳' },
  // Bengali
  { regex: /[\u0980-\u09FF]|(?:bengali|bangla|nomoshkar|dhonnobad)/i, name: 'Bengali', code: 'bn-IN', flag: '🇮🇳' },
  // Gujarati
  { regex: /[\u0A80-\u0AFF]|(?:gujarati|kem cho|aabhar)/i, name: 'Gujarati', code: 'gu-IN', flag: '🇮🇳' },
  // Japanese
  { regex: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]|(?:こんにちは|ありがとう|はい|です|ます)/i, name: 'Japanese', code: 'ja-JP', flag: '🇯🇵' },
  // Mandarin Chinese
  { regex: /[\u4e00-\u9fa5]/i, name: 'Mandarin Chinese', code: 'zh-CN', flag: '🇨🇳' },
  // Korean
  { regex: /[\uac00-\ud7af]/i, name: 'Korean', code: 'ko-KR', flag: '🇰🇷' },
  // Arabic
  { regex: /[\u0600-\u06FF]/i, name: 'Arabic', code: 'ar-SA', flag: '🇸🇦' },
  // Russian
  { regex: /[\u0400-\u04FF]|(?:privet|spasibo|kak|dela)/i, name: 'Russian', code: 'ru-RU', flag: '🇷🇺' },
  // Spanish
  { regex: /\b(?:hola|buenos|dias|tardes|gracias|por favor|necesito|ayuda|cita|consulta|como)\b/i, name: 'Spanish', code: 'es-ES', flag: '🇪🇸' },
  // French
  { regex: /\b(?:bonjour|bonsoir|merci|s'il vous plait|aide|rendez-vous|comment)\b/i, name: 'French', code: 'fr-FR', flag: '🇫🇷' },
  // German
  { regex: /\b(?:guten|hallo|danke|bitte|termin|hilfe|wie|geht)\b/i, name: 'German', code: 'de-DE', flag: '🇩🇪' },
  // Italian
  { regex: /\b(?:ciao|buongiorno|grazie|per favore|aiuto|come|posso)\b/i, name: 'Italian', code: 'it-IT', flag: '🇮🇹' },
  // Portuguese
  { regex: /\b(?:olá|ola|obrigado|obrigada|por favor|ajuda|consulta)\b/i, name: 'Portuguese', code: 'pt-BR', flag: '🇧🇷' }
];

function detectOrSwitchLanguage(
  text: string,
  current: { name: string; code: string; flag: string; confidence: number }
): { name: string; code: string; flag: string; confidence: number } {
  const lower = text.toLowerCase().trim();

  // 1. Explicit language switch commands (e.g. "switch the language into Kannada", "which language to Kannada", "speak in Kannada")
  const switchMatch =
    lower.match(/(?:switch|change|set|speak|talk|convert|use|which)?\s*(?:the\s*)?language\s*(?:to|in|into)\s*([a-z]+)/i) ||
    lower.match(/(?:speak|talk|converse)\s*in\s*([a-z]+)/i) ||
    lower.match(/switch\s*to\s*([a-z]+)/i);

  if (switchMatch && switchMatch[1]) {
    const targetName = switchMatch[1].toLowerCase();
    const found = SUPPORTED_LANGUAGES.find(
      (l) => l.name.toLowerCase().startsWith(targetName) || targetName.startsWith(l.name.toLowerCase())
    );
    if (found) {
      return { name: found.name, code: found.code, flag: found.flag, confidence: 1.0 };
    }
  }

  // 2. Direct language name mentioned as isolated command
  for (const lang of SUPPORTED_LANGUAGES) {
    const langLow = lang.name.toLowerCase();
    if (lower === langLow || lower === `in ${langLow}` || lower.includes(`into ${langLow}`) || lower.includes(`to ${langLow}`)) {
      return { name: lang.name, code: lang.code, flag: lang.flag, confidence: 1.0 };
    }
  }

  // 3. Pattern / Unicode / Keyword matching
  for (const pat of LANGUAGE_DETECTION_PATTERNS) {
    if (pat.regex.test(text)) {
      return { name: pat.name, code: pat.code, flag: pat.flag, confidence: 0.98 };
    }
  }

  // 4. Preserve existing non-English language on short affirmative or neutral utterances
  if (
    current.code !== 'auto' &&
    current.name !== 'Auto-Detecting' &&
    (text.split(/\s+/).length <= 3 ||
      /^(?:yes|no|ok|okay|hello|hi|hey|thanks|thank you|sure|right|speaking|fine|good)\b/i.test(lower))
  ) {
    return current;
  }

  // 5. Default fallback to English
  return { name: 'English', code: 'en-US', flag: '🇺🇸', confidence: 0.98 };
}

export function useGeminiLiveSession(options: UseGeminiLiveSessionOptions) {
  const { sessionId, personaId, voiceName = 'Puck', mode = 'voice_live', onSessionEnded } = options;

  const [status, setStatus] = useState<SessionConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio States
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [userAudioLevel, setUserAudioLevel] = useState<number>(0);
  const [isModelSpeaking, setIsModelSpeaking] = useState<boolean>(false);

  // Multilingual & Transcript States
  const [detectedLanguage, setDetectedLanguage] = useState<{
    name: string;
    code: string;
    flag: string;
    confidence: number;
  }>({ name: 'Auto-Detecting', code: 'auto', flag: '🌐', confidence: 1.0 });

  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const transcriptsRef = useRef<TranscriptEntry[]>([]);
  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);
  const [toolAudits, setToolAudits] = useState<ToolAuditRecord[]>([]);
  const [activeVisualDiagram, setActiveVisualDiagram] = useState<{
    title: string;
    diagramType: string;
    contentSummary: string;
  } | null>(null);

  // Vision Streaming States
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(false);
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState<boolean>(false);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);

  // Live Speech Recognition States & Refs
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimSpeech, setInterimSpeech] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(true);
  const speechRestartTimerRef = useRef<number | null>(null);
  const consecutiveNetworkErrorsRef = useRef<number>(0);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const isRecognitionStartingRef = useRef<boolean>(false);
  const lastSpeechNetworkWarnTimeRef = useRef<number>(0);
  const sendTextMessageRef = useRef<(text: string) => void | Promise<void>>(() => {});
  const statusRef = useRef<SessionConnectionStatus>(status);
  const speechDebounceTimerRef = useRef<number | null>(null);
  const accumulatedSpeechRef = useRef<string>('');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // WebSocket & Pipeline Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<PcmRecorder | null>(null);
  const playerRef = useRef<PcmStreamPlayer | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const modelSpeechTimerRef = useRef<number | null>(null);
  const isBrowserModeRef = useRef<boolean>(false);

  // Browser Speech Synthesis
  const speakWithBrowserSpeech = useCallback((text: string, langCode: string = 'en-US') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select closest matching voice if available
      try {
        const voices = window.speechSynthesis.getVoices?.() || [];
        const match = voices.find(
          (v) => v.lang === langCode || v.lang.startsWith(langCode.split('-')[0])
        );
        if (match) utterance.voice = match;
      } catch {}

      utterance.onstart = () => setIsModelSpeaking(true);
      utterance.onend = () => setIsModelSpeaking(false);
      utterance.onerror = () => setIsModelSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsModelSpeaking(false);
    }
  }, []);

  // Trigger Barge-In
  const handleBargeIn = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (playerRef.current) {
      playerRef.current.flushBargeIn();
    }
    setIsModelSpeaking(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_interruption',
        sessionId
      }));
    }
  }, [sessionId]);

  // Start continuous Web Speech recognition
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecogClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecogClass) {
      return;
    }

    if (isRecognitionActiveRef.current || isRecognitionStartingRef.current) {
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const recognition = new SpeechRecogClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = detectedLanguage.code !== 'auto' ? detectedLanguage.code : (navigator.language || 'en-US');

      recognition.onstart = () => {
        isRecognitionStartingRef.current = false;
        isRecognitionActiveRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        // Reset network error counter upon successful recognition
        consecutiveNetworkErrorsRef.current = 0;

        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            const transcript = item[0].transcript;
            if (item.isFinal) {
              finalChunk += transcript;
            } else {
              currentInterim += transcript;
            }
          }
        }

        if (currentInterim) {
          setInterimSpeech(currentInterim);
        }

        const trimmed = finalChunk.trim();
        if (trimmed) {
          setInterimSpeech('');
          handleBargeIn();

          if (speechDebounceTimerRef.current) {
            clearTimeout(speechDebounceTimerRef.current);
            speechDebounceTimerRef.current = null;
          }

          accumulatedSpeechRef.current = (accumulatedSpeechRef.current ? `${accumulatedSpeechRef.current} ` : '') + trimmed;

          // Short phrases like "my friend" wait slightly longer to capture the subsequent clause
          const words = accumulatedSpeechRef.current.trim().split(/\s+/);
          const debounceMs = words.length <= 2 ? 650 : 450;

          speechDebounceTimerRef.current = window.setTimeout(() => {
            const completeUtterance = accumulatedSpeechRef.current.trim();
            accumulatedSpeechRef.current = '';
            if (completeUtterance) {
              const lowerUtterance = completeUtterance.toLowerCase();
              const noiseFillers = new Set(['only', 'um', 'uh', 'ah', 'er', 'hmm', 'the', 'a', 'an']);
              // Ignore single isolated filler noises or sub-3 letter non-words
              if (noiseFillers.has(lowerUtterance)) {
                return;
              }
              if (completeUtterance.length < 3 && !['hi', 'no', 'ok', 'yo'].includes(lowerUtterance)) {
                return;
              }
              console.log('[SpeechRecognition] Complete voice utterance captured:', completeUtterance);
              sendTextMessageRef.current(completeUtterance);
            }
          }, debounceMs);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'network') {
          consecutiveNetworkErrorsRef.current += 1;
          const now = Date.now();
          if (now - lastSpeechNetworkWarnTimeRef.current > 30000) {
            console.info('[SpeechRecognition] Web Speech endpoint temporary network pause, applying backoff.');
            lastSpeechNetworkWarnTimeRef.current = now;
          }
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.info('[SpeechRecognition] Status:', e.error);
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        isRecognitionStartingRef.current = false;
        setIsListening(false);
        if (speechRestartTimerRef.current) {
          clearTimeout(speechRestartTimerRef.current);
          speechRestartTimerRef.current = null;
        }

        // Exponential backoff if repeated network errors: 1.5s -> 3s -> 6s -> max 15s
        if (shouldListenRef.current && !isMicMuted && statusRef.current !== 'ended') {
          const errCount = consecutiveNetworkErrorsRef.current;
          const delay = errCount > 0
            ? Math.min(15000, Math.floor(1000 * Math.pow(1.8, Math.min(errCount, 5))))
            : 300;

          speechRestartTimerRef.current = window.setTimeout(() => {
            if (
              shouldListenRef.current &&
              !isMicMuted &&
              statusRef.current !== 'ended' &&
              !isRecognitionActiveRef.current &&
              !isRecognitionStartingRef.current
            ) {
              try {
                isRecognitionStartingRef.current = true;
                recognition.start();
              } catch {
                isRecognitionStartingRef.current = false;
              }
            }
          }, delay);
        }
      };

      isRecognitionStartingRef.current = true;
      recognition.start();
      recognitionRef.current = recognition;
      shouldListenRef.current = true;
      setIsListening(true);
    } catch {
      isRecognitionStartingRef.current = false;
      isRecognitionActiveRef.current = false;
    }
  }, [detectedLanguage.code, handleBargeIn, isMicMuted]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    isRecognitionActiveRef.current = false;
    isRecognitionStartingRef.current = false;
    setIsListening(false);
    setInterimSpeech('');
    if (speechRestartTimerRef.current) {
      clearTimeout(speechRestartTimerRef.current);
      speechRestartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
  }, []);

  // Activate Autonomous Browser Voice Mode (for static hosts like Vercel or offline backend)
  const activateAutonomousBrowserMode = useCallback(() => {
    if (isBrowserModeRef.current) return;
    isBrowserModeRef.current = true;
    try { localStorage.setItem(`ironthinks_autonomous_${sessionId}`, 'true'); } catch {}
    console.log('[LiveSession] Activating Autonomous In-Browser Voice Mode');

    setStatus('connected');
    setErrorMessage(null);

    let greeting = 'Hello and welcome! I am your Multilingual Agent. How can I assist you today?';
    if (personaId === 'intake_specialist') {
      greeting = 'Hello and welcome! I am your Multilingual Intake Specialist. How can I assist with your onboarding or scheduling today?';
    } else if (personaId === 'polyglot_tutor') {
      greeting = 'Welcome to your Socratic language studio! Which language or concept would you like to explore together?';
    } else if (personaId === 'health_concierge') {
      greeting = 'Hello, I am your Health Concierge and Triage Assistant. How can I support your wellbeing or care questions today?';
    } else if (personaId === 'wealth_advisor') {
      greeting = 'Greetings! I am your Wealth Management Guide. What financial calculations or portfolio concepts can we analyze?';
    }

    const greetingId = `tr_${Date.now()}_greeting`;
    const initialEntry: TranscriptEntry = {
      id: greetingId,
      sessionId,
      speaker: 'model',
      content: greeting,
      detectedLanguage: 'English',
      timestamp: new Date().toISOString()
    };

    setTranscripts((prev) => {
      if (prev.length > 0) return prev;
      try {
        localStorage.setItem(`ironthinks_transcripts_${sessionId}`, JSON.stringify([initialEntry]));
      } catch {}
      return [initialEntry];
    });

    // Speak initial greeting aloud
    setTimeout(() => {
      speakWithBrowserSpeech(greeting, 'en-US');
    }, 600);

    // Start listening to the microphone for user speech
    if (mode === 'voice_live' && !isMicMuted) {
      setTimeout(() => {
        startListening();
      }, 1000);
    }
  }, [personaId, sessionId, speakWithBrowserSpeech, mode, isMicMuted, startListening]);

  // Connect to Live Stream
  const connect = useCallback(async () => {
    if (status === 'connected' || status === 'connecting') return;

    setStatus('connecting');
    setErrorMessage(null);

    try {
      // 1. Initialize 24kHz Web Audio Player
      try {
        playerRef.current = new PcmStreamPlayer(24000);
        await playerRef.current.init();
      } catch (playErr) {
        console.warn('[LiveSession] Audio player setup notice:', playErr);
      }

      // 2. Initialize 16kHz Audio Recorder (if voice mode)
      if (mode === 'voice_live') {
        try {
          recorderRef.current = new PcmRecorder({
            onAudioChunk: (pcmBase64) => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'realtime_audio',
                  sessionId,
                  payload: { pcmBase64 }
                }));
              }
            },
            onVolumeChange: (vol) => {
              setUserAudioLevel(vol);

              // Instant Barge-In detection: if user speaks loudly while model audio is playing, cancel model audio!
              if (vol > 0.28 && isModelSpeaking) {
                handleBargeIn();
              }
            }
          });

          await recorderRef.current.start();
        } catch (recErr) {
          console.warn('[LiveSession] Audio recorder setup notice:', recErr);
        }
      }

      // 3. Connect to Backend WebSocket (or start In-Browser Autonomous Mode if on static host)
      const token = getStoredToken();
      let wsUrl = '';
      const customWs = import.meta.env.VITE_WS_URL;
      const customApi = import.meta.env.VITE_API_URL;
      const isStaticHosting = !customWs && (
        !customApi ||
        customApi.includes('vercel.app') ||
        (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (!customApi || customApi.includes(window.location.hostname)))
      );

      if (isStaticHosting) {
        console.log('[LiveSession] Static hosting deployment detected without external WebSocket URL. Starting Autonomous In-Browser Voice Mode directly.');
        activateAutonomousBrowserMode();
        return;
      }

      if (customWs) {
        const baseWs = customWs.replace(/\/$/, '');
        wsUrl = `${baseWs}/api/live-stream?sessionId=${sessionId}&personaId=${personaId}&voiceName=${voiceName}&mode=${mode}&token=${encodeURIComponent(token)}`;
      } else if (customApi) {
        const cleanApi = customApi.replace(/\/$/, '');
        const wsProto = cleanApi.startsWith('https') ? 'wss:' : 'ws:';
        const wsHost = cleanApi.replace(/^https?:\/\//, '');
        wsUrl = `${wsProto}//${wsHost}/api/live-stream?sessionId=${sessionId}&personaId=${personaId}&voiceName=${voiceName}&mode=${mode}&token=${encodeURIComponent(token)}`;
      } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//localhost:5000/api/live-stream?sessionId=${sessionId}&personaId=${personaId}&voiceName=${voiceName}&mode=${mode}&token=${encodeURIComponent(token)}`;
      } else {
        console.log('[LiveSession] Starting Autonomous In-Browser Voice Mode directly.');
        activateAutonomousBrowserMode();
        return;
      }

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[LiveSession] WebSocket connection established.');
        setStatus('connected');

        // Setup keepalive ping
        pingIntervalRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      socket.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'realtime_audio': {
              const { pcmBase64 } = msg.payload || {};
              if (pcmBase64 && playerRef.current) {
                setIsModelSpeaking(true);
                if (modelSpeechTimerRef.current) {
                  clearTimeout(modelSpeechTimerRef.current);
                }
                // Mark model speech as finished after chunk play buffer window
                modelSpeechTimerRef.current = window.setTimeout(() => {
                  setIsModelSpeaking(false);
                }, 1200);

                await playerRef.current.playChunk(pcmBase64);
              }
              break;
            }

            case 'model_transcript': {
              const { text, detectedLanguage: lang } = msg.payload || {};
              if (text) {
                setTranscripts((prev) => [
                  ...prev,
                  {
                    id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    sessionId,
                    speaker: 'model',
                    content: text,
                    detectedLanguage: lang || detectedLanguage.name,
                    timestamp: new Date().toISOString()
                  }
                ]);
              }
              break;
            }

            case 'user_transcript': {
              const { text, detectedLanguage: lang } = msg.payload || {};
              if (text) {
                setTranscripts((prev) => [
                  ...prev,
                  {
                    id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    sessionId,
                    speaker: 'user',
                    content: text,
                    detectedLanguage: lang || detectedLanguage.name,
                    timestamp: new Date().toISOString()
                  }
                ]);
              }
              break;
            }

            case 'language_detected': {
              const { language, code, flag, confidence } = msg.payload || {};
              if (language) {
                setDetectedLanguage({
                  name: language,
                  code: code || 'auto',
                  flag: flag || '🌐',
                  confidence: confidence || 0.98
                });
              }
              break;
            }

            case 'interruption_detected': {
              handleBargeIn();
              break;
            }

            case 'tool_call': {
              const { id, toolName, arguments: toolArgs } = msg.payload || {};
              setToolAudits((prev) => [
                ...prev,
                {
                  id: id || `tool_${Date.now()}`,
                  sessionId,
                  toolName,
                  arguments: toolArgs || {},
                  executionStatus: 'pending',
                  executedAt: new Date().toISOString()
                }
              ]);

              // Check if visual diagram tool was invoked
              if (toolName === 'displayVisualDiagram' && toolArgs) {
                setActiveVisualDiagram({
                  title: toolArgs.title || 'Concept Diagram',
                  diagramType: toolArgs.diagramType || 'grammar_table',
                  contentSummary: toolArgs.contentSummary || ''
                });
              }
              break;
            }

            case 'tool_result_ack': {
              const { id, toolName, result, status: toolStatus } = msg.payload || {};
              setToolAudits((prev) =>
                prev.map((item) =>
                  item.id === id || (item.toolName === toolName && item.executionStatus === 'pending')
                    ? { ...item, result, executionStatus: toolStatus === 'success' ? 'success' : 'error' }
                    : item
                )
              );
              break;
            }

            case 'session_error': {
              setErrorMessage(msg.payload?.message || 'Session error occurred.');
              break;
            }
          }
        } catch (e) {
          console.error('[LiveSession] Error handling socket message:', e);
        }
      };

      socket.onerror = (err) => {
        console.warn('[LiveSession] Remote WebSocket server not reachable on this host. Activating Autonomous In-Browser Voice Mode:', err);
        activateAutonomousBrowserMode();
      };

      socket.onclose = () => {
        console.log('[LiveSession] WebSocket closed.');
        if (status !== 'ended' && !isBrowserModeRef.current) {
          activateAutonomousBrowserMode();
        }
      };
    } catch (err: any) {
      console.warn('[LiveSession] Initialization error, falling back to In-Browser Voice Mode:', err);
      activateAutonomousBrowserMode();
    }
  }, [sessionId, personaId, voiceName, mode, status, isModelSpeaking, handleBargeIn, detectedLanguage.name, activateAutonomousBrowserMode]);

  // Send interactive text message
  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'client_text',
        sessionId,
        payload: { text }
      }));
    } else {
      // Autonomous in-browser dialogue with real-time multilingual and tool-calling
      const userEntry: TranscriptEntry = {
        id: `tr_${Date.now()}_u`,
        sessionId,
        speaker: 'user',
        content: text,
        detectedLanguage: 'English',
        timestamp: new Date().toISOString()
      };

      // Detect or switch language intelligently based on text and intent
      const detected = detectOrSwitchLanguage(text, detectedLanguage);
      userEntry.detectedLanguage = detected.name;
      setDetectedLanguage(detected);

      // Immediately render user turn in UI
      setTranscripts((prev) => {
        const next = [...prev, userEntry];
        try { localStorage.setItem(`ironthinks_transcripts_${sessionId}`, JSON.stringify(next)); } catch {}
        return next;
      });

      // Generate dynamic response via Direct Gemini Flash or our smart contextual agent engine
      const currentHistory = [...transcriptsRef.current, userEntry];
      const agentResult = await generateAgentResponse({
        personaId,
        userText: text,
        history: currentHistory,
        detectedLanguage: detected,
        sessionId
      });

      // Execute tool audit if tool was invoked
      if (agentResult.toolRecord) {
        setToolAudits((prev) => {
          const next = [...prev, agentResult.toolRecord!];
          try { localStorage.setItem(`ironthinks_tools_${sessionId}`, JSON.stringify(next)); } catch {}
          return next;
        });
      }

      // Display visual diagram if requested
      if (agentResult.visualDiagram) {
        setActiveVisualDiagram(agentResult.visualDiagram);
      }

      const modelEntry: TranscriptEntry = {
        id: `tr_${Date.now()}_m`,
        sessionId,
        speaker: 'model',
        content: agentResult.replyText,
        detectedLanguage: detected.name,
        timestamp: new Date().toISOString()
      };

      setTranscripts((prev) => {
        const next = [...prev, modelEntry];
        try { localStorage.setItem(`ironthinks_transcripts_${sessionId}`, JSON.stringify(next)); } catch {}
        return next;
      });

      // Speak response aloud in detected language
      speakWithBrowserSpeech(agentResult.replyText, detected.code);
    }
  }, [sessionId, personaId, speakWithBrowserSpeech]);

  // Keep sendTextMessageRef updated for SpeechRecognition callback
  useEffect(() => {
    sendTextMessageRef.current = sendTextMessage;
  }, [sendTextMessage]);

  // Start / Stop Video Streaming at 1 FPS
  const toggleVideo = useCallback(async (screenShare: boolean = false) => {
    if (isVideoEnabled || isScreenShareEnabled) {
      // Stop video
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      setIsVideoEnabled(false);
      setIsScreenShareEnabled(false);
      return;
    }

    try {
      let stream: MediaStream;
      if (screenShare) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 } });
        setIsScreenShareEnabled(true);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } }
        });
        setIsVideoEnabled(true);
      }

      videoStreamRef.current = stream;

      // Create hidden video element and offscreen canvas for 1 FPS JPEG capture
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      // Emit 1 FPS frame to live session
      videoIntervalRef.current = window.setInterval(() => {
        if (!ctx || !stream.active || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const imageBase64 = dataUrl.split(',')[1];

        wsRef.current.send(JSON.stringify({
          type: 'vision_frame',
          sessionId,
          payload: { imageBase64 }
        }));
      }, 1000); // 1 FPS
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        console.warn('[LiveSession] Camera or screen share permission dismissed or denied by user.');
      } else {
        console.error('[LiveSession] Error starting video stream:', err);
      }
      setIsVideoEnabled(false);
      setIsScreenShareEnabled(false);
    }
  }, [isVideoEnabled, isScreenShareEnabled, sessionId]);

  // Toggle Microphone Mute
  const toggleMic = useCallback(() => {
    const nextMuted = !isMicMuted;
    if (recorderRef.current) {
      recorderRef.current.setMute(nextMuted);
    }
    setIsMicMuted(nextMuted);
    if (nextMuted) {
      stopListening();
    } else {
      startListening();
    }
  }, [isMicMuted, startListening, stopListening]);

  // Toggle Speaker Mute
  const toggleSpeaker = useCallback(() => {
    if (playerRef.current) {
      const nextMuted = !isSpeakerMuted;
      playerRef.current.setMute(nextMuted);
      setIsSpeakerMuted(nextMuted);
    }
  }, [isSpeakerMuted]);

  // End Session cleanly
  const endSession = useCallback(async () => {
    setStatus('ended');
    stopListening();
    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
      speechDebounceTimerRef.current = null;
    }
    accumulatedSpeechRef.current = '';
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clean up intervals
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    // Stop streams
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const res = await apiEndSession(sessionId, detectedLanguage.name);
      if (onSessionEnded) {
        onSessionEnded(res.analytics);
      }
      return res;
    } catch (e) {
      console.warn('[LiveSession] Notice finalizing session:', e);
    }
  }, [sessionId, detectedLanguage.name, onSessionEnded, stopListening]);

  const setLanguage = useCallback((lang: { name: string; code: string; flag: string }) => {
    setDetectedLanguage({ ...lang, confidence: 1.0 });
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      stopListening();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
      if (recorderRef.current) recorderRef.current.stop();
      if (playerRef.current) playerRef.current.stop();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return {
    status,
    errorMessage,
    isMicMuted,
    isSpeakerMuted,
    userAudioLevel,
    isModelSpeaking,
    isListening,
    interimSpeech,
    detectedLanguage,
    transcripts,
    toolAudits,
    activeVisualDiagram,
    isVideoEnabled,
    isScreenShareEnabled,
    player: playerRef.current,
    connect,
    sendTextMessage,
    handleBargeIn,
    toggleMic,
    toggleSpeaker,
    toggleVideo,
    endSession,
    setActiveVisualDiagram,
    setLanguage
  };
}
