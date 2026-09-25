import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/authMiddleware.js';
import { sessionsRouter } from './routes/sessions.js';
import { analyticsRouter } from './routes/analytics.js';
import { authRouter } from './routes/auth.js';
import { setupWebSocketServer } from './websocket/streamServer.js';
import { AGENT_PERSONAS } from './config/agentPersonas.js';
import { isLiveSupabase } from './db/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', '*'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: isLiveSupabase ? 'connected' : 'in_memory_resilient',
      geminiApiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 20 && !process.env.GEMINI_API_KEY.includes('YourActual')),
      audioInputSpec: '16000Hz 16-bit Mono PCM',
      audioPlaybackSpec: '24000Hz 16-bit Little-Endian PCM'
    }
  });
});

// Personas Catalog
app.get('/api/personas', (req, res) => {
  res.json({
    success: true,
    personas: Object.values(AGENT_PERSONAS)
  });
});

// Authentication & Account Management Routes
app.use('/api/auth', authRouter);

// Protected API Routes
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);

// Initialize WebSockets
setupWebSocketServer(server);

// Start Server
server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Gemini Agentic Voice & Multimodal Server listening on :${PORT}`);
  console.log(`🎙️  Live Stream WS Endpoint: ws://localhost:${PORT}/api/live-stream`);
  console.log(`🌐 Allowed Client URL: ${CLIENT_URL}`);
  console.log('================================================================');
});
