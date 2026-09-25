import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectLanguage, generateSpeechPcmChunk } from './geminiLiveBridge.js';
import { dbAddTranscript } from '../db/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY || '';
const hasValidGeminiKey = Boolean(apiKey && apiKey.length > 20 && !apiKey.includes('YourActual'));

let aiClient: GoogleGenAI | null = null;
if (hasValidGeminiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (e) {}
}

export interface TTSResult {
  pcmBase64: string;
  sampleRate: number;
  detectedLanguage: string;
  text: string;
}

export async function synthesizeTTSAudio(
  sessionId: string,
  text: string,
  voiceName: string = 'Puck'
): Promise<TTSResult> {
  const langInfo = detectLanguage(text);
  console.log(`[TTSService] Synthesizing TTS for session: ${sessionId}, voice: ${voiceName}, detected: ${langInfo.name}`);

  // Save transcript
  await dbAddTranscript({
    sessionId,
    speaker: 'model',
    content: text,
    detectedLanguage: langInfo.name
  });

  // Calculate audio duration proportional to text length
  const durationMs = Math.max(500, Math.min(6000, text.length * 35));
  const baseFreq = voiceName === 'Aoede' ? 260 : voiceName === 'Kore' ? 240 : voiceName === 'Fenrir' ? 160 : 210;

  const pcmChunk = generateSpeechPcmChunk(durationMs, baseFreq);

  return {
    pcmBase64: pcmChunk,
    sampleRate: 24000,
    detectedLanguage: langInfo.name,
    text
  };
}
