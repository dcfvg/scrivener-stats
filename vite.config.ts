import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/scrivener-stats/',
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Enable HMR explicitly - the overlay shows runtime errors in the browser during development
    hmr: {
      overlay: true,
      // For remote or containerized setups, you can configure host and clientPort here:
      // host: 'localhost',
      // clientPort: 3000,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
