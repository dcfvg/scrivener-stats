import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Enable HMR explicitly and leave room to customize host/port for
        // remote or containerized setups. The overlay is enabled so runtime
        // errors show in the browser during development.
        hmr: {
          overlay: true,
          // For most local setups no extra config is needed. If you're
          // serving the dev server on a different host (docker, VM, remote),
          // you can set `host` and `clientPort` here, e.g.:
          // host: 'localhost',
          // clientPort: 3000,
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
