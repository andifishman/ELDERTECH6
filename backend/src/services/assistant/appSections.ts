/**
 * Fuente única de verdad de las secciones REALES de ElderTech, para el
 * asistente de IA. Antes, la lista de "secciones de la app" del prompt y la
 * lista de rutas válidas de `navegar_a_pantalla` (en textUtils.ts) se
 * mantenían a mano por separado, y las dos habían quedado desactualizadas:
 * les faltaban Agenda, Hablemos, Juegos, Sugerencias, Accesibilidad y Cómo
 * usar (todas secciones reales y ya usadas por los residentes). Con dos
 * listas separadas era cuestión de tiempo que una se actualizara y la otra
 * no — exactamente el tipo de desincronización que hace que el asistente
 * "no sepa" de una función real, o que su validación de rutas rechace un
 * botón hacia una sección que sí existe.
 *
 * Esta lista se genera reflejando `app/` (rutas de Expo Router) y
 * `src/constants/comoUsarContenido.ts` (mismo contenido que ya usa la guía
 * "¿Cómo usar?" de la app — ver ese archivo si hay que agregar o sacar una
 * sección real). Actualizar ACÁ cuando se agregue/saque una pantalla real:
 * tanto el prompt como la validación de rutas de textUtils.ts se arman solos
 * a partir de esto, así no pueden volver a desincronizarse entre sí.
 */
export interface SeccionApp {
  id: string;
  nombre: string;
  ruta: string;
  /** Una frase — qué es, para el prompt del asistente. */
  descripcion: string;
  /** Botón real que hay que tocar desde la pantalla principal, en lenguaje simple. */
  comoLlegar: string;
  /** Tiene una pantalla de detalle en `ruta/<id>` con datos reales (actividad, tutorial, contacto, etc.). */
  tieneDetalle?: boolean;
}

export const SECCIONES_APP: SeccionApp[] = [
  {
    id: 'inicio',
    nombre: 'Inicio',
    ruta: '/',
    descripcion: 'Pantalla principal con accesos directos a todo lo demás.',
    comoLlegar: 'Es la primera pantalla al abrir la aplicación.',
  },
  {
    id: 'horarios',
    nombre: 'Horarios',
    ruta: '/horarios',
    descripcion: 'Actividades programadas por la residencia (desayuno, almuerzo, talleres, gimnasia, eventos) organizadas por día.',
    comoLlegar: 'Botón "Horarios" en la pantalla principal.',
    tieneDetalle: true,
  },
  {
    id: 'llamar',
    nombre: 'Llamar',
    ruta: '/llamar',
    descripcion: 'Lista de contactos propia de ElderTech (no los del teléfono) para llamar o mandar WhatsApp.',
    comoLlegar: 'Botón "Llamar" en la pantalla principal.',
    tieneDetalle: true,
  },
  {
    id: 'tutoriales',
    nombre: 'Tutoriales',
    ruta: '/articulos',
    descripcion: 'Guías paso a paso y videos para aprender a usar el celular (WhatsApp, fotos, WiFi, etc.).',
    comoLlegar: 'Botón "Tutoriales" en la pantalla principal.',
    tieneDetalle: true,
  },
  {
    id: 'asistente',
    nombre: 'Asistente',
    ruta: '/asistente',
    descripcion: 'Este mismo chat con el asistente de IA.',
    comoLlegar: 'Botón "Asistente" en la pantalla principal.',
  },
  {
    id: 'hablemos',
    nombre: 'Hablemos',
    ruta: '/mas/hablemos',
    descripcion: 'Mensajería de texto y de voz entre residentes de la misma casa.',
    comoLlegar: 'Botón "Hablemos" en la pantalla principal.',
  },
  {
    id: 'agenda',
    nombre: 'Agenda',
    ruta: '/agenda',
    descripcion: 'Calendario personal del residente para anotar recordatorios propios (no son las actividades de la residencia — eso es Horarios).',
    comoLlegar: 'Botón "Agenda" en la pantalla principal.',
    tieneDetalle: true,
  },
  // OJO: NO hay pantalla de "Perfil" (`/profile`) en la app — se llegó a
  // ofrecer como ruta válida en una versión vieja de este archivo, aunque el
  // archivo/ruta nunca existió. "¿cómo me llamo?" / "mis datos" se responden
  // con la herramienta buscar_mi_informacion (texto en el chat), sin botón.
  // Antes de agregar una sección acá, confirmar que existe de verdad un
  // archivo real bajo `app/` — ver el test `appSections.test.ts`.
  {
    id: 'como-usar',
    nombre: '¿Cómo usar?',
    ruta: '/como-usar',
    descripcion: 'Guía con explicaciones simples de cada sección de la aplicación.',
    comoLlegar: 'Botón "¿Cómo usar?" arriba de la pantalla principal.',
    tieneDetalle: true,
  },
  {
    id: 'mas',
    nombre: 'Más',
    ruta: '/mas',
    descripcion: 'Pantalla con accesos a Clima, Radio, Juegos, Sugerencias y Accesibilidad.',
    comoLlegar: 'Botón "Más" en la pantalla principal.',
  },
  {
    id: 'clima',
    nombre: 'Clima',
    ruta: '/mas/clima',
    descripcion: 'Clima actual y pronóstico de los próximos días.',
    comoLlegar: 'Botón "Más" y después "Clima".',
  },
  {
    id: 'radio',
    nombre: 'Radio',
    ruta: '/mas/radio',
    descripcion: 'Radios en vivo, organizadas por idioma y categoría.',
    comoLlegar: 'Botón "Más" y después "Radio".',
    tieneDetalle: true,
  },
  {
    id: 'juegos',
    nombre: 'Juegos',
    ruta: '/mas/juegos',
    descripcion:
      'Nueve juegos para entretenerse y ejercitar la memoria: Ahorcado, Memotest, Simon, Conexiones, Laberinto, Sopa de Letras, Une los Puntos, Jardín ElderTech y Bloques ElderTech.',
    comoLlegar: 'Botón "Más" y después "Juegos".',
  },
  {
    id: 'sugerencias',
    nombre: 'Sugerencias',
    ruta: '/mas/pedidos',
    descripcion: 'Enviar un pedido, comentario, sugerencia u otro mensaje al personal de la residencia.',
    comoLlegar: 'Botón "Más" y después "Sugerencias".',
  },
  {
    id: 'accesibilidad',
    nombre: 'Accesibilidad',
    ruta: '/mas/accesibilidad',
    descripcion: 'Tamaño de texto y otros ajustes de accesibilidad.',
    comoLlegar: 'Botón "Más" y después "Accesibilidad".',
  },
];

/** Slugs reales de `app/mas/juegos/<slug>.tsx` — únicos hijos dinámicos que son un slug fijo, no un id de base de datos. */
export const JUEGOS_SLUGS = ['jardin', 'bloques', 'ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos'] as const;

/**
 * Texto para el prompt: una línea por sección con descripción + cómo llegar
 * juntos (en vez de dos listas separadas) — el prompt viaja en cada mensaje,
 * así que repetir los 15 nombres dos veces es tokens de más para toda la
 * residencia sin ganar nada.
 */
export function seccionesParaPrompt(): string {
  return SECCIONES_APP.map((s) => `${s.nombre} (${s.comoLlegar}): ${s.descripcion}`).join(' · ');
}
