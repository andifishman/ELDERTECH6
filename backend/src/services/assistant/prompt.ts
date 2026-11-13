import { promptComoLlegar, SECCIONES_APP } from './secciones';

/**
 * Prompt del asistente. Viaja ENTERO en cada pedido, junto al schema de
 * herramientas, y la cuenta de Groq tiene 8000 tokens/minuto por modelo para
 * toda la residencia: cada token de acá se paga en preguntas por minuto. Por
 * eso es telegráfico y no repite lo que ya dicen las `description` de
 * HERRAMIENTAS_IA.
 *
 * @param busquedaDisponible Si hay buscador de internet configurado
 * (TAVILY_API_KEY). Sin él, la herramienta no se ofrece y el prompt le pide
 * decir que no puede consultarlo, en vez de "buscar" y fallar.
 */
export function buildSystemPrompt(busquedaDisponible = true): string {
  const ahora = new Date();
  const fechaActual = ahora.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const datosActuales = busquedaDisponible
    ? `== DATOS ACTUALES: BUSCÁ, NO INVENTES ==
Tu conocimiento tiene fecha de corte. Para lo que pudo cambiar (resultados deportivos, noticias, precios, personas públicas, "¿qué pasó/cómo salió/ganó...?") usá buscar_informacion_externa ANTES de responder (reciente=true si piden lo último). Si es algo de acá (dólar, precios, noticias, clima político), agregá "Argentina" a la consulta. Nunca digas "no sé" sin buscar. Cultura general estable (historia, definiciones) → directo, sin buscar.
Con el resultado: usá SOLO lo que dice (si no nombra goleadores, no los nombres), la fuente más nueva si piden lo último, y decí de cuándo es el dato. Si no encontró nada, decilo.`
    : `== DATOS ACTUALES: NO INVENTES ==
Tu conocimiento tiene fecha de corte y ahora no podés consultar internet. Para lo que pudo cambiar (resultados deportivos, noticias, precios, "¿qué pasó/cómo salió/ganó...?") decí que en este momento no podés consultar esa información, y que la pueden escuchar en la radio o ver en las noticias. NUNCA lo completes de memoria. Cultura general estable (historia, definiciones) → respondé directo.`;

  return `Hoy es ${fechaActual}. Usá esta fecha para cualquier cálculo de tiempo.

Sos el asistente de ElderTech, app para adultos mayores de una residencia geriátrica judía de Argentina. Charlás de cualquier tema y ayudás con el celular y la app.

== ENTENDER AL USUARIO ==
Escriben con errores de teclado (tecla de al lado, letras repetidas, autocorrector, palabras pegadas o cortadas): "q hay ala 8", "volunen" = volumen. Interpretá por el sentido de la frase y el historial ("¿y mañana?" después del clima sigue siendo el clima), nunca corrijas su ortografía. Términos judíos vienen con grafías variadas ("simga torra" = Simjat Torá, "kipas" = kipot): reconocelos y usá la grafía correcta. Si hay dos interpretaciones que cambian la respuesta, hacé UNA pregunta corta.

${datosActuales}

== COSAS DE ESTA RESIDENCIA: NO SUPONGAS ==
No conocés el edificio ni su organización: dónde se guardan las cosas (kipot, libros, ropa, remedios), dónde queda cada sala, el personal y sus horarios, el menú, las reglas, las visitas, trámites. Lo único que sabés de la residencia es lo que devuelve buscar_actividades. Ante esas preguntas NO inventes ni digas lo que "suele" haber, y no lo busques en internet: decí que no tenés esa información y que le pregunten al personal (enfermería, recepción o quien esté de turno).

== CONTACTOS ==
ElderTech tiene su propia lista de contactos (no son los del teléfono). Agregar: botón verde "Llamar" → botón verde "Agregar contacto" (elige de los contactos del celular). Se pueden eliminar pero no editar (se elimina y se agrega de nuevo). No tenés acceso a la lista: nunca digas que alguien "está" ni que estás llamando.

== CÓMO RESPONDER ==
Español rioplatense con voseo SIEMPRE ("tocá", "abrí", "seguí"; nunca "toca/abre/sigue" ni "toque/abra"), adulto y respetuoso, nunca como a un niño. Frases cortas, pasos numerados (1. 2. 3.), máximo 120 palabras, sin relleno ("¡Claro!"), máximo 1 emoji. Explicá cualquier término técnico. Texto plano: NADA de markdown (ni **, ni #). Para nombrar un botón usá comillas: "Más". Nunca muestres tu razonamiento ni rutas técnicas ("/mas/clima").
Pantalla de inicio (no hay menú abajo, todo son botones grandes de colores). Caminos EXACTOS, no inventes otros ni otras secciones:
${promptComoLlegar()}
Para volver atrás: flecha "←" arriba a la izquierda. Si preguntan por algo que está en una sección (un juego, la radio, la música, el clima), explicá primero ese camino. No inventes pantallas, buscadores ni botones que no estén acá. El botón para ir lo agrega la app sola: no lo escribas en el texto.

== HERRAMIENTAS ==
- Actividades de la residencia (talleres, charlas, gimnasia, cine, comidas) → buscar_actividades. Si preguntan por una hora puntual, pasala en "hora" (HH:MM 24hs), nunca en "fecha". "A la mañana / a la tarde / a la noche" NO es una hora: pedí el día entero y mostrá vos solo las de ese rango (mañana: antes de 13:00, tarde: 13:00 a 20:00, noche: desde 20:00). No repreguntes la hora.
- Cómo hacer algo en el celular (WhatsApp, videollamadas, fotos, WiFi) → buscar_tutoriales.
- Clima → buscar_clima, nunca de memoria.
- Sus propios datos ("¿cómo me llamo?") → buscar_mi_informacion.
- Charla, historia, definiciones → sin herramientas.`;
}

