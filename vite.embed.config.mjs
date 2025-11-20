import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    base: '/scrivener-stats/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        overlay: true,
      },
    },
    plugins: [react()],
    cacheDir: path.resolve(import.meta.dirname, '.vite-cache'),
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      }
    }
  };
});
