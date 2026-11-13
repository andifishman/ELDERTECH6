import type { NavegacionAccion } from './types';

/**
 * Catálogo de las pantallas de la app a las que el asistente puede explicar
 * cómo llegar y mandar con un botón. Es la ÚNICA fuente de verdad para eso:
 * de acá salen la parte del prompt que describe cómo llegar a cada sección,
 * las respuestas fijas a "¿cómo voy a X?" y el botón que se agrega solo.
 *
 * Antes el modelo improvisaba los caminos (llegó a decir que "Horarios" estaba
 * adentro de "Más", cuando es el botón rojo de la pantalla de inicio). Si una
 * pantalla cambia de lugar o de nombre en `app/index.tsx` o `app/mas/index.tsx`,
 * hay que actualizarla acá.
 */
export interface SeccionApp {
  id: string;
  /** Nombre tal como lo ve el residente en el botón. */
  nombre: string;
  /** Ruta de Expo Router. "/horarios" la traduce el cliente a la pantalla de Actividades vigente. */
  ruta: string;
  emoji: string;
  /**
   * Palabras o frases (en minúscula, sin tildes) con las que el residente
   * nombra la sección. Solo las que no se confunden con otra cosa: "tiempo"
   * o "más" sueltas, por ejemplo, no sirven.
   */
  palabras: string[];
  /** Pasos para llegar desde la pantalla de inicio. */
  comoLlegar: string;
  /** Qué se ve / qué se puede hacer adentro, en una o dos oraciones. */
  queHay: string;
}

const DESDE_MAS = (tarjeta: string) =>
  `En la pantalla de inicio, tocá el botón naranja "Más" (abajo de todo). Ahí adentro tocá la tarjeta "${tarjeta}".`;

