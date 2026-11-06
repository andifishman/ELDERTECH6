import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// App de familiares: PWA aparte del backoffice y de la app de residentes.
// Puerto 5174 para poder correr las tres a la vez (backoffice usa 5173).
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5174, host: true },
  build: {
    rollupOptions: {
      output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], supabase: ['@supabase/supabase-js'] } },
    },
  },
  test: { environment: 'node' },
});
