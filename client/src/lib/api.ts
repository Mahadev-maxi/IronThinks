import { getStoredToken } from './supabaseClient';
import type { StartSessionInput, AnalyticsResponse, AgentPersonaConfig } from '../../../shared/schemas';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }
  return data;
}

export async function apiStartSession(input: StartSessionInput): Promise<{
  sessionId: string;
  wsEndpoint: string;
  session: any;
}> {
  return fetchWithAuth('/api/sessions/start', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function apiEndSession(sessionId: string, primaryLanguage?: string): Promise<{
  session: any;
  analytics: AnalyticsResponse;
}> {
  return fetchWithAuth(`/api/sessions/${sessionId}/end`, {
    method: 'POST',
    body: JSON.stringify({ primaryLanguage }),
  });
}

export async function apiSpeakTTS(sessionId: string, text: string, voiceName: string = 'Puck'): Promise<{
  pcmBase64: string;
  sampleRate: number;
  detectedLanguage: string;
  text: string;
}> {
  return fetchWithAuth('/api/sessions/tts-speak', {
    method: 'POST',
    body: JSON.stringify({ sessionId, text, voiceName }),
  });
}

export async function apiGetHistory(): Promise<{
  sessions: any[];
  count: number;
}> {
  return fetchWithAuth('/api/sessions/history');
}

export async function apiGetAnalytics(sessionId: string): Promise<{
  sessionId: string;
  session: any;
  analytics: AnalyticsResponse;
  transcripts: any[];
  tools: any[];
}> {
  return fetchWithAuth(`/api/sessions/${sessionId}/analytics`);
}

export async function apiReanalyze(sessionId: string): Promise<{
  analytics: AnalyticsResponse;
}> {
  return fetchWithAuth(`/api/sessions/${sessionId}/reanalyze`, {
    method: 'POST',
  });
}

export async function apiGetPersonas(): Promise<{
  personas: AgentPersonaConfig[];
}> {
  return fetchWithAuth('/api/personas');
}

export async function apiGetHealth(): Promise<any> {
  return fetchWithAuth('/api/health');
}
