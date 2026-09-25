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
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new Error(`Cannot reach backend API at ${url}. ${netErr.message}`);
  }

  const rawText = await response.text();
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { error: rawText || `HTTP ${response.status} ${response.statusText}` };
  }

  if (!response.ok) {
    if (response.status === 405) {
      throw new Error(
        `Backend API returned HTTP 405. If deployed on Vercel, set VITE_API_URL to your active backend server (e.g. Render, Railway, or Fly.io).`
      );
    }
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
