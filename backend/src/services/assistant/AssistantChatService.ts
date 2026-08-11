import { getCacheStore } from '../../cache';
import { env } from '../../config/env';
import { ProviderManager, type IProvider } from '../../core/provider';
import type { ChatCompletionInput, ChatCompletionOutput, GroqToolCall } from '../../providers/chat/ChatTypes';
import { GroqModelProvider } from '../../providers/chat/GroqModelProvider';
import { GroqWhisperProvider, type TranscriptionInput, type TranscriptionOutput } from '../../providers/chat/GroqWhisperProvider';
import { OpenRouterProvider } from '../../providers/chat/OpenRouterProvider';
import * as activitiesService from '../activities/ActivitiesService';
import * as tutorialsService from '../tutorials/TutorialsService';
import * as weatherService from '../weather/WeatherService';
import * as residentsService from '../residents/ResidentsService';
import * as searchService from '../search/SearchService';
import { buildSystemPrompt, HERRAMIENTAS_IA } from './prompt';
import { esIntentLlamar, esRutaValida, extraerNavegacionDelTexto, normalizarRuta, pareceQueNoSabe } from './textUtils';
import type { MensajeContexto, NavegacionAccion, RespuestaAsistente } from './types';

// 6 en vez de 10: el historial también viaja en cada request y consume del
// mismo límite de tokens/minuto de Groq. 3 intercambios alcanzan para las
// repreguntas típicas ("¿y mañana?") sin gastar cuota de toda la residencia.
const MAX_CONTEXTO = 6;
const MAX_TOOL_ITERATIONS = 5;

let chatManager: ProviderManager<ChatCompletionInput, ChatCompletionOutput> | null = null;
let whisperManager: ProviderManager<TranscriptionInput, TranscriptionOutput> | null = null;

function getChatManager(): ProviderManager<ChatCompletionInput, ChatCompletionOutput> {
  if (chatManager) return chatManager;
  if (!env.groqApiKey) throw new Error('GROQ_API_KEY no configurada en el servidor.');

  const providers: IProvider<ChatCompletionInput, ChatCompletionOutput>[] = [
    new GroqModelProvider('llama-3.3-70b-versatile', env.groqApiKey, 1),
    new GroqModelProvider('llama-3.1-8b-instant', env.groqApiKey, 2),
    // llama3-70b-8192 fue decomisionado por Groq (agosto 2025) — cualquier
    // pedido que llegara hasta el tier 3 fallaba con "model_decommissioned",
    // sin importar de qué se tratara la pregunta. gpt-oss-120b es de OpenAI
    // (no Meta/Llama), así que además da diversidad real de modelo, no solo
    // de tier, ante un problema puntual con la familia Llama.
    new GroqModelProvider('openai/gpt-oss-120b', env.groqApiKey, 3),
  ];

  // Vendor DISTINTO a Groq — si Groq como servicio se cae entero (no solo la
  // cuota de un modelo), los 3 de arriba fallan igual; OpenRouter corre en
  // infraestructura separada.
  if (env.openRouterApiKey) providers.push(new OpenRouterProvider(env.openRouterApiKey, env.openRouterModel, 4));

  // Slots listos para sumar más vendors cuando se carguen esas keys — cada
  // uno implementaría IProvider<ChatCompletionInput, ChatCompletionOutput>
  // normalizando su respuesta al mismo shape { message: { content, tool_calls } }:
  //   env.geminiApiKey && new GeminiChatProvider(env.geminiApiKey, 5)
  //   env.openAiApiKey && new OpenAiChatProvider(env.openAiApiKey, 6)

  // timeoutMs recortado a 12s (antes ~30-42s por modelo en el cliente) para que
  // el peor caso (3 modelos, sin reintento interno) entre en el maxDuration de
  // la función serverless (60s en Vercel Pro — ver vercel.json y el plan).
  chatManager = new ProviderManager(providers, getCacheStore(), {
    timeoutMs: 12_000,
    retriesPerProvider: 1,
  });
  return chatManager;
}

