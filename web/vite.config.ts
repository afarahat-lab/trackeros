import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/employees': { target: 'http://localhost:3000', changeOrigin: true },
      '/leaves': { target: 'http://localhost:3000', changeOrigin: true },
      '/balances': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
});
