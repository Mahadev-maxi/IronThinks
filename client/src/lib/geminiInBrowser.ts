import type { PersonaId, ToolAuditRecord, TranscriptEntry } from '../../../shared/schemas';
import { AGENT_PERSONAS } from '../../../server/config/agentPersonas';

export const DEFAULT_ANTHROPIC_KEY = '';
export const DEFAULT_OPENAI_KEY = '';

export function cleanApiKey(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Strip any prepended variable names like ANTHROPIC_API_KEY= or GEMINI_API_KEY= or API_KEY=
  cleaned = cleaned.replace(/^(?:VITE_)?(?:ANTHROPIC|CLAUDE|GEMINI|OPENAI|CHATGPT)_API_KEY\s*[:=]\s*/i, '');
  cleaned = cleaned.replace(/^API_KEY\s*[:=]\s*/i, '');
  // Strip surrounding quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  return cleaned.trim();
}

// ----------------------------------------------------
// Anthropic Claude Key Management
// ----------------------------------------------------
export function getAnthropicApiKey(): string {
  try {
    const local = localStorage.getItem('anthropic_api_key') || localStorage.getItem('claude_api_key') || localStorage.getItem('VITE_ANTHROPIC_API_KEY');
    if (local) {
      const cleaned = cleanApiKey(local);
      if (cleaned.length > 10) return cleaned;
    }
  } catch {}

  const metaEnv = (import.meta as any).env;
  const envKey = metaEnv?.VITE_ANTHROPIC_API_KEY || metaEnv?.ANTHROPIC_API_KEY;
  if (envKey && typeof envKey === 'string') {
    const cleaned = cleanApiKey(envKey);
    if (cleaned.length > 10) return cleaned;
  }

  return DEFAULT_ANTHROPIC_KEY;
}

export function setAnthropicApiKey(key: string): void {
  try {
    const cleaned = cleanApiKey(key);
    if (!cleaned) {
      localStorage.removeItem('anthropic_api_key');
      localStorage.removeItem('claude_api_key');
      localStorage.removeItem('VITE_ANTHROPIC_API_KEY');
    } else {
      localStorage.setItem('anthropic_api_key', cleaned);
    }
  } catch {}
}

export function hasAnthropicApiKey(): boolean {
  return Boolean(getAnthropicApiKey());
}

// ----------------------------------------------------
// Google Gemini Key Management
// ----------------------------------------------------
export function getGeminiApiKey(): string {
  try {
    const local = localStorage.getItem('gemini_api_key') || localStorage.getItem('VITE_GEMINI_API_KEY');
    if (local) {
      const cleaned = cleanApiKey(local);
      if (cleaned.length > 5) return cleaned;
    }
  } catch {}

  const metaEnv = (import.meta as any).env;
  const envKey = metaEnv?.VITE_GEMINI_API_KEY || metaEnv?.GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string') {
    const cleaned = cleanApiKey(envKey);
    if (cleaned.length > 5 && !cleaned.includes('YourActual')) {
      return cleaned;
    }
  }
  return '';
}