function getWhisperManager(): ProviderManager<TranscriptionInput, TranscriptionOutput> {
  if (whisperManager) return whisperManager;
  if (!env.groqApiKey) throw new Error('GROQ_API_KEY no configurada en el servidor.');

  whisperManager = new ProviderManager([new GroqWhisperProvider(env.groqApiKey)], getCacheStore(), {
    timeoutMs: 20_000,
    retriesPerProvider: 1,
  });
  return whisperManager;
}

/** Estado/métricas de los providers de chat — alimenta GET /api/admin/providers/health. */
export async function getAssistantProvidersHealth() {
  return getChatManager().getHealthSnapshot();
}

export async function transcribirAudio(audioBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const { text } = await getWhisperManager().execute({ audioBuffer, filename, mimeType });
  return text;
}

export async function generarTituloSesion(primerMensaje: string): Promise<string> {
  const fallback = primerMensaje.length > 40 ? `${primerMensaje.slice(0, 40).trimEnd()}…` : primerMensaje;
  try {
    const resultado = await ejecutarLoopAgentico(
      [
        {
          role: 'user',
          content: `Generá un título corto (máximo 5 palabras) para una conversación que empieza con: "${primerMensaje}". Solo el título, sin comillas ni puntuación al final.`,
        },
      ],
      20,
      false,
      null,
      null,
    );
    return resultado.texto.length > 0 ? resultado.texto : fallback;
  } catch {
    return fallback;
  }
}

export async function consultarIA(
  residenteId: string,
  organizacionId: string | null,
  mensajeUsuario: string,
  historial: MensajeContexto[],
): Promise<RespuestaAsistente> {
  // Para solicitudes de llamada: respuesta fija sin llamar a la IA, para evitar
  // que alucine sobre si una persona está o no en la lista de contactos.
  if (esIntentLlamar(mensajeUsuario)) {
    return {
      texto: 'Te llevo a tu lista de contactos para que elijas a quién llamar.',
      navegacion: { ruta: '/llamar', etiqueta: 'Ir a Contactos', emoji: '📞' },
    };
  }

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: buildSystemPrompt() },
    ...historial.slice(-MAX_CONTEXTO),
    { role: 'user', content: mensajeUsuario },
  ];

  return ejecutarLoopAgentico(messages, 400, true, organizacionId, residenteId);
}

/**
 * Loop agéntico: pide una respuesta, y si el modelo eligió usar una
 * herramienta, la ejecuta y le devuelve el resultado hasta que responda texto
 * final. Porteo de la lógica de `ejecutarConModelo`/`llamarIA` en el cliente —
 * ahora el fallback entre modelos lo maneja `ProviderManager`, no este loop.
 */