export const SECCIONES_APP: readonly SeccionApp[] = [
  {
    id: 'actividades',
    nombre: 'Actividades',
    ruta: '/horarios',
    emoji: '📅',
    palabras: ['actividad', 'actividades', 'horario', 'horarios', 'taller', 'talleres', 'grilla', 'cronograma', 'programacion'],
    comoLlegar: 'En la pantalla de inicio, tocá el botón rojo grande "Actividades" (es el primero, arriba de todo).',
    queHay:
      'Ahí ves las actividades del día de tu piso, con la hora, quién la da y el lugar. Con las flechas ‹ › al lado del día pasás al día anterior o al siguiente, y "Volver a hoy" te trae de vuelta. La actividad que está pasando ahora se pinta de amarillo.',
  },
  {
    id: 'llamar',
    nombre: 'Llamar',
    ruta: '/llamar',
    emoji: '📞',
    palabras: ['llamar', 'llamadas', 'contactos', 'agenda de contactos'],
    comoLlegar: 'En la pantalla de inicio, tocá el botón verde "Llamar".',
    queHay: 'Ahí está tu lista de contactos: tocás a la persona para llamarla. Para sumar a alguien, tocá el botón verde "Agregar contacto".',
  },
  {
    id: 'tutoriales',
    nombre: 'Tutoriales',
    ruta: '/articulos',
    emoji: '📚',
    palabras: ['tutorial', 'tutoriales', 'guias', 'videos explicativos'],
    comoLlegar: 'En la pantalla de inicio, tocá el botón celeste "Tutoriales".',
    queHay: 'Ahí hay guías y videos cortos para aprender a usar el celular: WhatsApp, videollamadas, fotos, WiFi y más.',
  },
  {
    id: 'agenda',
    nombre: 'Agenda',
    ruta: '/agenda',
    emoji: '🗓️',
    palabras: ['agenda', 'recordatorio', 'recordatorios', 'mis turnos'],
    comoLlegar: DESDE_MAS('Agenda'),
    queHay: 'Ahí anotás tus recordatorios personales y la app te avisa a la hora. Para crear uno, tocá "Nuevo recordatorio".',
  },
  {
    id: 'hablemos',
    nombre: 'Hablemos',
    ruta: '/mas/hablemos',
    emoji: '💬',
    palabras: ['hablemos', 'mensajes', 'mensajear', 'chatear con otros residentes'],
    comoLlegar: 'En la pantalla de inicio, tocá el botón "Hablemos".',
    queHay: 'Ahí podés mandarles mensajes de texto o de voz a otros residentes.',
  },
  {
    id: 'mas',
    nombre: 'Más',
    ruta: '/mas',
    emoji: '➕',
    palabras: ['boton mas', 'seccion mas', 'menu mas', 'pantalla mas', 'mas opciones'],
    comoLlegar: 'En la pantalla de inicio, tocá el botón naranja "Más" (abajo de todo).',
    queHay: 'Ahí están Clima, Radio, Agenda, Mi familia, Sugerencias y Accesibilidad (para agrandar la letra).',
  },
  {
    id: 'clima',
    nombre: 'Clima',
    ruta: '/mas/clima',
    emoji: '🌤️',
    palabras: ['clima', 'pronostico'],
    comoLlegar: DESDE_MAS('Clima'),
    queHay: 'Ahí ves la temperatura de ahora y el pronóstico de los próximos días.',
  },
  {
    id: 'radio',
    nombre: 'Radio',
    ruta: '/mas/radio',
    emoji: '📻',
    palabras: ['radio', 'radios', 'emisora', 'emisoras'],
    comoLlegar: DESDE_MAS('Radio'),
    queHay: 'Ahí elegís una radio y la escuchás. Sigue sonando aunque vayas a otra pantalla de la app.',
  },
  {
    id: 'juegos',
    nombre: 'Juegos',
    ruta: '/mas/juegos',
    emoji: '🎮',
    palabras: ['juego', 'juegos', 'jugar', 'memotest', 'sopa de letras', 'ahorcado', 'laberinto'],
    comoLlegar: 'En la pantalla de inicio, tocá el botón "Juegos".',
    queHay: 'Ahí hay juegos para ejercitar la memoria y pasar el rato, como memotest, sopa de letras y ahorcado.',
  },
  {
    id: 'familia',
    nombre: 'Mi familia',
    ruta: '/mas/familia',
    emoji: '👨‍👩‍👧',
    palabras: ['mi familia', 'familiares'],
    comoLlegar: DESDE_MAS('Mi familia'),
    queHay: 'Ahí ves a los familiares vinculados con vos y lo que te mandan.',
  },
  {
    id: 'sugerencias',
    nombre: 'Sugerencias',
    ruta: '/mas/pedidos',
    emoji: '📝',
    palabras: ['sugerencia', 'sugerencias', 'pedido al personal', 'pedidos al personal', 'reclamo', 'reclamos'],
    comoLlegar: DESDE_MAS('Sugerencias'),
    queHay: 'Ahí le podés mandar una sugerencia o un pedido al personal de la residencia.',
  },
  {
    id: 'accesibilidad',
    nombre: 'Accesibilidad',
    ruta: '/mas/accesibilidad',
    emoji: '🔠',
    palabras: ['accesibilidad', 'letra grande', 'letra mas grande', 'agrandar la letra', 'tamano de la letra', 'tamano de letra'],
    comoLlegar: DESDE_MAS('Accesibilidad'),
    queHay: 'Ahí podés agrandar la letra de toda la app.',
  },
  {
    id: 'novedades',
    nombre: 'Novedades',
    ruta: '/novedades',
    emoji: '📰',
    palabras: ['novedad', 'novedades', 'anuncios', 'noticias de la residencia', 'noticias del hogar'],
    comoLlegar: 'En la pantalla de inicio, arriba de los botones de colores, tocá el recuadro "Novedades".',
    queHay: 'Ahí están las noticias y avisos de la residencia. Te muestra cuántas tenés sin leer.',
  },
  {
    id: 'como-usar',
    nombre: '¿Cómo usar?',
    ruta: '/como-usar',
    emoji: '❓',
    palabras: ['como usar', 'como se usa la app', 'guia de la app', 'ayuda de la app'],
    comoLlegar: 'En la pantalla de inicio, arriba, tocá "¿Cómo usar?".',
    queHay: 'Ahí hay una guía simple que explica cada parte de la aplicación.',
  },
];

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contienePalabra(textoNormalizado: string, palabra: string): boolean {
  return new RegExp(`(?:^|\\s)${palabra}(?:\\s|$)`).test(textoNormalizado);
}

/**
 * Secciones que el texto nombra. Si una frase larga contiene a otra más corta
 * ("menu mas" / "mas opciones"), igual cuenta una sola vez por sección.
 */
export function seccionesMencionadas(texto: string): SeccionApp[] {
  const norm = normalizarTexto(texto);
  return SECCIONES_APP.filter((s) => s.palabras.some((p) => contienePalabra(norm, p)));
}

export function seccionPorId(id: string): SeccionApp | undefined {
  return SECCIONES_APP.find((s) => s.id === id);
}

export function botonDeSeccion(seccion: SeccionApp): NavegacionAccion {
  return { ruta: seccion.ruta, etiqueta: `Ir a ${seccion.nombre}`, emoji: seccion.emoji };
}

export function seccionDeRuta(ruta: string): SeccionApp | undefined {
  return SECCIONES_APP.find((s) => s.ruta === ruta);
}