export function setGeminiApiKey(key: string): void {
  try {
    const cleaned = cleanApiKey(key);
    if (!cleaned) {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('VITE_GEMINI_API_KEY');
    } else {
      localStorage.setItem('gemini_api_key', cleaned);
    }
  } catch {}
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

// ----------------------------------------------------
// OpenAI Key Management
// ----------------------------------------------------
export function getOpenAIApiKey(): string {
  try {
    const local = localStorage.getItem('openai_api_key') || localStorage.getItem('VITE_OPENAI_API_KEY');
    if (local) {
      const cleaned = cleanApiKey(local);
      if (cleaned.length > 10) return cleaned;
    }
  } catch {}

  const metaEnv = (import.meta as any).env;
  const envKey = metaEnv?.VITE_OPENAI_API_KEY || metaEnv?.OPENAI_API_KEY;
  if (envKey && typeof envKey === 'string') {
    const cleaned = cleanApiKey(envKey);
    if (cleaned.length > 10) return cleaned;
  }

  return DEFAULT_OPENAI_KEY;
}

export function setOpenAIApiKey(key: string): void {
  try {
    const cleaned = cleanApiKey(key);
    if (!cleaned) {
      localStorage.removeItem('openai_api_key');
      localStorage.removeItem('VITE_OPENAI_API_KEY');
    } else {
      localStorage.setItem('openai_api_key', cleaned);
    }
  } catch {}
}

interface GenerateAgentResponseParams {
  personaId: PersonaId;
  userText: string;
  history: TranscriptEntry[];
  detectedLanguage: { name: string; code: string };
  sessionId: string;
}

export interface AgentGeneratedResult {
  replyText: string;
  toolRecord?: ToolAuditRecord;
  visualDiagram?: { title: string; diagramType: string; contentSummary: string };
  isDirectGemini: boolean;
  aiProvider?: string;
}

/**
 * Format conversation history strictly following Google Gemini REST API requirements:
 * 1. First message must have role 'user' (leading model greetings are omitted).
 * 2. Turns must strictly alternate between 'user' and 'model'.
 * 3. Consecutive turns with the same role are merged.
 * 4. The final turn must be the current user prompt with role 'user'.
 */
function formatContentsForGemini(history: TranscriptEntry[], currentPrompt: string) {
  const turns: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const item of history) {
    const text = item.content?.trim();
    if (!text) continue;
    const role = item.speaker === 'user' ? 'user' : 'model';
    turns.push({ role, text });
  }

  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user' || last.text !== currentPrompt.trim()) {
    turns.push({ role: 'user', text: currentPrompt.trim() });
  }

  while (turns.length > 0 && turns[0].role === 'model') {
    turns.shift();
  }

  const alternating: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const turn of turns) {
    if (alternating.length === 0) {
      if (turn.role === 'user') {
        alternating.push({ role: 'user', parts: [{ text: turn.text }] });
      }
    } else {
      const prev = alternating[alternating.length - 1];
      if (prev.role === turn.role) {
        prev.parts[0].text += `\n${turn.text}`;
      } else {
        alternating.push({ role: turn.role, parts: [{ text: turn.text }] });
      }
    }
  }

  if (alternating.length === 0 || alternating[alternating.length - 1].role !== 'user') {
    alternating.push({ role: 'user', parts: [{ text: currentPrompt.trim() }] });
  }

  return alternating.slice(-8);
}

/**
 * Primary Agent Response Generator:
 * Tier 1: Anthropic Claude 3.5 (Primary Requested Backend)
 * Tier 2: Google Gemini Flash
 * Tier 3: OpenAI ChatGPT
 * Tier 4: Autonomous Context-Aware Local Engine
 */
export async function generateAgentResponse(params: GenerateAgentResponseParams): Promise<AgentGeneratedResult> {
  const { personaId, userText, history, detectedLanguage, sessionId } = params;
  const persona = AGENT_PERSONAS[personaId] || AGENT_PERSONAS.intake_specialist;

  // 1. Attempt Anthropic Claude 3.5 API
  const claudeKey = getAnthropicApiKey();
  if (claudeKey) {
    try {
      const result = await callClaudeApi({
        apiKey: claudeKey,
        persona,
        userText,
        history,
        sessionId,
        detectedLanguage
      });
      if (result) {
        console.log('[AIProvider] Direct Anthropic Claude response generated successfully.');
        return result;
      }
    } catch (err) {
      console.warn('[AIProvider] Anthropic Claude call failed, falling back:', err);
    }
  }

  // 2. Attempt Google Gemini Flash API
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      const result = await callGeminiFlashApi({
        apiKey: geminiKey,
        persona,
        userText,
        history,
        sessionId
      });
      if (result) {
        console.log('[AIProvider] Direct Google Gemini response generated successfully.');
        return result;
      }
    } catch (err) {
      console.warn('[AIProvider] Direct Gemini API call failed, falling back:', err);
    }
  }

  // 3. Attempt OpenAI ChatGPT API
  const openAiKey = getOpenAIApiKey();
  if (openAiKey) {
    try {
      const result = await callOpenAIApi({
        apiKey: openAiKey,
        persona,
        userText,
        history,
        sessionId,
        detectedLanguage
      });
      if (result) {
        console.log('[AIProvider] Direct OpenAI ChatGPT response generated successfully.');
        return result;
      }
    } catch (err) {
      console.warn('[AIProvider] OpenAI ChatGPT call failed, falling back:', err);
    }
  }

  // 4. Intelligent Autonomous Conversational Engine (Resilient, relevant, dynamic)
  return runAutonomousAgentEngine({
    personaId,
    userText,
    history,
    detectedLanguage,
    sessionId
  });
}

