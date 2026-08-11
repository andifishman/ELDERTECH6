import type { NavegacionAccion } from './types';

/**
 * Rutas reales de la app (Expo Router, ver `app/`) a las que la herramienta
 * `navegar_a_pantalla` puede mandar al residente. Cualquier otra cosa que el
 * modelo invente (ej. una pantalla de "resultados" que no existe) se
 * descarta acá — el backend decide qué rutas son válidas, no el modelo.
 */
const RUTAS_ESTATICAS_VALIDAS = new Set(['/', '/horarios', '/articulos', '/llamar', '/mas/radio', '/mas/clima', '/profile']);
const RUTA_DINAMICA_REGEX = /^\/(horarios|articulos)\/[a-zA-Z0-9-]{1,64}$/;
/** El prompt usa "ID" como marcador de posición; el modelo lo copia tal cual bastante seguido. */
const PLACEHOLDER_ID_REGEX = /\/(ID|id|<ID>|\{id\}|:id)$/;

/**
 * El modelo adivina rutas por el nombre visible de la sección ("/tutoriales"
 * porque el botón dice Tutoriales, aunque internamente sea "/articulos").
 * Traducir esos sinónimos es mejor que rechazarlos: el residente igual quería
 * ir ahí, y un rechazo terminaba con el modelo mostrándole el error interno.
 */
const ALIAS_RUTAS: Record<string, string> = {
  '/tutoriales': '/articulos',
  '/guias': '/articulos',
  '/clima': '/mas/clima',
  '/radio': '/mas/radio',
  '/contactos': '/llamar',
  '/llamadas': '/llamar',
  '/perfil': '/profile',
  '/inicio': '/',
  '/actividades': '/horarios',
};

export function normalizarRuta(ruta: string): string {
  const limpia = ruta.trim().replace(/\/+$/, '') || '/';
  const alias = ALIAS_RUTAS[limpia.toLowerCase()];
  if (alias) return alias;
  // Sinónimos con id: "/tutoriales/abc" → "/articulos/abc".
  const conId = /^\/(tutoriales|guias)\/(.+)$/i.exec(limpia);
  if (conId) return `/articulos/${conId[2]}`;
  const actividadConId = /^\/actividades\/(.+)$/i.exec(limpia);
  if (actividadConId) return `/horarios/${actividadConId[1]}`;
  return limpia;
}

export function esRutaValida(ruta: string): boolean {
  if (PLACEHOLDER_ID_REGEX.test(ruta)) return false;
  return RUTAS_ESTATICAS_VALIDAS.has(ruta) || RUTA_DINAMICA_REGEX.test(ruta);
}

/**
 * Algunos modelos, en vez de invocar la herramienta, escriben la llamada como
 * texto plano: `navegar_a_pantalla(ruta="/x", etiqueta="y", emoji="z")`. Sin
 * esto, esa línea le llega tal cual al residente en la burbuja del chat.
 */
const LLAMADA_FUNCION_REGEX =
  /(?:^|\n)[^\n]*\b(?:navegar_a_pantalla|buscar_actividades|buscar_tutoriales|buscar_clima|buscar_informacion_externa|buscar_mi_informacion)\s*\([^)]*\)[^\n]*/g;

/**
 * Algunos modelos escriben <navegar_a_pantalla .../> como texto en lugar de invocar
 * la herramienta correctamente. Este helper extrae la navegación del texto y lo limpia.
 * Porteo textual de src/services/asistenteService.ts (cliente).
 */
export function extraerNavegacionDelTexto(texto: string): { texto: string; navegacion?: NavegacionAccion } {
  const navTagRegex = /<navegar_a_pantalla([^>]*)>(.*?)<\/navegar_a_pantalla>|<navegar_a_pantalla([^/]*)\/>/gs;
  const match = navTagRegex.exec(texto);
  const matchLlamada = /navegar_a_pantalla\s*\(([^)]*)\)/.exec(texto);

  const textoLimpio = texto
    .replace(/<[a-zA-Z_][a-zA-Z0-9_]*(?:\s[^>]*)?>[\s\S]*?<\/[a-zA-Z_][a-zA-Z0-9_]*>/gs, '')
    .replace(/<[a-zA-Z_][a-zA-Z0-9_]*(?:\s[^>]*)?\s*\/>/gs, '')
    .replace(LLAMADA_FUNCION_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!match && !matchLlamada) return { texto: textoLimpio };

  const attrs = match?.[1] ?? match?.[3] ?? matchLlamada?.[1] ?? '';
  const rutaCruda = /ruta="([^"]*)"/.exec(attrs)?.[1];
  const ruta = rutaCruda ? normalizarRuta(rutaCruda) : undefined;
  const etiqueta = /etiqueta="([^"]*)"/.exec(attrs)?.[1];
  const emoji = /emoji="([^"]*)"/.exec(attrs)?.[1];

  if (!ruta || !esRutaValida(ruta)) return { texto: textoLimpio };

  return {
    texto: textoLimpio,
    navegacion: { ruta, etiqueta: etiqueta ?? 'Ver más', emoji: emoji ?? '📱' },
  };
}

/**
 * Detecta que el modelo está por contestar "no sé / no tengo información" —
 * exactamente lo que NO queremos si todavía no intentó buscar. El prompt ya
 * le pide buscar antes de rendirse, pero los modelos lo ignoran seguido
 * (sobre todo si el historial de la conversación ya tiene rechazos previos,
 * que refuerzan el patrón). Esto permite forzar la búsqueda desde el backend
 * en vez de depender de que el modelo obedezca.
 */
export function pareceQueNoSabe(texto: string): boolean {
  const lower = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  return /\bno tengo (informacion|datos|acceso|constancia|conocimiento)\b/.test(lower)
    || /\bno (dispongo|cuento) con\b/.test(lower)
    || /\bno puedo (buscar|acceder|saber|responder|ayudarte con eso)\b/.test(lower)
    || /\bno (se|sabria) (que|cual|como|cuando|si|el resultado|decirte)\b/.test(lower)
    || /\bno estoy seguro\b/.test(lower)
    || /\bno tengo forma de saber\b/.test(lower)
    || /\blo siento,? no\b/.test(lower);
}

/**
 * Detecta si el mensaje es claramente una solicitud de llamada/contactos, para
 * saltar el loop de tool-calling y evitar que la IA confunda nombres de
 * personas con actividades de la residencia.
 */
export function esIntentLlamar(texto: string): boolean {
  const lower = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return /\bllama(r|me|lo|la)?\b|\bquiero llamar\b|\bpuedo llamar\b|\bllamar a\b|\bcontacto(s)?\b/.test(lower);
}
