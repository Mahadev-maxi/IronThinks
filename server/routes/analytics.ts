import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  dbGetSessionAnalytics,
  dbGetSessionTranscripts,
  dbGetSessionTools,
  inMemoryDb
} from '../db/supabase.js';
import { runPostCallAnalysis } from '../services/postCallAnalyzer.js';

export const analyticsRouter = Router();

// GET /api/sessions/:id/analytics - Get complete intelligence pack for session
analyticsRouter.get('/:id/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.id;

    // Check if analytics exists
    let analytics = await dbGetSessionAnalytics(sessionId);
    if (!analytics) {
      // Auto-generate if not yet analyzed
      analytics = await runPostCallAnalysis(sessionId);
    }

    const transcripts = await dbGetSessionTranscripts(sessionId);
    const tools = await dbGetSessionTools(sessionId);
    const session = inMemoryDb.sessions.get(sessionId);

    return res.status(200).json({
      success: true,
      sessionId,
      session,
      analytics,
      transcripts,
      tools
    });
  } catch (error: any) {
    console.error('[AnalyticsRouter] Error fetching analytics:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/reanalyze - Force recalculation
analyticsRouter.post('/:id/reanalyze', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.id;
    const analytics = await runPostCallAnalysis(sessionId);

    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (error: any) {
    console.error('[AnalyticsRouter] Error reanalyzing session:', error);
    return res.status(500).json({ error: error.message });
  }
});
