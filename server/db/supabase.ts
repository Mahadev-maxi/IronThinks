import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isLiveSupabase = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('mock-supabase') &&
  supabaseServiceKey &&
  !supabaseServiceKey.includes('mock-supabase')
);

let _supabaseClient: SupabaseClient | null = null;

if (isLiveSupabase) {
  try {
    _supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[Supabase] Initialized live Supabase Cloud client with Service Role.');
  } catch (err: any) {
    console.warn('[Supabase] Could not initialize live Supabase client, falling back to in-memory store:', err.message);
  }
} else {
  console.log('[Supabase] Running with in-memory resilient data repository (Local/Demo mode).');
}

export const supabase = _supabaseClient;

// -----------------------------------------------------------------------------
// In-Memory Resilient Store for Local / Offline / Demo Operation
// -----------------------------------------------------------------------------
interface InMemProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  preferred_language: string;
  created_at: string;
}

interface InMemVoiceSession {
  id: string;
  user_id: string;
  persona_id: string;
  mode: 'voice_live' | 'interactive_tts';
  primary_detected_language: string;
  voice_name: string;
  status: 'active' | 'completed' | 'failed' | 'terminated';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  metadata: Record<string, any>;
}

interface InMemTranscript {
  id: string;
  session_id: string;
  speaker: 'user' | 'model' | 'system';
  content: string;
  detected_language?: string;
  timestamp: string;
  audio_offset_ms: number;
}

interface InMemToolExecution {
  id: string;
  session_id: string;
  tool_name: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
  execution_status: 'pending' | 'success' | 'error';
  executed_at: string;
}

interface InMemAnalytics {
  id: string;
  session_id: string;
  executive_summary: string;
  sentiment_score: number;
  languages_detected: string[];
  key_topics: string[];
  action_items: string[];
  collected_data: Record<string, any>;
  created_at: string;
}

class InMemoryRepository {
  public profiles = new Map<string, InMemProfile>();
  public sessions = new Map<string, InMemVoiceSession>();
  public transcripts = new Map<string, InMemTranscript[]>();
  public toolExecutions = new Map<string, InMemToolExecution[]>();
  public analytics = new Map<string, InMemAnalytics>();

  constructor() {
    // Seed default demo profile
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    this.profiles.set(demoUserId, {
      id: demoUserId,
      email: 'alex.director@ironthinks.ai',
      full_name: 'Alex Director',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      preferred_language: 'auto',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    });

    // Seed a historical session with transcripts and analytics for rich UI showcase
    const sampleSessionId = '00000000-0000-0000-0000-000000000099';
    this.sessions.set(sampleSessionId, {
      id: sampleSessionId,
      user_id: demoUserId,
      persona_id: 'intake_specialist',
      mode: 'voice_live',
      primary_detected_language: 'Spanish',
      voice_name: 'Aoede',
      status: 'completed',
      started_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      ended_at: new Date(Date.now() - 3600000 * 2 + 184000).toISOString(),
      duration_seconds: 184,
      metadata: { device: 'Web Desktop Chrome', region: 'us-east' }
    });

    this.transcripts.set(sampleSessionId, [
      {
        id: 'tr-1',
        session_id: sampleSessionId,
        speaker: 'model',
        content: 'Hello! I am your Multilingual Intake Specialist. How can I assist you with onboarding or scheduling today?',
        detected_language: 'English',
        timestamp: new Date(Date.now() - 3600000 * 2 + 2000).toISOString(),
        audio_offset_ms: 2000
      },
      {
        id: 'tr-2',
        session_id: sampleSessionId,
        speaker: 'user',
        content: 'Hola, buenas tardes. Necesito agendar una consulta para mi equipo de 20 personas sobre la plataforma.',
        detected_language: 'Spanish',
        timestamp: new Date(Date.now() - 3600000 * 2 + 15000).toISOString(),
        audio_offset_ms: 15000
      },
      {
        id: 'tr-3',
        session_id: sampleSessionId,
        speaker: 'model',
        content: '¡Con mucho gusto! Puedo ayudarte a programar esa sesión de demostración para tu equipo. ¿Cuál es tu nombre completo y correo electrónico?',
        detected_language: 'Spanish',
        timestamp: new Date(Date.now() - 3600000 * 2 + 25000).toISOString(),
        audio_offset_ms: 25000
      }
    ]);

    this.toolExecutions.set(sampleSessionId, [
      {
        id: 'tx-1',
        session_id: sampleSessionId,
        tool_name: 'collectLeadInfo',
        arguments: { fullName: 'Elena Morales', companyName: 'Fintech Soluciones', budgetOrNeeds: 'Enterprise tier for 20 seats' },
        result: { leadId: 'LEAD-9821F', status: 'QUALIFIED' },
        execution_status: 'success',
        executed_at: new Date(Date.now() - 3600000 * 2 + 45000).toISOString()
      },
      {
        id: 'tx-2',
        session_id: sampleSessionId,
        tool_name: 'checkCalendar',
        arguments: { preferredDate: '2026-09-28', timezone: 'EST' },
        result: { availableSlots: ['2026-09-28 10:00 AM EST', '2026-09-28 03:00 PM EST'] },
        execution_status: 'success',
        executed_at: new Date(Date.now() - 3600000 * 2 + 65000).toISOString()
      }
    ]);

    this.analytics.set(sampleSessionId, {
      id: 'an-1',
      session_id: sampleSessionId,
      executive_summary: 'The client initiated in Spanish inquiring about onboarding a team of 20 professionals. Lead qualification and available enterprise consultation slots were successfully presented.',
      sentiment_score: 0.88,
      languages_detected: ['es-ES', 'en-US'],
      key_topics: ['Enterprise Onboarding', 'Calendar Scheduling', 'Team Seats'],
      action_items: ['Send calendar invite for Monday 10:00 AM EST', 'Forward Enterprise SLA document to lead email'],
      collected_data: { leadName: 'Elena Morales', company: 'Fintech Soluciones', seats: 20 },
      created_at: new Date(Date.now() - 3600000 * 2 + 185000).toISOString()
    });
  }
}

