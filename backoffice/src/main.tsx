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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