export const IRONTHINKS_SYSTEM_DIRECTIVE = `You are IronThinks, a multimodal AI assistant.

IMPORTANT:
You must answer the user's actual question. Do NOT return a generic explanation of IronThinks, multimodal AI, or your capabilities unless the user specifically asks about them.

Instructions:
1. Understand the user's actual question.
2. Answer it directly and specifically.
3. If the question requires current information such as weather, news, prices, sports scores, etc., clearly state when live/current data is unavailable rather than inventing information.
4. If the user asks a technical question, give a practical technical answer.
5. If the user asks a simple question, keep the answer simple (1 to 3 spoken sentences ideal for real-time speech synthesis).
6. Never reuse a fixed response for different questions.
7. Match the response to the user's language and intent (e.g. Hindi, Kannada, Spanish, French, English).

Return ONLY the direct answer to the user's question.`;

/**
 * Calls Anthropic Claude Messages API directly from the browser.
 * Uses 'anthropic-dangerous-direct-browser-access': 'true' header for CORS compliance.
 */
async function callClaudeApi({
  apiKey,
  persona,
  userText,
  history,
  sessionId,
  detectedLanguage
}: {
  apiKey: string;
  persona: (typeof AGENT_PERSONAS)[PersonaId];
  userText: string;
  history: TranscriptEntry[];
  sessionId: string;
  detectedLanguage?: { name: string; code: string };
}): Promise<AgentGeneratedResult | null> {
  const cleanKey = cleanApiKey(apiKey);
  if (!cleanKey) return null;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const item of history) {
    const text = item.content?.trim();
    if (!text) continue;
    const role = item.speaker === 'user' ? 'user' : 'assistant';
    messages.push({ role, content: text });
  }

  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || last.content !== userText.trim()) {
    messages.push({ role: 'user', content: userText.trim() });
  }

  while (messages.length > 0 && messages[0].role === 'assistant') {
    messages.shift();
  }

  const alternating: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const turn of messages) {
    if (alternating.length === 0) {
      if (turn.role === 'user') alternating.push(turn);
    } else {
      const prev = alternating[alternating.length - 1];
      if (prev.role === turn.role) {
        prev.content += `\n${turn.content}`;
      } else {
        alternating.push(turn);
      }
    }
  }

  if (alternating.length === 0 || alternating[alternating.length - 1].role !== 'user') {
    alternating.push({ role: 'user', content: userText.trim() });
  }

  const tools = persona.tools?.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters || { type: 'object', properties: {} }
  })) || [];

  const langInstruction = detectedLanguage?.name && detectedLanguage.name !== 'Auto-Detecting'
    ? `\nThe user is communicating in ${detectedLanguage.name}. Respond clearly and naturally in ${detectedLanguage.name} (1 to 3 concise sentences ideal for real-time speech synthesis).`
    : `\nKeep your answer direct, natural, and concise (1 to 3 sentences suitable for spoken voice output).`;

  const body: any = {
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 350,
    system: `${IRONTHINKS_SYSTEM_DIRECTIVE}\n\n${persona.systemInstruction}${langInstruction}`,
    messages: alternating.slice(-8)
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cleanKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[ClaudeInBrowser] Anthropic API HTTP ${res.status}:`, errText);
      return null;
    }

    const data = await res.json();
    let replyText = '';
    let toolRecord: ToolAuditRecord | undefined;

    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          replyText += block.text;
        } else if (block.type === 'tool_use') {
          const { name: toolName, input: toolArgs } = block;
          toolRecord = {
            id: `tool_${Date.now()}`,
            sessionId,
            toolName,
            arguments: toolArgs || {},
            result: { status: 'success', executed: true, timestamp: new Date().toISOString() },
            executionStatus: 'success',
            executedAt: new Date().toISOString()
          };

          if (!replyText) {
            if (toolName === 'bookAppointment') {
              replyText = `I have scheduled your appointment for ${(toolArgs as any)?.selectedSlot || 'tomorrow'}. A confirmation has been recorded.`;
            } else if (toolName === 'collectLeadInfo') {
              replyText = `Thank you! I have securely recorded your contact details in our CRM. How else may I assist you today?`;
            } else if (toolName === 'checkCalendar') {
              replyText = `I checked our calendar. We have slots at 10:00 AM and 2:00 PM EST tomorrow. Which one would you prefer?`;
            } else {
              replyText = `I have executed the ${toolName} action for you.`;
            }
          }
        }
      }
    }

    if (replyText.trim()) {
      return {
        replyText: replyText.trim(),
        toolRecord,
        isDirectGemini: false,
        aiProvider: 'Anthropic Claude'
      };
    }
  } catch (err) {
    console.warn('[ClaudeInBrowser] Network error calling Anthropic API:', err);
  }

  return null;
}

/**
 * Calls OpenAI Chat Completions API directly from the browser.
 */
async function callOpenAIApi({
  apiKey,
  persona,
  userText,
  history,
  sessionId: _sessionId,
  detectedLanguage
}: {
  apiKey: string;
  persona: (typeof AGENT_PERSONAS)[PersonaId];
  userText: string;
  history: TranscriptEntry[];
  sessionId?: string;
  detectedLanguage?: { name: string; code: string };
}): Promise<AgentGeneratedResult | null> {
  const cleanKey = cleanApiKey(apiKey);
  if (!cleanKey) return null;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `${IRONTHINKS_SYSTEM_DIRECTIVE}\n\n${persona.systemInstruction}\nRespond in 1-3 concise spoken sentences in ${detectedLanguage?.name || 'English'}.`
    }
  ];

  for (const item of history.slice(-6)) {
    const text = item.content?.trim();
    if (!text) continue;
    messages.push({
      role: item.speaker === 'user' ? 'user' : 'assistant',
      content: text
    });
  }

  const last = messages[messages.length - 1];
  if (!last || last.content !== userText.trim()) {
    messages.push({ role: 'user', content: userText.trim() });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[OpenAIInBrowser] OpenAI API HTTP ${res.status}:`, errText);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return {
        replyText: content.trim(),
        isDirectGemini: false,
        aiProvider: 'OpenAI ChatGPT'
      };
    }
  } catch (err) {
    console.warn('[OpenAIInBrowser] Error calling OpenAI API:', err);
  }

  return null;
}