/**
 * "¿Cómo voy a...?", "¿dónde está...?", "llevame a...", "quiero entrar a...".
 * Pedidos de ir a un lugar de la app, no preguntas sobre su contenido: "¿cómo
 * está el clima?" NO entra (eso se contesta con el dato, no con el camino).
 */
const PIDE_IR =
  /\b(?:como|donde|por donde)\b.{0,25}\b(?:voy|vas|ir|llego|llegar|entro|entrar|abro|abrir|encuentro|encontrar|accedo|acceder|veo|ver|busco|buscar|esta el boton|esta la seccion|esta la pantalla)\b|\bdonde (?:esta|estan|queda|quedan)\b|\b(?:llevame|lleveme|llevarme|mostrame|abrime|abri|quiero ir|quiero entrar|quiero ver|ir a|pasame a)\b/;

/**
 * Si el mensaje es claramente "¿cómo llego a la sección X?", devuelve la
 * sección. Con dos secciones distintas nombradas no se adivina: lo resuelve el modelo.
 */
export function detectarPedidoDeIr(mensaje: string): SeccionApp | null {
  const norm = normalizarTexto(mensaje);
  if (!PIDE_IR.test(norm)) return null;
  const mencionadas = seccionesMencionadas(norm);
  return mencionadas.length === 1 ? (mencionadas[0] ?? null) : null;
}

export function respuestaComoLlegar(seccion: SeccionApp): string {
  return `${seccion.comoLlegar}\n\n${seccion.queHay}\n\nTambién podés tocar el botón de acá abajo y te llevo directo.`;
}

/**
 * Bloque del prompt con el camino real a cada sección — generado del catálogo
 * para que no se desactualice. Compacto a propósito (viaja en cada pedido):
 * las tarjetas de "Más" van agrupadas en una sola línea.
 */
export function promptComoLlegar(): string {
  const deMas = SECCIONES_APP.filter((s) => s.comoLlegar.includes('"Más"') && s.id !== 'mas');
  const directas = SECCIONES_APP.filter((s) => !deMas.includes(s));
  return [
    ...directas.map((s) => `- ${s.nombre}: ${s.comoLlegar.replace('En la pantalla de inicio, tocá ', '')}`),
    `- ${deMas.map((s) => s.nombre).join(', ')}: botón naranja "Más" → tocar la tarjeta con ese nombre.`,
  ].join('\n');
}

const VERBO_DE_CAMINO = /\b(?:toca|toque|tocar|toques|entra|entrar|entre|anda|ir|abri|abrir|abre|selecciona|elegi|presiona|pulsa)\b/;

/**
 * Los modelos a veces inventan el camino a una sección aunque el prompt les
 * da el exacto ("tocá el botón Más y luego Actividades", cuando Actividades
 * es el botón rojo de inicio). Cada línea que indica cómo llegar a UNA
 * sección pasando por "Más" cuando no está ahí se reemplaza por el camino del catálogo.
 * También saca las líneas que son solo un emoji + el nombre de una sección
 * (restos del botón que el modelo escribió como texto).
 */
export function corregirCaminos(texto: string): string {
  const lineas = texto.split('\n');
  const corregidas: string[] = [];
  for (const linea of lineas) {
    const norm = normalizarTexto(linea);
    if (norm && SECCIONES_APP.some((s) => normalizarTexto(s.nombre) === norm)) continue;

    if (VERBO_DE_CAMINO.test(norm)) {
      const nombradas = SECCIONES_APP.filter(
        (s) => s.id !== 'mas' && new RegExp(`(?:^|\\s)${normalizarTexto(s.nombre)}(?:\\s|$)`).test(norm),
      );
      const seccion = nombradas.length === 1 ? nombradas[0] : undefined;
      if (seccion) {
        const vaPorMas = /(?:^|\s)mas(?:\s|$)/.test(norm) && /\b(?:boton|tarjeta|seccion|menu|luego|despues|y)\b/.test(norm);
        const deberiaIrPorMas = seccion.comoLlegar.includes('"Más"');
        // Solo el error que se vio en la práctica: mandar por "Más" a una
        // sección que está en la pantalla de inicio. Al revés no se corrige:
        // "2. Ahí tocá la tarjeta Radio" es un paso válido de un camino en
        // varias líneas, aunque esa línea sola no nombre "Más".
        if (vaPorMas && !deberiaIrPorMas) {
          const prefijo = /^\s*\d+\.\s/.exec(linea)?.[0] ?? '';
          corregidas.push(`${prefijo}${seccion.comoLlegar}`);
          continue;
        }
      }
    }
    corregidas.push(linea);
  }
  return corregidas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
