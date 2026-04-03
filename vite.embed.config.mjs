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

export default defineConfig(() => {
  return {
    base: resolveBase(),
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