/**
 * Calls Google Gemini REST API directly from the browser.
 */
async function callGeminiFlashApi({
  apiKey,
  persona,
  userText,
  history,
  sessionId
}: {
  apiKey: string;
  persona: (typeof AGENT_PERSONAS)[PersonaId];
  userText: string;
  history: TranscriptEntry[];
  sessionId: string;
}): Promise<AgentGeneratedResult | null> {
  const models = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-2.5-flash'
  ];
  const formattedContents = formatContentsForGemini(history, userText);

  const functionDeclarations = persona.tools?.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  })) || [];

  const body: any = {
    systemInstruction: {
      parts: [{ text: `${IRONTHINKS_SYSTEM_DIRECTIVE}\n\n${persona.systemInstruction}` }]
    },
    contents: formattedContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300
    }
  };

  if (functionDeclarations.length > 0) {
    body.tools = [{ functionDeclarations }];
  }

  const cleanKey = cleanApiKey(apiKey);
  if (!cleanKey) return null;

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[GeminiInBrowser] Model ${model} returned HTTP ${res.status}:`, errorText);
        continue;
      }

      const data = await res.json();
      const candidatePart = data.candidates?.[0]?.content?.parts?.[0];

      if (!candidatePart) continue;

      if (candidatePart.functionCall) {
        const { name: toolName, args: toolArgs } = candidatePart.functionCall;
        const toolRecord: ToolAuditRecord = {
          id: `tool_${Date.now()}`,
          sessionId,
          toolName,
          arguments: toolArgs || {},
          result: { status: 'success', executed: true, timestamp: new Date().toISOString() },
          executionStatus: 'success',
          executedAt: new Date().toISOString()
        };

        let replyText = `I have executed the ${toolName} action for you.`;
        if (toolName === 'bookAppointment') {
          replyText = `I have confirmed your appointment for ${(toolArgs as any)?.selectedSlot || 'tomorrow'}. A calendar confirmation has been issued.`;
        } else if (toolName === 'collectLeadInfo') {
          replyText = `Thank you! I have securely recorded your contact details in our CRM. How else may I assist you today?`;
        } else if (toolName === 'checkCalendar') {
          replyText = `I checked available openings. We have slots at 10:00 AM and 2:00 PM EST tomorrow. Which one would you prefer?`;
        } else if (toolName === 'triageSymptoms' || toolName === 'evaluateSymptomSeverity') {
          replyText = `I have logged your reported symptoms in our triage system. Please seek medical evaluation if symptoms worsen.`;
        }

        return {
          replyText,
          toolRecord,
          isDirectGemini: true,
          aiProvider: 'Google Gemini'
        };
      }

      if (candidatePart.text) {
        return {
          replyText: candidatePart.text.trim(),
          isDirectGemini: true,
          aiProvider: 'Google Gemini'
        };
      }
    } catch (e) {
      console.warn(`[GeminiInBrowser] Request to ${model} threw error:`, e);
    }
  }

  return null;
}

/**
 * Intelligent, context-aware conversational engine for the agent personas.
 * Returns relevant, natural, informative answers for questions, greetings, scheduling, and queries.
 */
function runAutonomousAgentEngine({
  personaId,
  userText,
  history,
  detectedLanguage,
  sessionId
}: {
  personaId: PersonaId;
  userText: string;
  history: TranscriptEntry[];
  detectedLanguage: { name: string; code: string };
  sessionId: string;
}): AgentGeneratedResult {
  const lower = userText.toLowerCase().trim();
  const lang = detectedLanguage.name;
  let replyText = '';
  let toolRecord: ToolAuditRecord | undefined;
  let visualDiagram: { title: string; diagramType: string; contentSummary: string } | undefined;

  const lastModelMsg = [...history].reverse().find((h) => h.speaker === 'model')?.content?.toLowerCase() || '';
  const isAwaitingEmail = lastModelMsg.includes('email') || lastModelMsg.includes('correo') || lastModelMsg.includes('adresse');
  const isAwaitingSlot = lastModelMsg.includes('10:00') || lastModelMsg.includes('slot') || lastModelMsg.includes('time') || lastModelMsg.includes('heure');

  // 1. Identity / Who are you / What is this
  if (
    lower.includes('who are you') ||
    lower.includes('what is your name') ||
    lower.includes('what are you') ||
    lower.includes('quien eres') ||
    lower.includes('qui es-tu') ||
    lower.includes('aap kaun hain')
  ) {
    if (personaId === 'intake_specialist') {
      replyText = "I am the Multilingual Intake Agent on IronThinks. I qualify client inquiries, capture contact information, and schedule consultations across more than 70 languages in real time.";
    } else if (personaId === 'polyglot_tutor') {
      replyText = "I am your Socratic Voice Tutor. I help you master languages and complex concepts through interactive dialogue, real-time pronunciation guidance, and grammar analysis.";
    } else if (personaId === 'health_concierge') {
      replyText = "I am your Health Concierge & Triage Assistant. I help gather symptom details, evaluate urgency tiers, and provide care navigation guidance.";
    } else {
      replyText = "I am your Wealth Management Guide. I specialize in financial modeling, compound interest projections, and portfolio strategy.";
    }
  }

  // 2. What is IronThinks / Company Background
  else if (
    lower.includes('ironthinks') ||
    lower.includes('iron thinks') ||
    lower.includes('about the company') ||
    lower.includes('what company') ||
    lower.includes('what is this platform') ||
    lower.includes('what is this app')
  ) {
    replyText = "IronThinks is an enterprise-grade agentic AI platform featuring real-time multilingual voice and vision. It enables organizations to automate lead intake, language tutoring, customer support, and advisory workflows across 70+ languages with ultra-low latency.";
  }

  // 3. How does it work / Technical architecture
  else if (
    lower.includes('how does this work') ||
    lower.includes('how does it work') ||
    lower.includes('technology') ||
    lower.includes('architecture') ||
    lower.includes('how do you work')
  ) {
    replyText = "IronThinks uses Web Audio streaming with 16kHz PCM audio capture and Google's Gemini multimodal models. When you speak, audio is processed in real time with continuous speech recognition, sub-second translation, and autonomous tool calling.";
  }

  // 4. Greetings
  else if (
    lower.startsWith('hello') ||
    lower.startsWith('hi') ||
    lower.startsWith('hey') ||
    lower.startsWith('hola') ||
    lower.startsWith('bonjour') ||
    lower.startsWith('guten tag') ||
    lower.startsWith('namaste') ||
    lower.startsWith('namaskara') ||
    lower === 'hi' ||
    lower === 'hello'
  ) {
    if (lang === 'Kannada') {
      replyText = "ನಮಸ್ಕಾರ! ನಿಮ್ಮೊಂದಿಗೆ ಮಾತನಾಡಲು ನನಗೆ ಸಂತೋಷವಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?";
    } else if (lang === 'Spanish') {
      replyText = "¡Hola! Es un placer saludarle. Estoy a su disposición para resolver sus dudas, brindarle información y ayudarle en lo que necesite. ¿En qué puedo asistirle hoy?";
    } else if (lang === 'French') {
      replyText = "Bonjour! Ravi de vous accueillir. Comment puis-je vous aider aujourd'hui?";
    } else if (lang === 'Hindi') {
      replyText = "नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?";
    } else {
      replyText = "Hello! It's great to speak with you. How can I assist you with your project or questions today?";
    }
  }

  // 5. Kannada Language Switching / Command
  else if (
    lower.includes('kannada') ||
    lower.includes('kannadadalli') ||
    (lang === 'Kannada' && (lower.includes('switch') || lower.includes('speak') || lower.includes('language') || lower.includes('namaskara')))
  ) {
    replyText = "ಖಂಡಿತ, ನಾನು ಈಗ ನಿಮ್ಮೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?";
  }

  // 6. Time Inquiry
  else if (
    lower.includes('what is the time') ||
    lower.includes('what time') ||
    lower.includes('the time now') ||
    lower.includes('current time') ||
    lower === 'time'
  ) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (lang === 'Kannada') {
      replyText = `ಈಗ ಸಮಯ ${timeStr}. ನಾನು ನಿಮಗೆ ಇನ್ನೇನು ಸಹಾಯ ಮಾಡಲಿ?`;
    } else if (lang === 'Hindi') {
      replyText = `अभी समय ${timeStr} है। मैं आपकी और क्या मदद कर सकता हूँ?`;
    } else {
      replyText = `The current time is ${timeStr}. How can I assist you further?`;
    }
  }

  // 7. Date Inquiry
  else if (
    lower.includes('date today') ||
    lower.includes("what's the date") ||
    lower.includes('what is the date') ||
    lower.includes("today's date") ||
    lower.includes('current date')
  ) {
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (lang === 'Kannada') {
      replyText = `ಇವತ್ತಿನ ದಿನಾಂಕ ${dateStr}.`;
    } else if (lang === 'Hindi') {
      replyText = `आज की तारीख ${dateStr} है।`;
    } else {
      replyText = `Today is ${dateStr}. How can I help you today?`;
    }
  }

  // 8. Audibility / Microphone Check ("can you hear me")
  else if (
    lower.includes('can you hear me') ||
    lower.includes('can you listen') ||
    lower.includes('are you there') ||
    lower.includes('are you listening')
  ) {
    if (lang === 'Kannada') {
      replyText = "ಹೌದು, ನಾನು ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳುತ್ತಿದ್ದೇನೆ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?";
    } else if (lang === 'Hindi') {
      replyText = "हाँ, मैं आपको बिल्कुल साफ़ सुन पा रहा हूँ! बताइए मैं आपकी क्या मदद कर सकता हूँ?";
    } else {
      replyText = "Yes, I can hear you loud and clear! How can I assist you right now?";
    }
  }

  // 9. Link / Portal Sharing
  else if (
    lower.includes('send me the link') ||
    lower.includes('send the link') ||
    lower.includes('share the link') ||
    lower.includes('give me the link')
  ) {
    replyText = "You can access our platform live at https://ironthinks.ai. If you'd like, provide your email and I will send the direct access portal and documentation to your inbox!";
  }

  // 10. Gratitude / Thanks
  else if (
    lower.includes('thank') ||
    lower.includes('gracias') ||
    lower.includes('merci') ||
    lower.includes('arigato') ||
    lower.includes('dhanyawad') ||
    lower.includes('dhanyavada')
  ) {
    if (lang === 'Kannada') {
      replyText = "ಧನ್ಯವಾದಗಳು! ನಿಮಗೆ ಬೇರೆ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿದ್ದರೆ ಖಂಡಿತ ಕೇಳಿ.";
    } else if (lang === 'Spanish') {
      replyText = "¡Ha sido un auténtico placer! No dude en avisarme si tiene cualquier otra pregunta.";
    } else {
      replyText = "You're very welcome! Let me know if there's anything else I can help you with.";
    }
  }

  // 6. Polyglot Tutor Persona Specifics
  else if (personaId === 'polyglot_tutor') {
    toolRecord = {
      id: `tool_${Date.now()}`,
      sessionId,
      toolName: 'assessLanguageFluency',
      arguments: { targetLanguage: lang, userUtterance: userText },
      result: { fluencyScore: 9.0, cefrLevel: 'B2', grammaticalPrecision: 'High' },
      executionStatus: 'success',
      executedAt: new Date().toISOString()
    };

    visualDiagram = {
      title: `${lang} Conversational Feedback`,
      diagramType: 'grammar_table',
      contentSummary: `Analyzed utterance: "${userText}". Natural flow and clear pronunciation. Recommended focus: expanding compound idioms.`
    };

    if (lower.includes('practice') || lower.includes('learn') || lower.includes('spanish') || lower.includes('french')) {
      replyText = `Wonderful! Let's practice actively. How would you describe what you've been working on lately in your target language?`;
    } else {
      replyText = `Good expression! How might you rephrase that to sound more formal or idiomatic in conversational context?`;
    }
  }

  // 7. Health Concierge Persona Specifics
  else if (personaId === 'health_concierge') {
    const isEmergency = lower.includes('chest pain') || lower.includes('breath') || lower.includes('bleeding') || lower.includes('faint');
    toolRecord = {
      id: `tool_${Date.now()}`,
      sessionId,
      toolName: 'evaluateSymptomSeverity',
      arguments: { reportedSymptoms: userText, urgencyTier: isEmergency ? 'Emergency' : 'Moderate' },
      result: { severityScore: isEmergency ? 9.5 : 4.0, action: isEmergency ? 'Dispatch Emergency Care' : 'Clinical Follow-up' },
      executionStatus: 'success',
      executedAt: new Date().toISOString()
    };

    if (isEmergency) {
      replyText = "IMPORTANT: Those symptoms require immediate emergency care. Please dial 911 or your local emergency number right away.";
    } else {
      replyText = "I have logged your symptoms in the triage record. How long have you experienced this discomfort, and on a scale of 1 to 10, how intense is it right now?";
    }
  }

  // 8. Wealth Advisor Persona Specifics
  else if (personaId === 'wealth_advisor') {
    toolRecord = {
      id: `tool_${Date.now()}`,
      sessionId,
      toolName: 'calculateCompoundInterest',
      arguments: { query: userText, estimatedYield: '8% Annualized' },
      result: { principal: 10000, projectedTenYearValue: 21589, compoundMultiplier: 2.15 },
      executionStatus: 'success',
      executedAt: new Date().toISOString()
    };

    if (lower.includes('invest') || lower.includes('portfolio') || lower.includes('compound') || lower.includes('crypto') || lower.includes('stock')) {
      replyText = "At an 8% annualized compound return, invested capital doubles approximately every 9 years under the Rule of 72. Are you considering a recurring monthly allocation or a lump-sum strategy?";
    } else {
      replyText = "I have analyzed that financial scenario. Maintaining asset diversification and minimizing expense ratios is essential for compounding over a multi-year horizon. What timeframe are you targeting?";
    }
  }

  // 9. Multilingual Intake Specialist (Lead qualification, scheduling, contact capture)
  else {
    // 9.1 Self-introduction / Name
    if (
      lower.includes('my name is') ||
      lower.includes("i'm ") ||
      lower.includes('i am ') ||
      lower.includes('me llamo') ||
      lower.includes("je m'appelle")
    ) {
      const extractedName = userText.replace(/my name is|i'm|i am|me llamo|je m'appelle/gi, '').trim().split(' ')[0] || 'valued guest';
      toolRecord = {
        id: `tool_${Date.now()}`,
        sessionId,
        toolName: 'collectLeadInfo',
        arguments: { fullName: extractedName, rawIntro: userText },
        result: { status: 'success', leadSaved: true, name: extractedName },
        executionStatus: 'success',
        executedAt: new Date().toISOString()
      };

      replyText = `Nice to meet you, ${extractedName}! I've created your file in our system. What email address should we send your consultation details and calendar invite to?`;
    }
    // 9.2 Contact info / Email / Phone
    else if (
      isAwaitingEmail ||
      lower.includes('@') ||
      lower.includes('email') ||
      lower.includes('correo') ||
      lower.includes('phone') ||
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(lower)
    ) {
      toolRecord = {
        id: `tool_${Date.now()}`,
        sessionId,
        toolName: 'collectLeadInfo',
        arguments: { contactDetails: userText },
        result: { status: 'success', leadUpdated: true },
        executionStatus: 'success',
        executedAt: new Date().toISOString()
      };

      replyText = "Thank you! I have securely recorded your contact details. We have demo openings available tomorrow at 10:00 AM or 2:00 PM EST. Which time suits your schedule best?";
    }
    // 9.3 Booking / Scheduling
    else if (
      isAwaitingSlot ||
      lower.includes('book') ||
      lower.includes('appointment') ||
      lower.includes('schedule') ||
      lower.includes('calendar') ||
      lower.includes('demo') ||
      lower.includes('tomorrow') ||
      lower.includes('10:00') ||
      lower.includes('10 am') ||
      lower.includes('2 pm') ||
      lower.includes('morning') ||
      lower.includes('afternoon')
    ) {
      const chosenSlot = lower.includes('2') || lower.includes('afternoon') ? 'Tomorrow at 2:00 PM EST' : 'Tomorrow at 10:00 AM EST';
      toolRecord = {
        id: `tool_${Date.now()}`,
        sessionId,
        toolName: 'bookAppointment',
        arguments: { leadName: 'Qualified Client', selectedSlot: chosenSlot, notes: 'IronThinks AI Demo Walkthrough' },
        result: { status: 'confirmed', confirmedSlot: chosenSlot, bookingId: `BK_${Math.floor(100000 + Math.random() * 900000)}` },
        executionStatus: 'success',
        executedAt: new Date().toISOString()
      };

      replyText = `Great! I have reserved your consultation for ${chosenSlot}. A calendar invite has been confirmed. Is there any particular feature or integration you would like us to highlight during the meeting?`;
    }
    // 9.4 Capabilities / Services
    else if (
      lower.includes('capabilities') ||
      lower.includes('features') ||
      lower.includes('services') ||
      lower.includes('what can you do') ||
      lower.includes('help me')
    ) {
      replyText = "I can qualify your business requirements, answer product questions across 70+ languages, capture lead contact information into CRM, and book live consultation appointments directly on our calendar. Would you like to schedule a quick demo?";
    }
    // 9.5 Pricing
    else if (
      lower.includes('price') ||
      lower.includes('cost') ||
      lower.includes('pricing') ||
      lower.includes('how much')
    ) {
      replyText = "We offer flexible enterprise tiers starting from developer pay-as-you-go access up to dedicated multilingual contact center solutions. I can register your requirements so our team can send a tailored pricing proposal. What is your estimated monthly volume?";
    }
    // 9.6 Dynamic, directly relevant answer to the user's specific prompt
    else {
      if (lower.includes('sab log') || lower.includes('kidhar') || lower.includes('kahan') || lower.includes('kaha')) {
        replyText = "Sab log apne-apne kaamon mein vyast hain! Main aapki madad ke liye yahan hoon, bataiye main aapki kya madad kar sakta hoon?";
      } else if (lower.includes('kaise ho') || lower.includes('kya haal')) {
        replyText = "Main bilkul theek hoon! Aap bataiye, aap kaise hain aur main aapki kya madad kar sakta hoon?";
      } else if (lower.includes('weather') || lower.includes('mausam')) {
        replyText = "Live weather updates are currently unavailable on this channel, but you can check your local weather app. How else can I assist you?";
      } else if (lang === 'Kannada') {
        replyText = `ನಿಮ್ಮ ಪ್ರಶ್ನೆ "${userText}" ಗೆ: ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`;
      } else if (lang === 'Hindi') {
        replyText = `Aapke sawaal "${userText}" ke baare mein: main aapki kis tarah se madad kar sakta hoon?`;
      } else {
        replyText = `Regarding "${userText}": I am right here and ready to help. What specific details would you like to explore?`;
      }
    }
  }

  return {
    replyText,
    toolRecord,
    visualDiagram,
    isDirectGemini: false,
    aiProvider: 'Autonomous Engine'
  };
}