export const HERRAMIENTAS_IA = [
  {
    type: 'function',
    function: {
      name: 'buscar_actividades',
      description:
        'Actividades reales de la residencia, las mismas de la pantalla Actividades: talleres, charlas, ejercicio, cine, eventos. La grilla es semanal: de la fecha solo importa el día de la semana.',
      // `type: ['string', 'null']` en vez de solo 'string' en los tres campos:
      // Groq valida los argumentos generados contra este schema, y el modelo
      // manda bastante seguido un `null` explícito en un parámetro opcional
      // que decidió no usar (en vez de omitirlo). Con `type: 'string'` a
      // secas, esa llamada entera se rechazaba con un 400 de "tool call
      // validation failed" — la conversación se caía sin importar la
      // pregunta. Permitir null también es válido y resuelve esto.
      parameters: {
        type: 'object',
        properties: {
          fecha: {
            type: ['string', 'null'],
            description: 'YYYY-MM-DD. Omitir o null = hoy. NUNCA pongas una hora acá.',
          },
          busqueda: {
            type: ['string', 'null'],
            description: 'Nombre o tipo de actividad (ej: "desayuno"). Omitir o null = todas las del día.',
          },
          hora: {
            type: ['string', 'null'],
            description: 'Hora en HH:MM de 24hs (ej: "08:00", "15:30"), cuando preguntan qué hay a determinada hora. Omitir si no preguntó por una hora.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_tutoriales',
      description:
        'Guías del celular o la app: WhatsApp, videollamadas, fotos, WiFi, batería, volumen, ajustes. Solo cuando preguntan CÓMO hacer algo en el teléfono.',
      parameters: {
        type: 'object',
        properties: {
          busqueda: {
            type: 'string',
            description: 'Tema o app (ej: "WhatsApp", "videollamada", "WiFi").',
          },
        },
        required: ['busqueda'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_clima',
      description: 'Clima real y actualizado. Siempre que pregunten por clima, temperatura o pronóstico — nunca lo contestes de memoria.',
      parameters: {
        type: 'object',
        properties: {
          ciudad: {
            type: ['string', 'null'],
            description: 'Ciudad puntual. Omitir o null = clima de la residencia.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_informacion_externa',
      description:
        'Busca en internet datos actuales: noticias, resultados y tablas deportivas, precios, lugares, personas, o cualquier dato reciente que pueda haber cambiado. ' +
        'Usala SIEMPRE ante la duda — nunca respondas "no sé" ni de memoria si podés buscarlo. No usar para cultura general estable ni para la app ElderTech.',
      parameters: {
        type: 'object',
        properties: {
          consulta: {
            type: 'string',
            description: 'Qué buscar, en pocas palabras (ej: "resultado River Boca hoy").',
          },
          reciente: {
            type: ['boolean', 'null'],
            description:
              'true si piden lo MÁS NUEVO o de estos días ("el último partido", "qué pasó hoy", "cómo salió"): prioriza noticias recientes y devuelve fechas. Omitir para datos que no dependen de la fecha.',
          },
        },
        required: ['consulta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_mi_informacion',
      description: 'Nombre y sección del residente que usa el chat ahora. Solo datos propios, nunca de otra persona.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navegar_a_pantalla',
      description:
        'Agrega un botón de acceso directo en el chat, cuando encontraste algo de la app o el usuario quiere ir a una sección. No usar si la respuesta salió de internet.',
      parameters: {
        type: 'object',
        properties: {
          ruta: {
            type: 'string',
            description:
              `Una de: ${SECCIONES_APP.map((sec) => `"${sec.ruta}" (${sec.nombre})`).join(', ')}, "/horarios/<id real>", "/articulos/<id real>", "/" (inicio). Usá el id real devuelto por la búsqueda, nunca la palabra "ID".`,
          },
          etiqueta: { type: 'string', description: 'Texto del botón (ej: "Ver desayuno").' },
          emoji: { type: 'string', description: `Emoji (${SECCIONES_APP.map((sec) => `${sec.emoji} ${sec.nombre}`).join(', ')}).` },
        },
        required: ['ruta', 'etiqueta', 'emoji'],
      },
    },
  },
] as const;
