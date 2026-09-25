import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from root directory (..) as well as client
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  const anthropicKey = env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || '';
  const openaiKey = env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || '';

  return {
    envDir: '../',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_ANTHROPIC_API_KEY': JSON.stringify(anthropicKey),
      'import.meta.env.ANTHROPIC_API_KEY': JSON.stringify(anthropicKey),
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(openaiKey),
      'import.meta.env.OPENAI_API_KEY': JSON.stringify(openaiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(geminiKey)
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
