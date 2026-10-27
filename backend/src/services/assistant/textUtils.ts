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
 * Algunos modelos, en vez de invocar la herramienta, la escriben como texto en la
 * respuesta. Los formatos vistos: `navegar_a_pantalla(ruta="/x", ...)`, tags
 * `<navegar_a_pantalla ruta="/x"/>`, el estilo Llama `<function=navegar_a_pantalla>{...}</function>`
 * y objetos JSON `{"name": "navegar_a_pantalla", "parameters": {...}}`. Sin esto,
 * ese código le llega tal cual al residente en la burbuja del chat.
 */
const HERRAMIENTAS = 'navegar_a_pantalla|buscar_actividades|buscar_tutoriales|buscar_clima|buscar_informacion_externa|buscar_mi_informacion';
const MENCIONA_HERRAMIENTA = new RegExp(String.raw`\b(?:${HERRAMIENTAS})\b`);
/** Objeto JSON con hasta un nivel de anidado ({"name": ..., "parameters": {...}}). */
const OBJETO_JSON_REGEX = /\{(?:[^{}]|\{[^{}]*\})*\}/g;

/** Saca de `texto` todo lo que matchee `regex` y cumpla `filtro`, y guarda lo sacado en `sacados`. */
function quitar(texto: string, regex: RegExp, sacados: string[], filtro: (m: string) => boolean = () => true): string {
  return texto.replace(regex, (m) => {
    if (!filtro(m)) return m;
    sacados.push(m);
    return '';
  });
}

/** Lee `clave="valor"`, `clave: "valor"` o `"clave": "valor"` (comillas simples o dobles). */
function leerCampo(fuente: string, clave: string): string | undefined {
  return new RegExp(String.raw`["']?${clave}["']?\s*[:=]\s*["']([^"']*)["']`).exec(fuente)?.[1];
}

/**
 * Extrae la navegación que el modelo escribió como texto y limpia la respuesta de
 * cualquier llamada a herramienta que haya quedado visible.
 */
export function extraerNavegacionDelTexto(texto: string): { texto: string; navegacion?: NavegacionAccion } {
  const sacados: string[] = [];
  let limpio = texto;

  // Orden: de lo más específico a lo más general.
  limpio = quitar(limpio, /<\|[^|>]*\|>/g, []); // marcadores especiales como <|python_tag|>
  limpio = quitar(limpio, /<function[=\s][^>]*>[\s\S]*?(?:<\/function>|$)/gi, sacados);
  limpio = quitar(limpio, OBJETO_JSON_REGEX, sacados, (m) => MENCIONA_HERRAMIENTA.test(m));
  limpio = quitar(limpio, /<([a-zA-Z_][a-zA-Z0-9_]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, sacados, (m) => MENCIONA_HERRAMIENTA.test(m));
  limpio = quitar(limpio, /<[a-zA-Z_][a-zA-Z0-9_]*(?:\s[^>]*)?\/>/g, sacados);
  // Línea suelta con una llamada tipo función, con o sin paréntesis cerrados.
  limpio = quitar(limpio, /(?:^|\n)[^\n]*\b(?:navegar_a_pantalla|buscar_[a-z_]+)\b[^\n]*/g, sacados, (m) => MENCIONA_HERRAMIENTA.test(m));
  limpio = limpio.replace(/\n{3,}/g, '\n\n').trim();

  const bloque = sacados.find((b) => /navegar_a_pantalla/.test(b));
  if (!bloque) return { texto: limpio };

  const rutaCruda = leerCampo(bloque, 'ruta');
  const ruta = rutaCruda ? normalizarRuta(rutaCruda) : undefined;
  if (!ruta || !esRutaValida(ruta)) return { texto: limpio };

  return {
    texto: limpio,
    navegacion: { ruta, etiqueta: leerCampo(bloque, 'etiqueta') ?? 'Ver más', emoji: leerCampo(bloque, 'emoji') ?? '📱' },
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
