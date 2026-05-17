import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const resolveBase = () => {
  const envBase = process.env.VITE_BASE_PATH || process.env.BASE_PATH;
  if (envBase) {
    return envBase.endsWith('/') ? envBase : `${envBase}/`;
  }

  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (repoName) {
    return `/${repoName}/`;
  }

  return '/';
};

export default defineConfig(() => ({
  base: resolveBase(),
  server: {
    port: Number(process.env.SCRIVENER_STATS_DEV_PORT || 3000),
    host: '127.0.0.1',
    hmr: {
      overlay: true,
    },
  },
  preview: {
    port: Number(process.env.SCRIVENER_STATS_PORT || 4678),
    host: '127.0.0.1',
  },
  plugins: [react()],
  cacheDir: path.resolve(__dirname, '.vite-cache'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
