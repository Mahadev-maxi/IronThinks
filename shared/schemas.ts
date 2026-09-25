import { z } from 'zod';

// Supported Agent Personas
export const PersonaIdEnum = z.enum([
  'intake_specialist',
  'polyglot_tutor',
  'health_concierge',
  'wealth_advisor',
]);
export type PersonaId = z.infer<typeof PersonaIdEnum>;

// Supported Modes
export const SessionModeEnum = z.enum(['voice_live', 'interactive_tts']);
export type SessionMode = z.infer<typeof SessionModeEnum>;

// Supported Gemini Prebuilt Voices
export const GeminiVoiceEnum = z.enum(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);
export type GeminiVoice = z.infer<typeof GeminiVoiceEnum>;

// Start Session Request Schema
export const StartSessionSchema = z.object({
  personaId: PersonaIdEnum,
  mode: SessionModeEnum,
  voiceName: GeminiVoiceEnum.default('Puck'),
  preferredLanguage: z.string().optional().default('auto'),
});
export type StartSessionInput = z.infer<typeof StartSessionSchema>;

// Interactive TTS Speak Schema
export const TTSSpeakSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().min(1).max(2000),
  voiceName: GeminiVoiceEnum.default('Puck'),
});
export type TTSSpeakInput = z.infer<typeof TTSSpeakSchema>;

// Tool Execution Schema
export const ToolExecutionSchema = z.object({
  sessionId: z.string().uuid(),
  toolName: z.string().min(1),
  args: z.record(z.any()),
});
export type ToolExecutionInput = z.infer<typeof ToolExecutionSchema>;

// Post-Call Analytics Response Schema
export const AnalyticsResponseSchema = z.object({
  executiveSummary: z.string(),
  sentimentScore: z.number().min(-1).max(1),
  languagesDetected: z.array(z.string()),
  keyTopics: z.array(z.string()),
  actionItems: z.array(z.string()),
  collectedData: z.record(z.any()),
});
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;

// Persona Configuration Interface
export interface AgentPersonaConfig {
  id: PersonaId;
  name: string;
  domainScope: string;
  primaryVoice: GeminiVoice;
  systemInstruction: string;
  tagline: string;
  avatarBg: string;
  tools: AgentToolDefinition[];
  suggestedPrompts: string[];
}

// Agent Tool Definition
export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// WebSocket Event Payloads
export type ClientMessageType =
  | 'init_session'
  | 'realtime_audio'
  | 'client_text'
  | 'vision_frame'
  | 'user_interruption'
  | 'tool_result'
  | 'ping';

export interface ClientMessage {
  type: ClientMessageType;
  sessionId?: string;
  payload?: any;
}

export type ServerMessageType =
  | 'session_ready'
  | 'realtime_audio'
  | 'model_transcript'
  | 'user_transcript'
  | 'language_detected'
  | 'tool_call'
  | 'tool_result_ack'
  | 'interruption_detected'
  | 'session_error'
  | 'pong';

export interface ServerMessage {
  type: ServerMessageType;
  sessionId?: string;
  payload?: any;
}

// Transcript Entry
export interface TranscriptEntry {
  id: string;
  sessionId: string;
  speaker: 'user' | 'model' | 'system';
  content: string;
  detectedLanguage?: string;
  timestamp: string;
  audioOffsetMs?: number;
}

// Tool Execution Record
export interface ToolAuditRecord {
  id: string;
  sessionId: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: Record<string, any>;
  executionStatus: 'pending' | 'success' | 'error';
  executedAt: string;
}

// User Authentication & Account Management Schemas
export const SignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(1, 'Full name is required').default('User'),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const DeleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmText: z.string().optional(),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
