// Servicio del Asistente — IA (Groq vía Edge Function) + Supabase
import { supabase } from './supabase';
import { buscarActividadesPorTexto } from './actividadesService';
import { buscarTutorialesPorTexto } from './tutorialesService';
import type {
  SesionAsistente,
  MensajeAsistente,
  FaqAsistente,
  MensajeContexto,
  NavegacionAccion,
} from '@/types/asistente.types';

export type { NavegacionAccion };

// ─── Constantes ──────────────────────────────────────────────────────────────

// Solo para desarrollo sin Edge Function desplegada — NO incluir en builds de
// producción: todo lo EXPO_PUBLIC_* queda expuesto en el bundle del cliente.
const GROQ_DEV_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Máximo de mensajes anteriores que se mandan como contexto
const MAX_CONTEXTO = 10;

// System prompt del asistente — la fecha se inyecta dinámicamente al llamar
function buildSystemPrompt(): string {
  const ahora = new Date();
  const fechaActual = ahora.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const anioActual = ahora.getFullYear();

  return `La fecha de hoy es ${fechaActual} (año ${anioActual}). Usá esta fecha para calcular edades, años transcurridos y cualquier dato que dependa del tiempo actual. Nunca uses una fecha distinta a esta.

Sos un asistente virtual inteligente integrado en ElderTech, una aplicación para adultos mayores en residencias geriátricas de Argentina.

== TU ROL ==
Podés responder cualquier pregunta: tecnología, historia, cultura, noticias, palabras y términos modernos, cocina, salud general, geografía, entretenimiento, o cualquier tema de conversación. También ayudás con el celular y la aplicación ElderTech.

Sobre ElderTech: la app tiene Inicio (actividades del día), Radio (emisoras en vivo), Clima (pronóstico), Asistente (este chat), Llamadas/Contactos, Tutoriales y Ajustes.

== CÓMO RESPONDER ==
- Respondé siempre en español rioplatense (Argentina).
- Usá lenguaje adulto, claro y respetuoso. NUNCA hablés como si el usuario fuera un niño.
- Frases cortas. Máximo 2-3 oraciones por párrafo.
- Para instrucciones paso a paso, usá números: 1. 2. 3.
- Si hay una palabra o término moderno que el usuario no conoce, explicalo con naturalidad en la respuesta.
- Evitá tecnicismos innecesarios. Si usás uno, explicalo en la misma oración.
- Máximo 150 palabras. Sé directo y útil.
- Sin frases de relleno como "¡Claro!" o "¡Excelente pregunta!".
- Solo 1 emoji por respuesta como máximo, y solo cuando aporte algo.
- NUNCA menciones rutas técnicas como "/mas/clima" o "/horarios". Cuando expliques cómo ir a una sección, describí los botones que el usuario debe tocar con instrucciones muy claras y simples para personas mayores. Referencia de navegación:
  * Clima → 1. Tocá el botón "Más" que está abajo a la derecha. 2. Se abre la pantalla de inicio con todos los botones de colores. 3. Tocá el botón "Clima".
  * Radio → 1. Tocá el botón "Más" que está abajo a la derecha. 2. Se abre la pantalla de inicio con todos los botones de colores. 3. Tocá el botón "Radio".
  * Ajustes → 1. Tocá el botón "Más" que está abajo a la derecha. 2. Se abre la pantalla de inicio con todos los botones de colores. 3. Tocá el botón "Ajustes".
  * Horarios / Actividades → Tocá el botón "Inicio" que está abajo a la izquierda.
  * Contactos / Llamadas → Tocá el botón "Llamadas" que está en el menú de abajo.
  * Tutoriales → Tocá el botón "Tutoriales" que está en el menú de abajo.

Ejemplo 1 — tecnología:
Usuario: ¿Cómo hago una videollamada?
Respuesta: Para hacer una videollamada por WhatsApp:
1. Abra WhatsApp.
2. Toque el nombre de la persona.
3. Toque el ícono de cámara arriba a la derecha.
4. Espere a que la otra persona atienda.

Ejemplo 2 — término moderno:
Usuario: ¿Qué es un "chad"?
Respuesta: "Chad" es una palabra de internet que se usa para describir a alguien seguro de sí mismo, exitoso o admirable. Los jóvenes la usan como elogio, como decir "ese chico es un crack".

== HERRAMIENTAS DE LA APP (usá solo cuando corresponda) ==

buscar_actividades: ÚNICAMENTE para actividades programadas en la RESIDENCIA: desayuno, almuerzo, merienda, cena, talleres, yoga, gimnasia, eventos del geriátrico. NUNCA la uses para preguntas sobre llamadas, WhatsApp, celular ni contactos.

buscar_tutoriales: ÚNICAMENTE para guías del celular o la app: WhatsApp, videollamadas, fotos, WiFi, batería, volumen, ajustes. Usala cuando el usuario pregunta CÓMO hacer algo en el teléfono.

navegar_a_pantalla: Mostrá un botón de acceso directo después de encontrar info, o cuando el usuario quiere ir a una sección. Rutas disponibles: "/horarios" o "/horarios/ID", "/articulos" o "/articulos/ID", "/llamar" (contactos y llamadas), "/mas/radio", "/mas/clima", "/" (inicio).

EJEMPLOS DE USO:
- "¿A qué hora es el desayuno?" → buscar_actividades(busqueda="desayuno") → navegar_a_pantalla("/horarios/ID")
- "¿Cómo uso WhatsApp?" → buscar_tutoriales(busqueda="WhatsApp") → navegar_a_pantalla("/articulos/ID")
- "Llamá a María" o "quiero llamar a alguien" → sin búsqueda → navegar_a_pantalla("/llamar")
- "¿Qué actividades hay hoy?" → buscar_actividades() sin busqueda → navegar_a_pantalla("/horarios")
- Preguntas generales (historia, cultura, tecnología no relacionada) → responder directo, sin herramientas.`;
}