export const inMemoryDb = new InMemoryRepository();

// -----------------------------------------------------------------------------
// Data Access Helper Functions (Seamlessly uses Supabase or In-Memory)
// -----------------------------------------------------------------------------
export async function dbCreateVoiceSession(data: {
  userId: string;
  personaId: string;
  mode: 'voice_live' | 'interactive_tts';
  voiceName: string;
  preferredLanguage?: string;
}): Promise<InMemVoiceSession> {
  const sessionId = crypto.randomUUID();

  if (isLiveSupabase && _supabaseClient) {
    try {
      const { data: record, error } = await _supabaseClient
        .from('voice_sessions')
        .insert({
          id: sessionId,
          user_id: data.userId,
          persona_id: data.personaId,
          mode: data.mode,
          voice_name: data.voiceName,
          status: 'active',
          metadata: { preferredLanguage: data.preferredLanguage || 'auto' }
        })
        .select()
        .single();

      if (!error && record) {
        return record;
      }
      console.warn('[Supabase] Falling back to in-memory on voice_sessions insert:', error?.message);
    } catch (e: any) {
      console.warn('[Supabase] Exception on voice_sessions insert:', e.message);
    }
  }

  const sessionObj: InMemVoiceSession = {
    id: sessionId,
    user_id: data.userId,
    persona_id: data.personaId,
    mode: data.mode,
    primary_detected_language: 'Undetected',
    voice_name: data.voiceName,
    status: 'active',
    started_at: new Date().toISOString(),
    duration_seconds: 0,
    metadata: { preferredLanguage: data.preferredLanguage || 'auto' }
  };

  inMemoryDb.sessions.set(sessionId, sessionObj);
  return sessionObj;
}

