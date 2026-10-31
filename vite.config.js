import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.PORT || 5001;
  const target = env.API_PROXY_TARGET || `http://localhost:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target,
          changeOrigin: true
        },
        '/uploads': {
          target,
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 4173,
      host: '0.0.0.0'
    }
  };
});
