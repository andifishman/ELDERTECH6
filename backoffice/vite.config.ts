// ========================================
// CONFIG: Vite
// DESCRIPCIÓN:
// Configuración del bundler del backoffice.
// Define el alias "@/" → ./src y el plugin de React.
// ========================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// En Vercel queda en '/'. Para el hosting por FTP se compila con VITE_BASE_PATH=/admin/ (ver tools/deploy-ftp.mjs).
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      // alias "@/..." apunta a la carpeta src (igual convención que la app móvil)
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // separamos las librerías pesadas en chunks propios para mejorar la carga
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
