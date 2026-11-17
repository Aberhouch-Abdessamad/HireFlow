/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Laravel API origin used by the dev proxy only. The browser always talks to
  // the Vite origin, so Sanctum session cookies and the XSRF-TOKEN cookie are first-party.
  const apiTarget = env.DEV_API_TARGET ?? 'http://localhost:8000';

  const proxy = {
    '/api': { target: apiTarget, changeOrigin: false },
    '/sanctum': { target: apiTarget, changeOrigin: false },
  };

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'react';
              if (id.includes('antd') || id.includes('@ant-design')) return 'antd';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('@tanstack/react-query')) return 'query';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});