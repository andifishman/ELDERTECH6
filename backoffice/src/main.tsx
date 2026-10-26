// ========================================
// ENTRYPOINT: main
// DESCRIPCIÓN:
// Punto de entrada del backoffice. Monta <App /> en el
// DOM y carga los estilos globales (Tailwind + tokens).
// ========================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Después de cada deploy los archivos de las pantallas cambian de nombre
// (hash), y una pestaña abierta desde antes pide los viejos, que ya no
// existen ("Failed to fetch dynamically imported module"). En ese caso
// recargamos para traer la versión nueva. El guardado en sessionStorage
// evita un bucle de recargas si el error fuera por otra cosa (sin red).
window.addEventListener('vite:preloadError', (evento) => {
  const CLAVE = 'recarga-por-deploy';
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE) ?? 0);
    if (Date.now() - ultima < 10_000) return;
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // sin sessionStorage no podemos frenar un bucle, pero recargamos igual
  }
  evento.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
