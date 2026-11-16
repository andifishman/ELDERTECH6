import { normalizarTexto, SECCIONES_APP } from './secciones';
import type { NavegacionAccion } from './types';

/**
 * Rutas reales de la app (Expo Router, ver `app/`) a las que la herramienta
 * `navegar_a_pantalla` puede mandar al residente. Cualquier otra cosa que el
 * modelo invente (ej. una pantalla de "resultados" que no existe) se
 * descarta acá — el backend decide qué rutas son válidas, no el modelo.
 */
const RUTAS_ESTATICAS_VALIDAS = new Set(['/', ...SECCIONES_APP.map((s) => s.ruta)]);
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
  '/inicio': '/',
  '/actividades': '/horarios',
  '/horarios-hogar': '/horarios',
  '/juegos': '/mas/juegos',
  '/hablemos': '/mas/hablemos',
  '/familia': '/mas/hablemos',
  '/sugerencias': '/mas/pedidos',
  '/pedidos': '/mas/pedidos',
  '/accesibilidad': '/mas/accesibilidad',
  '/recordatorios': '/agenda',
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
  // Rutas técnicas escritas en el texto ('"Navegar a X" 📅 /horarios/122'):
  // esa línea es para el botón, no para el residente.
  limpio = quitar(limpio, /(?:^|\n)[^\n]*(?:^|\s)\/(?:horarios|articulos|mas|llamar|agenda|novedades|como-usar)(?:\/[\w-]+)*(?=[\s.,)"]|$)[^\n]*/g, []);
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
  // "¿Cómo agrego/borro un contacto?" es una pregunta de cómo se hace, no un
  // pedido de llamar: la contesta el modelo (y el botón a Llamar se agrega solo).
  if (/\b(agreg|sum|borr|elimin|sac|edit|cambi|modific|guard)/.test(lower)) return false;
  return /\bllama(r|me|lo|la)?\b|\bquiero llamar\b|\bpuedo llamar\b|\bllamar a\b|\bcontacto(s)?\b/.test(lower);
}

/**
 * La burbuja del chat muestra texto plano: el markdown que mandan los modelos
 * ("**Más**", "# Título", "* item") le llegaba al residente con los asteriscos.
 */
export function limpiarMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)\*(\S[^*\n]*?)\*(?=\s|[.,;:!?]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const MENCIONA_PERSONAL = /\b(?:al|del|el|un|una|alguien del|a alguien del) (?:personal|equipo|staff)\b|\b(?:enfermer[ao]s?|enfermeria|recepcion|coordinacion|cuidador(?:a|es|as)?|asistentes de la residencia|personal de la residencia)\b/;

/** La respuesta manda al residente a preguntarle al personal (o sea, ya es el "no sé" correcto para algo de la residencia). */
export function derivaAlPersonal(texto: string): boolean {
  return MENCIONA_PERSONAL.test(normalizarTexto(texto));
}

const LUGAR_DE_LA_RESIDENCIA =
  /\b(?:residencia|hogar|geriatrico|piso|sala|salon|oficina|recepcion|coordinacion|enfermeria|comedor|habitacion|cuarto|pasillo|planta baja|sinagoga|templo|administracion|lavadero|lavanderia|deposito|armario|placard)\b/;
const SUPOSICION =
  /\b(?:suele|suelen|generalmente|normalmente|por lo general|habitualmente|probablemente|seguramente|posiblemente|es posible que|puede que|podria|podrian|en la mayoria de|lo mas probable|tipicamente|en general)\b/;

/**
 * El modelo "contesta" algo de ESTA residencia (dónde está tal cosa, quién
 * atiende, cómo es tal regla) suponiendo, sin ningún dato: "las kipot suelen
 * guardarse en la sala de oración". No sabe nada del edificio ni de sus
 * costumbres — eso solo lo sabe el personal.
 */
export function pareceSuposicionSobreLaResidencia(texto: string): boolean {
  const norm = normalizarTexto(texto);
  return LUGAR_DE_LA_RESIDENCIA.test(norm) && SUPOSICION.test(norm);
}

export const RESPUESTA_PREGUNTAR_AL_PERSONAL =
  'No tengo esa información de la residencia y no quiero decirte algo equivocado. ' +
  'Te conviene preguntarle al personal (enfermería, recepción o quien esté de turno): ellos te lo van a poder decir con seguridad.';

const SALUDO_SIMPLE =
  /^(?:hola|holi|holaa+|buen dia|buenos dias|buenas|buenas tardes|buenas noches|que tal|hey|hola que tal|hola buen dia|hola buenas|hola buenas tardes|hola buenas noches|hola buenos dias)(?: (?:como estas|como andas|como va|asistente|querido|querida))?$/;

/** "Hola", "buenas tardes", "hola, ¿cómo estás?" — sin ninguna pregunta adentro. */
export function esSaludoSimple(texto: string): boolean {
  return SALUDO_SIMPLE.test(normalizarTexto(texto));
}

export const RESPUESTA_SALUDO =
  '¡Hola! ¿En qué te puedo ayudar? Podés preguntarme qué actividades hay hoy, cómo está el clima, cómo usar algo del celular o de la app, o charlar de cualquier tema.';