async function ejecutarLoopAgentico(
  messages: Array<Record<string, unknown>>,
  maxTokens: number,
  conHerramientas: boolean,
  organizacionId: string | null,
  residenteId: string | null,
): Promise<RespuestaAsistente> {
  const manager = getChatManager();
  const msgs = [...messages];
  let navegacion: NavegacionAccion | undefined;
  const herramientasUsadas = new Set<string>();

  // Red de seguridad determinística: si el modelo está por contestar "no sé"
  // sin haber buscado, se lo obliga a buscar UNA vez antes de dejarlo
  // responder. El prompt ya se lo pide, pero los modelos lo ignoran seguido
  // — sobre todo cuando el historial ya trae rechazos previos, que refuerzan
  // el patrón de rendirse. Esto no depende de que el modelo obedezca.
  let busquedaForzadaPendiente = false;
  let yaSeForzoBusqueda = false;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const input: ChatCompletionInput = {
      messages: msgs,
      maxTokens,
      tools: conHerramientas ? HERRAMIENTAS_IA : undefined,
      toolChoice: !conHerramientas
        ? undefined
        : busquedaForzadaPendiente
          ? { type: 'function', function: { name: 'buscar_informacion_externa' } }
          : 'auto',
      // Baja a propósito: con 0.7 el modelo inventaba detalles que no estaban
      // en el resultado de la búsqueda (p. ej. el autor de un gol). Acá se
      // prioriza que el dato sea fiel por sobre que la redacción sea variada.
      temperature: 0.3,
    };
    busquedaForzadaPendiente = false;

    const { message } = await manager.execute(input);
    const toolCalls = message.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      const textoRaw = (message.content ?? '').trim();
      if (!textoRaw) throw new Error('El asistente no pudo responder. Probá de nuevo en un momento.');

      const yaBusco = [...herramientasUsadas].some((k) => k.startsWith('buscar_informacion_externa:'));
      if (conHerramientas && !yaSeForzoBusqueda && !yaBusco && pareceQueNoSabe(textoRaw)) {
        yaSeForzoBusqueda = true;
        busquedaForzadaPendiente = true;
        msgs.push(message as unknown as Record<string, unknown>);
        msgs.push({
          role: 'system',
          content:
            'No le digas al usuario que no tenés esa información: todavía no buscaste. ' +
            'Usá buscar_informacion_externa ahora con una consulta breve y concreta, y después respondé con lo que encuentres. ' +
            'Si la búsqueda no trae nada útil, recién ahí decile que no encontraste esa información.',
        });
        continue;
      }

      const extraido = extraerNavegacionDelTexto(textoRaw);
      return { texto: extraido.texto, navegacion: navegacion ?? extraido.navegacion };
    }

    msgs.push(message as unknown as Record<string, unknown>);

    for (const toolCall of toolCalls) {
      msgs.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: await ejecutarHerramienta(toolCall, organizacionId, residenteId, herramientasUsadas, (nav) => {
          navegacion = nav;
        }),
      });
    }
  }

  if (navegacion) return { texto: 'Tocá el botón para ir a donde necesitás.', navegacion };
  throw new Error('El asistente tardó demasiado generando la respuesta. Intentá de nuevo.');
}

