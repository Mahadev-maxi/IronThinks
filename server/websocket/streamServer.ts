import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { verifyWsToken } from '../middleware/authMiddleware.js';
import { GeminiLiveSessionBridge } from '../services/geminiLiveBridge.js';
import { dbEndVoiceSession } from '../db/supabase.js';
import { runPostCallAnalysis } from '../services/postCallAnalyzer.js';
import { PersonaId } from '../../shared/schemas.js';

export function setupWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const pathname = url.parse(request.url || '').pathname;

    if (pathname === '/api/live-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, req) => {
    const parsedUrl = url.parse(req.url || '', true);
    const query = parsedUrl.query;

    const token = (query.token as string) || '';
    const sessionId = (query.sessionId as string) || crypto.randomUUID();
    const personaId = (query.personaId as PersonaId) || 'intake_specialist';
    const voiceName = (query.voiceName as string) || 'Puck';

    const user = await verifyWsToken(token);
    console.log(`[WebSocketServer] Client connected for session ${sessionId} (User: ${user.email}, Persona: ${personaId}, Voice: ${voiceName})`);

    const bridge = new GeminiLiveSessionBridge({
      clientWs: ws,
      sessionId,
      personaId,
      voiceName
    });

    try {
      await bridge.initialize();
    } catch (e: any) {
      console.error('[WebSocketServer] Error initializing Gemini live bridge:', e);
      ws.send(JSON.stringify({ type: 'session_error', payload: { message: e.message } }));
    }

    ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const text = data.toString();
        const parsed = JSON.parse(text);

        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        await bridge.handleClientMessage(parsed);
      } catch (err: any) {
        console.error('[WebSocketServer] Error processing client message:', err.message);
      }
    });

    ws.on('close', async () => {
      console.log(`[WebSocketServer] Client disconnected for session ${sessionId}`);
      bridge.terminate();

      // Finalize session in database & run post-call analysis in background
      try {
        const primaryLanguage = bridge.getPrimaryLanguage();
        await dbEndVoiceSession(sessionId, primaryLanguage);
        console.log(`[WebSocketServer] Session ${sessionId} ended. Running background post-call analyzer...`);
        runPostCallAnalysis(sessionId).catch(err => {
          console.error('[WebSocketServer] Background post-call analysis error:', err);
        });
      } catch (err) {
        console.error('[WebSocketServer] Error during session termination teardown:', err);
      }
    });

    ws.on('error', (err) => {
      console.error(`[WebSocketServer] Socket error for session ${sessionId}:`, err);
    });
  });

  console.log('[WebSocketServer] Real-time audio stream server listening on /api/live-stream');
  return wss;
}
