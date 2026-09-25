import { useState, useEffect, useRef, useCallback } from 'react';
import { PcmRecorder } from '../lib/pcmRecorder';
import { PcmStreamPlayer } from '../lib/pcmPlayer';
import { apiEndSession, apiSpeakTTS } from '../lib/api';
import { getStoredToken } from '../lib/supabaseClient';
import type { PersonaId, GeminiVoice, TranscriptEntry, ToolAuditRecord } from '../../../shared/schemas';

export type SessionConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'ended';

export interface UseGeminiLiveSessionOptions {
  sessionId: string;
  personaId: PersonaId;
  voiceName?: GeminiVoice;
  mode?: 'voice_live' | 'interactive_tts';
  onSessionEnded?: (analytics: any) => void;
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

  // WebSocket & Audio Pipeline Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<PcmRecorder | null>(null);
  const playerRef = useRef<PcmStreamPlayer | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const modelSpeechTimerRef = useRef<number | null>(null);

  // Trigger Barge-In
  const handleBargeIn = useCallback(() => {
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

  // Connect to Live Stream
  const connect = useCallback(async () => {
    if (status === 'connected' || status === 'connecting') return;

    setStatus('connecting');
    setErrorMessage(null);

    try {
      // 1. Initialize 24kHz Web Audio Player
      playerRef.current = new PcmStreamPlayer(24000);
      await playerRef.current.init();

      // 2. Initialize 16kHz AudioWorklet Recorder (if voice mode)
      if (mode === 'voice_live') {
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
      }

      // 3. Connect to Backend WebSocket
      const token = getStoredToken();
      let wsUrl = '';
      const customWs = import.meta.env.VITE_WS_URL;
      const customApi = import.meta.env.VITE_API_URL;

      if (customWs) {
        const baseWs = customWs.replace(/\/$/, '');
        wsUrl = `${baseWs}/api/live-stream?sessionId=${sessionId}&personaId=${personaId}&voiceName=${voiceName}&mode=${mode}&token=${encodeURIComponent(token)}`;
      } else if (customApi) {
        const cleanApi = customApi.replace(/\/$/, '');
        const wsProto = cleanApi.startsWith('https') ? 'wss:' : 'ws:';
        const wsHost = cleanApi.replace(/^https?:\/\//, '');
        wsUrl = `${wsProto}//${wsHost}/api/live-stream?sessionId=${sessionId}&personaId=${personaId}&voiceName=${voiceName}&mode=${mode}&token=${encodeURIComponent(token)}`;
      } else {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname === 'localhost' ? 'localhost:5000' : window.location.host;
        wsUrl = `${wsProtocol}//${wsHost}/api/live-stream?sessionId=${sessionId}&personaId=${personaId}&voiceName=${voiceName}&mode=${mode}&token=${encodeURIComponent(token)}`;
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
        console.error('[LiveSession] WebSocket error:', err);
        setStatus('error');
        if (window.location.hostname.includes('vercel.app') && !import.meta.env.VITE_WS_URL && !import.meta.env.VITE_API_URL) {
          setErrorMessage('Backend server connection required: Vercel hosts the frontend static UI. Please deploy the backend (Express + WebSockets) to Render or Railway and set VITE_API_URL / VITE_WS_URL in your Vercel Environment Variables.');
        } else {
          setErrorMessage('Failed to connect to real-time voice stream. Ensure your backend server is online and accessible.');
        }
      };

      socket.onclose = () => {
        console.log('[LiveSession] WebSocket closed.');
        if (status !== 'ended') {
          setStatus('disconnected');
        }
      };
    } catch (err: any) {
      console.error('[LiveSession] Initialization error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Error initializing audio session.');
    }
  }, [sessionId, personaId, voiceName, mode, status, isModelSpeaking, handleBargeIn, detectedLanguage.name]);

  // Send interactive text message
  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'client_text',
        sessionId,
        payload: { text }
      }));
    } else {
      // Direct REST fallback for TTS
      apiSpeakTTS(sessionId, text, voiceName).then((res) => {
        if (res.pcmBase64 && playerRef.current) {
          playerRef.current.playChunk(res.pcmBase64);
        }
        setTranscripts((prev) => [
          ...prev,
          {
            id: `tr_${Date.now()}_u`,
            sessionId,
            speaker: 'user',
            content: text,
            detectedLanguage: res.detectedLanguage,
            timestamp: new Date().toISOString()
          }
        ]);
      }).catch(err => {
        console.error('[LiveSession] TTS error:', err);
      });
    }
  }, [sessionId, voiceName]);

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
      console.error('[LiveSession] Error starting video stream:', err);
      setIsVideoEnabled(false);
      setIsScreenShareEnabled(false);
    }
  }, [isVideoEnabled, isScreenShareEnabled, sessionId]);

  // Toggle Microphone Mute
  const toggleMic = useCallback(() => {
    if (recorderRef.current) {
      const nextMuted = !isMicMuted;
      recorderRef.current.setMute(nextMuted);
      setIsMicMuted(nextMuted);
    }
  }, [isMicMuted]);

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
      console.error('[LiveSession] Error saving end session:', e);
    }
  }, [sessionId, detectedLanguage.name, onSessionEnded]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
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
    setActiveVisualDiagram
  };
}