async function ejecutarHerramienta(
  toolCall: GroqToolCall,
  organizacionId: string | null,
  residenteId: string | null,
  herramientasUsadas: Set<string>,
  setNavegacion: (nav: NavegacionAccion) => void,
): Promise<string> {
  try {
    const args = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
    const toolKey = `${toolCall.function.name}:${toolCall.function.arguments}`;
    if (herramientasUsadas.has(toolKey)) {
      return JSON.stringify({
        error: 'Ya ejecutaste esta herramienta con los mismos parámetros. Respondé directamente al usuario con lo que sabés.',
      });
    }
    herramientasUsadas.add(toolKey);

    if (toolCall.function.name === 'buscar_actividades') {
      if (!organizacionId) return JSON.stringify({ error: 'No se pudo resolver la organización del residente.' });
      const fechaStr = args.fecha as string | undefined;
      const busqueda = (args.busqueda as string | undefined) ?? '';
      const horaStr = args.hora as string | undefined;
      // Antes, una `fecha` mal formada (p. ej. si el modelo, sin parámetro de
      // hora disponible, intentaba meter una hora como "08:00" acá) producía
      // un Invalid Date silencioso que terminaba en un `.eq('fecha', 'NaN-NaN-
      // NaN')` contra Postgres — un error real, no una respuesta rara. Ahora
      // se ignora una fecha inválida y se usa hoy, en vez de propagar el error.
      const fechaParseada = fechaStr ? new Date(fechaStr) : new Date();
      const fecha = Number.isNaN(fechaParseada.getTime()) ? new Date() : fechaParseada;
      const actividades = await activitiesService.searchActividades(organizacionId, busqueda, fecha, horaStr);
      return actividades.length > 0
        ? JSON.stringify(actividades)
        : JSON.stringify({ mensaje: 'No se encontraron actividades para esa búsqueda en esa fecha/hora.' });
    }

    if (toolCall.function.name === 'buscar_tutoriales') {
      const busqueda = (args.busqueda as string | undefined) ?? '';
      const tutoriales = await tutorialsService.searchTutoriales(busqueda);
      return tutoriales.length > 0
        ? JSON.stringify(tutoriales)
        : JSON.stringify({ mensaje: 'No se encontraron tutoriales para esa búsqueda.' });
    }

    if (toolCall.function.name === 'buscar_clima') {
      const ciudad = (args.ciudad as string | undefined)?.trim();

      const clima = ciudad
        ? await (async () => {
            const geo = (await weatherService.searchCities(ciudad))[0];
            if (!geo) return null;
            return weatherService.getWeather({
              ciudad: geo.name,
              pais: geo.country_code,
              lat: geo.latitude,
              lon: geo.longitude,
              timezone: geo.timezone,
            });
          })()
        : await weatherService.getWeatherForOrg(organizacionId);

      if (!clima) return JSON.stringify({ error: `No se encontró la ciudad "${ciudad}".` });

      return JSON.stringify({
        ciudad: clima.ciudad,
        descripcion: clima.descripcion,
        temperatura: clima.temperatura,
        sensacionTermica: clima.sensacionTermica,
        tempMax: clima.tempMax,
        tempMin: clima.tempMin,
        humedad: clima.humedad,
      });
    }

    if (toolCall.function.name === 'buscar_informacion_externa') {
      const consulta = (args.consulta as string | undefined)?.trim();
      if (!consulta) return JSON.stringify({ error: 'Falta la consulta a buscar.' });

      try {
        const { respuesta, fuentes } = await searchService.buscar(consulta, args.reciente === true);
        if (!respuesta && fuentes.length === 0) {
          return JSON.stringify({ mensaje: 'La búsqueda no encontró información sobre eso.' });
        }
        return JSON.stringify({
          respuesta,
          fuentes,
          recordatorio:
            'Respondé SOLO con datos que aparezcan textualmente acá arriba. Si te preguntaron por lo más reciente, usá la fuente con la fecha más nueva. No agregues goleadores, nombres, cifras ni detalles que no estén en estas fuentes.',
        });
      } catch {
        return JSON.stringify({
          error: 'No se pudo realizar la búsqueda en este momento. Decile al usuario que no encontraste esa información, sin inventar nada.',
        });
      }
    }

    if (toolCall.function.name === 'buscar_mi_informacion') {
      if (!residenteId) return JSON.stringify({ error: 'No se pudo resolver el residente.' });
      const [nombre, contexto] = await Promise.all([
        residentsService.obtenerNombreCompleto(residenteId),
        residentsService.getResidenteContext(residenteId),
      ]);
      return JSON.stringify({
        nombre_completo: nombre?.nombre_completo ?? (nombre ? `${nombre.nombre} ${nombre.apellido}` : null),
        seccion: contexto.seccion,
      });
    }

    if (toolCall.function.name === 'navegar_a_pantalla') {
      const ruta = normalizarRuta((args.ruta as string) ?? '/horarios');
      if (!esRutaValida(ruta)) {
        // El texto va dirigido al modelo, pero el modelo lo copiaba tal cual
        // en la burbuja del chat (llegó a listarle rutas técnicas al
        // residente), así que dice explícitamente que no se muestre.
        return JSON.stringify({
          error: 'No se pudo agregar el botón. NO le menciones esto al usuario ni le muestres rutas: respondé su pregunta normalmente, solo sin botón.',
        });
      }
      // Si la consulta se resolvió con información de internet, ningún botón
      // de la app la muestra — mandar al residente a Horarios con una etiqueta
      // tipo "Ver resultados de fútbol" es una pantalla que no existe desde su
      // punto de vista, aunque la ruta técnicamente sea válida.
      if ([...herramientasUsadas].some((k) => k.startsWith('buscar_informacion_externa:'))) {
        return JSON.stringify({
          error: 'Esa información vino de internet y ninguna pantalla de la app la muestra. Respondé solo con el texto, sin botón. NO le menciones esto al usuario.',
        });
      }
      setNavegacion({
        ruta,
        etiqueta: (args.etiqueta as string) ?? 'Ver más',
        emoji: (args.emoji as string) ?? '📅',
      });
      return JSON.stringify({ ok: true });
    }

    return JSON.stringify({ error: 'Herramienta desconocida.' });
  } catch {
    return JSON.stringify({ error: 'Error al ejecutar la herramienta.' });
  }
}
