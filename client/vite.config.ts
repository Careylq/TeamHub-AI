import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // ★ dev 代理: /api → 后端 3001, 避免跨域 (CORS)
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
