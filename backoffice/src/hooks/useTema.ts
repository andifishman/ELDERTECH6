// ========================================
// HOOK: useTema (modo claro/oscuro)
// DESCRIPCIÓN:
// Alterna la clase `dark` en <html> y persiste la
// preferencia. Respeta el esquema del sistema la primera
// vez. Los tokens de color ya soportan ambos modos.
// ========================================
import * as React from 'react';

type Tema = 'light' | 'dark';

function temaInicial(): Tema {
  const guardado = localStorage.getItem('eldertech-tema') as Tema | null;
  if (guardado) return guardado;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTema() {
  const [tema, setTema] = React.useState<Tema>(temaInicial);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', tema === 'dark');
    localStorage.setItem('eldertech-tema', tema);
  }, [tema]);

  const alternar = React.useCallback(() => setTema((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { tema, alternar };
}
