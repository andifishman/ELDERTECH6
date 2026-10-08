// Qué está pasando en la app web que NO hay que cortar recargando la página (ver la actualización
// automática en ./serviceWorker.ts): audio sonando (radio, mensajes de voz), una grabación, la voz
// leyendo en voz alta, o un texto escrito todavía sin enviar.
//
// El audio y la grabación se anotan acá ellos mismos (utils/audioCompat.web.ts, utils/grabadora.web.ts);
// la voz y los textos se revisan en el momento.

const enCurso = new Set<object>();

/** Anota (o borra) algo en curso. `clave` identifica a quién lo anota — ej. el elemento <audio>. */
export function marcarEnCurso(clave: object, activo: boolean): void {
  if (activo) enCurso.add(clave);
  else enCurso.delete(clave);
}

function hayTextoSinEnviar(): boolean {
  const campos = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'textarea, input[type="text"], input[type="search"], input:not([type])',
  );
  return Array.from(campos).some((campo) => campo.value.trim() !== '');
}

export function hayAlgoEnCurso(): boolean {
  if (enCurso.size > 0) return true;
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) return true;
  return hayTextoSinEnviar();
}
