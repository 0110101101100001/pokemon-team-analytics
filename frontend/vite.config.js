import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      'lucide.react': path.resolve(__dirname, 'node_modules/lucide-react/dist/esm/lucide-react.js'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