// ─── IA (Groq) ───────────────────────────────────────────────────────────────

/** Extrae el texto de una respuesta con formato OpenAI/Groq. */
function extraerTexto(data: unknown): string {
  const d = data as { choices?: Array<{ message?: { content?: string } }> } | null;
  return d?.choices?.[0]?.message?.content?.trim() ?? '';
}

// Tipos internos para el loop de tool calling
interface GroqToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

// Herramientas disponibles para la IA
const HERRAMIENTAS_IA = [
  {
    type: 'function',
    function: {
      name: 'buscar_actividades',
      description:
        'Busca actividades reales en el horario de la residencia ElderTech. ' +
        'Llamá esta herramienta cuando el usuario pregunta por cualquier actividad o ' +
        'horario de la residencia: desayuno, almuerzo, merienda, cena, talleres, ejercicio, etc.',
      parameters: {
        type: 'object',
        properties: {
          fecha: {
            type: 'string',
            description:
              'Fecha en formato YYYY-MM-DD. Omitir para usar el día de hoy.',
          },
          busqueda: {
            type: 'string',
            description:
              'Nombre o tipo de actividad (ej: "desayuno", "taller de pintura"). ' +
              'Omitir para ver todas las actividades del día.',
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
        'Busca tutoriales y guías sobre el celular o la app ElderTech. ' +
        'Usá esta herramienta SOLO cuando el usuario pregunta CÓMO hacer algo en el teléfono: ' +
        'WhatsApp, videollamadas, fotos, WiFi, batería, volumen, llamadas, ajustes del celular, etc.',
      parameters: {
        type: 'object',
        properties: {
          busqueda: {
            type: 'string',
            description:
              'Tema o app a buscar (ej: "WhatsApp", "videollamada", "fotos", "WiFi", "batería").',
          },
        },
        required: ['busqueda'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navegar_a_pantalla',
      description:
        'Agrega un botón de navegación directa en el chat. ' +
        'Llamalo cuando encontraste información específica y el usuario se beneficia de ir directamente ahí, ' +
        'o cuando el usuario quiere llamar a alguien (ruta "/llamar").',
      parameters: {
        type: 'object',
        properties: {
          ruta: {
            type: 'string',
            description:
              'Ruta de destino. Opciones: ' +
              '"/horarios" (todos los horarios del día), ' +
              '"/horarios/ID" (actividad específica — reemplazá ID con el id real), ' +
              '"/articulos" (todos los tutoriales), ' +
              '"/articulos/ID" (tutorial específico — reemplazá ID con el id real), ' +
              '"/llamar" (pantalla de contactos y llamadas), ' +
              '"/mas/radio", "/mas/clima", "/" (inicio).',
          },
          etiqueta: {
            type: 'string',
            description: 'Texto del botón (ej: "Ver desayuno", "Tutorial de WhatsApp", "Ir a Contactos").',
          },
          emoji: {
            type: 'string',
            description: 'Emoji del botón (📅 horarios, 📚 tutoriales, 📞 llamadas, 📻 radio, 🌤️ clima).',
          },
        },
        required: ['ruta', 'etiqueta', 'emoji'],
      },
    },
  },
] as const;

/**
 * Llama a la IA con soporte de tool calling (loop agéntico).
 * - Dev (GROQ_DEV_API_KEY): llama directamente a Groq con herramientas.
 * - Prod: usa la Edge Function (sin herramientas por ahora).
 * @param conHerramientas false para llamadas auxiliares (ej: generar título)
 */
async function llamarIA(
  messages: Array<Record<string, unknown>>,
  maxTokens = 400,
  conHerramientas = true,
): Promise<{ texto: string; navegacion?: NavegacionAccion }> {
  const controller = new AbortController();
  // 20s para el loop agéntico (puede hacer 2+ requests)
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    if (GROQ_DEV_API_KEY) {
      let navegacion: NavegacionAccion | undefined;
      const msgs = [...messages];

      // Rastrea tools ya llamadas con los mismos args para cortar bucles
      const herramientasUsadas = new Set<string>();

      // Loop agéntico — máximo 5 iteraciones para evitar bucles infinitos
      for (let iter = 0; iter < 5; iter++) {
        const body: Record<string, unknown> = {
          model: GROQ_MODEL,
          messages: msgs,
          temperature: 0.7,
          max_tokens: maxTokens,
        };
        if (conHerramientas) {
          body.tools = HERRAMIENTAS_IA;
          body.tool_choice = 'auto';
        }

        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_DEV_API_KEY}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.text();
          console.warn(`[Asistente] Groq error ${res.status}: ${err}`);
          throw new Error('El asistente no pudo responder. Probá de nuevo en un momento.');
        }

        const data = await res.json();
        const message = data.choices?.[0]?.message as Record<string, unknown> | undefined;
        if (!message) throw new Error('El asistente no pudo responder. Probá de nuevo en un momento.');

        const toolCalls = message.tool_calls as GroqToolCall[] | undefined;

        // Sin tool calls → respuesta final
        if (!toolCalls || toolCalls.length === 0) {
          const texto = ((message.content as string) ?? '').trim();
          if (!texto) throw new Error('El asistente no pudo responder. Probá de nuevo en un momento.');
          return { texto, navegacion };
        }

        // Agregar el mensaje del asistente con las tool calls al historial
        msgs.push(message);

        // Ejecutar cada tool call y devolver los resultados
        for (const toolCall of toolCalls) {
          let toolResult: string;

          try {
            const args = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;

            // Si el AI llama la misma herramienta+args dos veces, cortamos el bucle
            const toolKey = `${toolCall.function.name}:${toolCall.function.arguments}`;
            if (herramientasUsadas.has(toolKey)) {
              toolResult = JSON.stringify({
                error: 'Ya ejecutaste esta herramienta con los mismos parámetros. Respondé directamente al usuario con lo que sabés.',
              });
              msgs.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult });
              continue;
            }
            herramientasUsadas.add(toolKey);

            if (toolCall.function.name === 'buscar_actividades') {
              const fechaStr = args.fecha as string | undefined;
              const busqueda = (args.busqueda as string | undefined) ?? '';
              const fecha = fechaStr ? new Date(fechaStr) : new Date();
              const actividades = await buscarActividadesPorTexto(busqueda, fecha);
              toolResult = actividades.length > 0
                ? JSON.stringify(actividades)
                : JSON.stringify({ mensaje: 'No se encontraron actividades para esa búsqueda en esa fecha.' });
            } else if (toolCall.function.name === 'buscar_tutoriales') {
              const busqueda = (args.busqueda as string | undefined) ?? '';
              const tutoriales = await buscarTutorialesPorTexto(busqueda);
              toolResult = tutoriales.length > 0
                ? JSON.stringify(tutoriales)
                : JSON.stringify({ mensaje: 'No se encontraron tutoriales para esa búsqueda.' });
            } else if (toolCall.function.name === 'navegar_a_pantalla') {
              navegacion = {
                ruta: (args.ruta as string) ?? '/horarios',
                etiqueta: (args.etiqueta as string) ?? 'Ver más',
                emoji: (args.emoji as string) ?? '📅',
              };
              toolResult = JSON.stringify({ ok: true });
            } else {
              toolResult = JSON.stringify({ error: 'Herramienta desconocida.' });
            }
          } catch {
            toolResult = JSON.stringify({ error: 'Error al ejecutar la herramienta.' });
          }

          msgs.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
      }

      // Si agotamos iteraciones pero tenemos navegación, devolvemos igual
      if (navegacion) {
        return { texto: 'Tocá el botón para ir a donde necesitás.', navegacion };
      }
      throw new Error('El asistente tardó demasiado generando la respuesta. Intentá de nuevo.');
    }

    // Ruta segura (producción): Edge Function — sin tool calling por ahora
    const { data, error } = await supabase.functions.invoke('asistente', {
      body: { messages, max_tokens: maxTokens },
    });
    if (error) throw new Error('El asistente no está disponible en este momento.');
    const texto = extraerTexto(data);
    if (!texto) throw new Error('El asistente no pudo responder. Probá de nuevo en un momento.');
    return { texto };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('El asistente tardó demasiado. Verificá tu conexión y probá de nuevo.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generarTituloSesion(primerMensaje: string): Promise<string> {
  const fallback =
    primerMensaje.length > 40
      ? primerMensaje.slice(0, 40).trimEnd() + '…'
      : primerMensaje;

  try {
    const { texto } = await llamarIA(
      [{ role: 'user', content: `Generá un título corto (máximo 5 palabras) para una conversación que empieza con: "${primerMensaje}". Solo el título, sin comillas ni puntuación al final.` }],
      20,
      false, // sin herramientas — solo necesita texto
    );
    return texto.length > 0 ? texto : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Detecta si el mensaje es claramente una solicitud de llamada/contactos.
 * Si lo es, saltamos el loop de tool calling para evitar que el AI confunda
 * nombres de personas ("Juan", "Tobi") con actividades de la residencia.
 */
function esIntentLlamar(texto: string): boolean {
  // Normalizar: minúsculas + quitar acentos (NFD + strip combining marks U+0300-U+036F)
  const lower = texto.toLowerCase().normalize('NFD').replace(/̀-ͯ/g, '');
  return /\bllama(r|me|lo|la)?\b|\bquiero llamar\b|\bpuedo llamar\b|\bllamar a\b|\bcontacto(s)?\b/.test(lower);
}

export async function consultarIA(
  mensajeUsuario: string,
  historial: MensajeContexto[],
): Promise<{ texto: string; navegacion?: NavegacionAccion }> {
  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: buildSystemPrompt() },
    ...historial.slice(-MAX_CONTEXTO),
    { role: 'user', content: mensajeUsuario },
  ];

  // Para solicitudes de llamada: saltamos tools y agregamos navegación directo.
  // Evita que el AI busque "Juan" como si fuera una actividad de la residencia.
  if (esIntentLlamar(mensajeUsuario)) {
    const { texto } = await llamarIA(messages, 200, false);
    return {
      texto,
      navegacion: { ruta: '/llamar', etiqueta: 'Ir a Contactos', emoji: '📞' },
    };
  }

  return llamarIA(messages, 400, true);
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

export async function crearSesion(residenteId: string): Promise<SesionAsistente> {
  const { data, error } = await supabase
    .from('sesiones_asistente')
    .insert({ residente_id: residenteId })
    .select()
    .single();

  if (error) throw new Error(`Error al crear sesión: ${error.message}`);
  return data as SesionAsistente;
}

export async function getSesionesRecientes(
  residenteId: string,
  limit = 10,
): Promise<SesionAsistente[]> {
  const { data, error } = await supabase
    .from('sesiones_asistente')
    .select('*')
    .eq('residente_id', residenteId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Error al cargar sesiones: ${error.message}`);
  return (data ?? []) as SesionAsistente[];
}

export async function actualizarTituloSesion(
  sesionId: string,
  titulo: string,
): Promise<void> {
  await supabase
    .from('sesiones_asistente')
    .update({ titulo })
    .eq('id', sesionId);
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export async function getMensajesDeSesion(
  sesionId: string,
): Promise<MensajeAsistente[]> {
  const { data, error } = await supabase
    .from('mensajes_asistente')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error al cargar mensajes: ${error.message}`);
  return (data ?? []) as MensajeAsistente[];
}

export async function guardarMensaje(
  sesionId: string,
  residenteId: string,
  rol: 'usuario' | 'asistente',
  contenido: string,
): Promise<MensajeAsistente> {
  const { data, error } = await supabase
    .from('mensajes_asistente')
    .insert({ sesion_id: sesionId, residente_id: residenteId, rol, contenido })
    .select()
    .single();

  if (error) throw new Error(`Error al guardar mensaje: ${error.message}`);
  return data as MensajeAsistente;
}

export async function toggleFavoritoMensaje(
  mensajeId: string,
  esFavorito: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('mensajes_asistente')
    .update({ es_favorito: esFavorito })
    .eq('id', mensajeId);

  if (error) throw new Error(`Error al actualizar favorito: ${error.message}`);
}

export async function getMensajesFavoritos(
  residenteId: string,
): Promise<MensajeAsistente[]> {
  const { data, error } = await supabase
    .from('mensajes_asistente')
    .select('*')
    .eq('residente_id', residenteId)
    .eq('es_favorito', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as MensajeAsistente[];
}

// ─── Transcripción de voz (Groq Whisper) ─────────────────────────────────────

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/**
 * Transcribe un archivo de audio a texto usando Groq Whisper.
 * Primero intenta la Edge Function (segura); si no está disponible,
 * usa la key local de desarrollo.
 * @param audioUri URI local del archivo de audio (expo-av Recording)
 */
export async function transcribirAudio(audioUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri: audioUri, type: 'audio/m4a', name: 'audio.m4a' } as unknown as Blob);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  // Ruta directa (desarrollo)
  if (!GROQ_DEV_API_KEY) {
    throw new Error('Reconocimiento de voz no disponible.');
  }

  const res = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_DEV_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`[Whisper] Error ${res.status}: ${err}`);
    throw new Error('No se pudo transcribir el audio.');
  }

  const texto = await res.text();
  if (!texto.trim()) throw new Error('No se detectó voz en el audio.');
  return texto.trim();
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export async function getFaq(): Promise<FaqAsistente[]> {
  const { data, error } = await supabase
    .from('faq_asistente')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) return [];
  return (data ?? []) as FaqAsistente[];
}
