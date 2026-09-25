import { Router, Response } from 'express';
import { StartSessionSchema, TTSSpeakSchema } from '../../shared/schemas.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  dbCreateVoiceSession,
  dbEndVoiceSession,
  dbGetSessionsForUser,
  inMemoryDb
} from '../db/supabase.js';
import { synthesizeTTSAudio } from '../services/ttsService.js';
import { runPostCallAnalysis } from '../services/postCallAnalyzer.js';

export const sessionsRouter = Router();

// 1. POST /api/sessions/start - Start a new voice or TTS session
sessionsRouter.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = StartSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
    }

    const { personaId, mode, voiceName, preferredLanguage } = parseResult.data;
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    const session = await dbCreateVoiceSession({
      userId,
      personaId,
      mode,
      voiceName,
      preferredLanguage
    });

    return res.status(201).json({
      success: true,
      sessionId: session.id,
      session,
      wsEndpoint: `/api/live-stream?sessionId=${session.id}&personaId=${personaId}&voiceName=${voiceName}&mode=${mode}`
    });
  } catch (error: any) {
    console.error('[SessionsRouter] Error starting session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/sessions/tts-speak - Interactive TTS Synthesis
sessionsRouter.post('/tts-speak', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = TTSSpeakSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
    }

    const { sessionId, text, voiceName } = parseResult.data;
    const ttsResult = await synthesizeTTSAudio(sessionId, text, voiceName);

    return res.status(200).json({
      success: true,
      ...ttsResult
    });
  } catch (error: any) {
    console.error('[SessionsRouter] Error synthesizing TTS:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/sessions/:id/end - Conclude session and trigger post-call intelligence
sessionsRouter.post('/:id/end', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = String(req.params.id);
    const { primaryLanguage } = req.body || {};

    const session = await dbEndVoiceSession(sessionId, primaryLanguage);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Run analysis synchronously or in background
    const analytics = await runPostCallAnalysis(sessionId);

    return res.status(200).json({
      success: true,
      session,
      analytics
    });
  } catch (error: any) {
    console.error('[SessionsRouter] Error ending session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/sessions/history - Retrieve user's session history
sessionsRouter.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const sessions = await dbGetSessionsForUser(userId);

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error: any) {
    console.error('[SessionsRouter] Error fetching history:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/sessions/:id - Get single session
sessionsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = String(req.params.id);
    const session = inMemoryDb.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.status(200).json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
