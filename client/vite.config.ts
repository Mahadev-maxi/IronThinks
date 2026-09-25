import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from root directory (..) as well as client
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    envDir: '../',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(apiKey)
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