export async function dbEndVoiceSession(
  sessionId: string,
  primaryLanguage?: string
): Promise<InMemVoiceSession | null> {
  const now = new Date();

  if (isLiveSupabase && _supabaseClient) {
    try {
      const { data: existing } = await _supabaseClient
        .from('voice_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single();

      const startTime = existing?.started_at ? new Date(existing.started_at).getTime() : now.getTime();
      const durationSeconds = Math.max(1, Math.round((now.getTime() - startTime) / 1000));

      const updatePayload: Record<string, any> = {
        status: 'completed',
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds
      };
      if (primaryLanguage) {
        updatePayload.primary_detected_language = primaryLanguage;
      }

      const { data: record, error } = await _supabaseClient
        .from('voice_sessions')
        .update(updatePayload)
        .eq('id', sessionId)
        .select()
        .single();

      if (!error && record) return record;
    } catch (e: any) {
      console.warn('[Supabase] Fallback to in-mem end session:', e.message);
    }
  }

  const session = inMemoryDb.sessions.get(sessionId);
  if (!session) return null;

  const duration = Math.max(1, Math.round((now.getTime() - new Date(session.started_at).getTime()) / 1000));
  session.status = 'completed';
  session.ended_at = now.toISOString();
  session.duration_seconds = duration;
  if (primaryLanguage) {
    session.primary_detected_language = primaryLanguage;
  }
  inMemoryDb.sessions.set(sessionId, session);
  return session;
}

export async function dbAddTranscript(entry: {
  sessionId: string;
  speaker: 'user' | 'model' | 'system';
  content: string;
  detectedLanguage?: string;
  audioOffsetMs?: number;
}): Promise<InMemTranscript> {
  const transcriptId = crypto.randomUUID();
  const transcriptObj: InMemTranscript = {
    id: transcriptId,
    session_id: entry.sessionId,
    speaker: entry.speaker,
    content: entry.content,
    detected_language: entry.detectedLanguage,
    timestamp: new Date().toISOString(),
    audio_offset_ms: entry.audioOffsetMs || 0
  };

  if (isLiveSupabase && _supabaseClient) {
    try {
      await _supabaseClient.from('session_transcripts').insert(transcriptObj);
    } catch (e: any) {
      // Non-blocking log
    }
  }

  const existing = inMemoryDb.transcripts.get(entry.sessionId) || [];
  existing.push(transcriptObj);
  inMemoryDb.transcripts.set(entry.sessionId, existing);

  return transcriptObj;
}

export async function dbAddToolExecution(record: {
  sessionId: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
  executionStatus: 'pending' | 'success' | 'error';
}): Promise<InMemToolExecution> {
  const toolExecId = crypto.randomUUID();
  const execObj: InMemToolExecution = {
    id: toolExecId,
    session_id: record.sessionId,
    tool_name: record.toolName,
    arguments: record.arguments,
    result: record.result,
    execution_status: record.executionStatus,
    executed_at: new Date().toISOString()
  };

  if (isLiveSupabase && _supabaseClient) {
    try {
      await _supabaseClient.from('tool_executions').insert(execObj);
    } catch (e: any) {
      // Non-blocking
    }
  }

  const existing = inMemoryDb.toolExecutions.get(record.sessionId) || [];
  existing.push(execObj);
  inMemoryDb.toolExecutions.set(record.sessionId, existing);

  return execObj;
}

export async function dbSaveAnalytics(record: {
  sessionId: string;
  executiveSummary: string;
  sentimentScore: number;
  languagesDetected: string[];
  keyTopics: string[];
  actionItems: string[];
  collectedData: Record<string, any>;
}): Promise<InMemAnalytics> {
  const analyticsId = crypto.randomUUID();
  const analyticsObj: InMemAnalytics = {
    id: analyticsId,
    session_id: record.sessionId,
    executive_summary: record.executiveSummary,
    sentiment_score: record.sentimentScore,
    languages_detected: record.languagesDetected,
    key_topics: record.keyTopics,
    action_items: record.actionItems,
    collected_data: record.collectedData,
    created_at: new Date().toISOString()
  };

  if (isLiveSupabase && _supabaseClient) {
    try {
      await _supabaseClient.from('session_analytics').upsert(analyticsObj, { onConflict: 'session_id' });
    } catch (e: any) {
      // Non-blocking
    }
  }

  inMemoryDb.analytics.set(record.sessionId, analyticsObj);
  return analyticsObj;
}

export async function dbGetSessionAnalytics(sessionId: string): Promise<InMemAnalytics | null> {
  if (isLiveSupabase && _supabaseClient) {
    try {
      const { data, error } = await _supabaseClient
        .from('session_analytics')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      if (!error && data) return data;
    } catch (e: any) { }
  }
  return inMemoryDb.analytics.get(sessionId) || null;
}

export async function dbGetSessionTranscripts(sessionId: string): Promise<InMemTranscript[]> {
  if (isLiveSupabase && _supabaseClient) {
    try {
      const { data, error } = await _supabaseClient
        .from('session_transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      if (!error && data) return data;
    } catch (e: any) { }
  }
  return inMemoryDb.transcripts.get(sessionId) || [];
}

export async function dbGetSessionTools(sessionId: string): Promise<InMemToolExecution[]> {
  if (isLiveSupabase && _supabaseClient) {
    try {
      const { data, error } = await _supabaseClient
        .from('tool_executions')
        .select('*')
        .eq('session_id', sessionId)
        .order('executed_at', { ascending: true });
      if (!error && data) return data;
    } catch (e: any) { }
  }
  return inMemoryDb.toolExecutions.get(sessionId) || [];
}

export async function dbGetSessionsForUser(userId: string): Promise<InMemVoiceSession[]> {
  if (isLiveSupabase && _supabaseClient) {
    try {
      const { data, error } = await _supabaseClient
        .from('voice_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
      if (!error && data) return data;
    } catch (e: any) { }
  }

  // Return all sessions for user or all demo sessions
  return Array.from(inMemoryDb.sessions.values())
    .filter(s => s.user_id === userId || userId === '00000000-0000-0000-0000-000000000001')
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}
