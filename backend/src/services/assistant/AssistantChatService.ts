import { getCacheStore } from '../../cache';
import { feedAplicaA } from '../../config/feedHorarios';
import { env } from '../../config/env';
import { ConCupoDiario, ProviderManager, type IProvider } from '../../core/provider';
import type { ChatCompletionInput, ChatCompletionOutput, GroqToolCall } from '../../providers/chat/ChatTypes';
import { GroqModelProvider } from '../../providers/chat/GroqModelProvider';
import { GroqWhisperProvider, type TranscriptionInput, type TranscriptionOutput } from '../../providers/chat/GroqWhisperProvider';
import { GeminiProvider } from '../../providers/chat/GeminiProvider';
import { OpenRouterProvider } from '../../providers/chat/OpenRouterProvider';
import * as activitiesService from '../activities/ActivitiesService';
import * as tutorialsService from '../tutorials/TutorialsService';
import * as horariosExternos from '../horariosExternos/HorariosExternosService';
import * as weatherService from '../weather/WeatherService';
import * as residentsService from '../residents/ResidentsService';
import * as searchService from '../search/SearchService';
import { buildSystemPrompt, HERRAMIENTAS_IA } from './prompt';
import { botonDeSeccion, corregirCaminos, detectarPedidoDeIr, respuestaComoLlegar, seccionesMencionadas, seccionPorId } from './secciones';
import {
  derivaAlPersonal,
  esIntentLlamar,
  esRutaValida,
  esSaludoSimple,
  extraerNavegacionDelTexto,
  limpiarMarkdown,
  normalizarRuta,
  pareceQueNoSabe,
  pareceSuposicionSobreLaResidencia,
  RESPUESTA_PREGUNTAR_AL_PERSONAL,
  RESPUESTA_SALUDO,
} from './textUtils';
import type { MensajeContexto, NavegacionAccion, RespuestaAsistente } from './types';

// 6 en vez de 10: el historial también viaja en cada request y consume del
// mismo límite de tokens/minuto de Groq. 3 intercambios alcanzan para las
// repreguntas típicas ("¿y mañana?") sin gastar cuota de toda la residencia.
const MAX_CONTEXTO = 6;
const MAX_TOOL_ITERATIONS = 5;
/** Pedidos por día a Gemini como respaldo (muy por debajo del cupo gratis de flash-lite). Ver ConCupoDiario. */
const CUPO_DIARIO_GEMINI_CHAT = 300;
/**
 * Plazo total para contestar UN mensaje, contando todas las vueltas del loop
 * y todos los fallbacks entre modelos. La función serverless corta a los 60s
 * (vercel.json) con un 504 sin cuerpo — eso era el "Hubo un problema al
 * responder" de las preguntas largas: varias vueltas de herramientas × varios
 * modelos de respaldo pasaban el minuto. Con 45s queda margen para la base y la red.
 */
const PLAZO_TOTAL_MS = 45_000;
/** Con menos que esto, la siguiente vuelta ya no ofrece herramientas: tiene que contestar con lo que tiene. */
const RESERVA_RESPUESTA_FINAL_MS = 15_000;

/** Sin TAVILY_API_KEY la búsqueda en internet falla siempre: ni se ofrece (ahorra tokens y una vuelta inútil). */
function busquedaDisponible(): boolean {
  return Boolean(env.tavilyApiKey);
}

function herramientasDisponibles() {
  return busquedaDisponible()
    ? HERRAMIENTAS_IA
    : HERRAMIENTAS_IA.filter((h) => h.function.name !== 'buscar_informacion_externa');
}

let chatManager: ProviderManager<ChatCompletionInput, ChatCompletionOutput> | null = null;
let whisperManager: ProviderManager<TranscriptionInput, TranscriptionOutput> | null = null;

function getChatManager(): ProviderManager<ChatCompletionInput, ChatCompletionOutput> {
  if (chatManager) return chatManager;
  if (!env.groqApiKey) throw new Error('GROQ_API_KEY no configurada en el servidor.');

  // Solo modelos que la cuenta de Groq tiene habilitados (GET /openai/v1/models).
  // llama-3.3-70b-versatile y llama-3.1-8b-instant devolvían 404 en cada
  // pedido: el residente esperaba esos intentos fallidos y la única cuota real
  // eran los 8000 tokens/minuto de gpt-oss-120b — ~2 preguntas por minuto
  // para toda la residencia. Cada modelo de Groq tiene su PROPIA cuota por
  // minuto, así que tres modelos que andan triplican la capacidad.
  const providers: IProvider<ChatCompletionInput, ChatCompletionOutput>[] = [
    new GroqModelProvider('openai/gpt-oss-120b', env.groqApiKey, 1, { reasoning_effort: 'low', include_reasoning: false }),
    new GroqModelProvider('qwen/qwen3.8-27b', env.groqApiKey, 2, { reasoning_effort: 'none', reasoning_format: 'hidden' }),
    new GroqModelProvider('openai/gpt-oss-20b', env.groqApiKey, 3, { reasoning_effort: 'low', include_reasoning: false }),
  ];

  // Vendors DISTINTOS a Groq — si Groq se queda sin cuota (su tier gratuito
  // son 8000 tokens/minuto para toda la residencia) o se cae entero, los 3 de
  // arriba fallan juntos porque comparten infraestructura y cuota.
  //
  // COSTO CERO: Groq (cuenta sin tarjeta) solo corta con 429, nunca cobra.
  // Gemini SÍ podría cobrar si alguien activa la facturación del proyecto de
  // Google, así que va con un cupo diario propio bien por debajo del gratuito.
  if (env.geminiApiKey) {
    providers.push(new ConCupoDiario(new GeminiProvider(env.geminiApiKey, env.geminiModel, 4), getCacheStore(), CUPO_DIARIO_GEMINI_CHAT));
  }
  if (env.openRouterApiKey) providers.push(new OpenRouterProvider(env.openRouterApiKey, env.openRouterModel, 5));

  // Slot listo para sumar otro vendor cuando se cargue esa key — implementaría
  // IProvider<ChatCompletionInput, ChatCompletionOutput> normalizando su
  // respuesta al mismo shape { message: { content, tool_calls } }:
  //   env.openAiApiKey && new OpenAiChatProvider(env.openAiApiKey, 6)

  // timeoutMs recortado a 12s (antes ~30-42s por modelo en el cliente) para que
  // el peor caso (3 modelos, sin reintento interno) entre en el maxDuration de
  // la función serverless (60s en Vercel Pro — ver vercel.json y el plan).
  chatManager = new ProviderManager(providers, getCacheStore(), {
    timeoutMs: 15_000,
    retriesPerProvider: 1,
    // Antes un 429 (cuota por minuto de Groq, que se libera en segundos)
    // contaba como falla común: a la tercera dejaba ese modelo apagado 10
    // minutos para TODA la residencia. Tras un par de preguntas largas caían
    // los tres modelos de Groq y hasta un "hola" fallaba.
    rateLimitCooldownMs: 20_000,
    circuitBreaker: { failureThreshold: 3, cooldownMs: 60_000 },
    // Para el residente, un intento de más es mejor que un error sin intentar.
    tryAllWhenAllOpen: true,
    // Si los tres modelos están sin cuota por minuto (Groq dice "probá en
    // 8s"), esperar ese rato dentro del plazo en vez de mostrar el error.
    waitForCooldownWithinDeadline: true,
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
      Date.now() + 15_000,
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
  // Respuestas fijas, sin llamar a la IA: son instantáneas, no gastan cuota y
  // no pueden fallar ni equivocarse.

  // Llamadas: evita que alucine sobre si una persona está o no en los contactos.
  if (esIntentLlamar(mensajeUsuario)) {
    return {
      texto: 'Te llevo a tu lista de contactos para que elijas a quién llamar.',
      navegacion: { ruta: '/llamar', etiqueta: 'Ir a Contactos', emoji: '📞' },
    };
  }

  // "¿Cómo voy a Actividades?": el camino exacto sale del catálogo de
  // pantallas, no de lo que el modelo se imagine que hay en la app.
  const seccionPedida = detectarPedidoDeIr(mensajeUsuario);
  if (seccionPedida) {
    return { texto: respuestaComoLlegar(seccionPedida), navegacion: botonDeSeccion(seccionPedida) };
  }

  if (esSaludoSimple(mensajeUsuario)) return { texto: RESPUESTA_SALUDO };

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: buildSystemPrompt(busquedaDisponible()) },
    ...historial.slice(-MAX_CONTEXTO),
    { role: 'user', content: mensajeUsuario },
  ];

  const respuesta = await ejecutarLoopAgentico(
    messages,
    400,
    true,
    organizacionId,
    residenteId,
    Date.now() + PLAZO_TOTAL_MS,
    mensajeUsuario,
  );
  return respuesta;
}

/**
 * Loop agéntico: pide una respuesta, y si el modelo eligió usar una
 * herramienta, la ejecuta y le devuelve el resultado hasta que responda texto
 * final. El fallback entre modelos lo maneja `ProviderManager`; este loop se
 * encarga de que todo entre en `deadlineAt` y de revisar la respuesta final.
 */
async function ejecutarLoopAgentico(
  messages: Array<Record<string, unknown>>,
  maxTokens: number,
  conHerramientas: boolean,
  organizacionId: string | null,
  residenteId: string | null,
  deadlineAt: number,
  mensajeUsuario?: string,
): Promise<RespuestaAsistente> {
  const manager = getChatManager();
  const msgs = [...messages];
  let navegacion: NavegacionAccion | undefined;
  const herramientasUsadas = new Set<string>();
  const usoHerramienta = (nombre: string) => [...herramientasUsadas].some((k) => k.startsWith(`${nombre}:`));

  // Red de seguridad determinística: si el modelo está por contestar "no sé"
  // sin haber buscado, se lo obliga a buscar UNA vez antes de dejarlo
  // responder. El prompt ya se lo pide, pero los modelos lo ignoran seguido
  // — sobre todo cuando el historial ya trae rechazos previos, que refuerzan
  // el patrón de rendirse. Esto no depende de que el modelo obedezca.
  let busquedaForzadaPendiente = false;
  let yaSeForzoBusqueda = false;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    // Última vuelta posible (por cantidad o por tiempo): sin herramientas, así
    // el modelo contesta con lo que ya juntó en vez de pedir otra búsqueda
    // que no entra en el plazo.
    const ultimaVuelta = iter === MAX_TOOL_ITERATIONS - 1 || deadlineAt - Date.now() < RESERVA_RESPUESTA_FINAL_MS;
    const ofrecerHerramientas = conHerramientas && !ultimaVuelta;

    let message: ChatCompletionOutput['message'];
    try {
      ({ message } = await manager.execute(
        {
          messages: ofrecerHerramientas ? msgs : mensajesSinHerramientas(msgs),
          maxTokens,
          tools: ofrecerHerramientas ? herramientasDisponibles() : undefined,
          toolChoice: !ofrecerHerramientas
            ? undefined
            : busquedaForzadaPendiente
              ? { type: 'function', function: { name: 'buscar_informacion_externa' } }
              : 'auto',
          // Baja a propósito: con 0.7 el modelo inventaba detalles que no estaban
          // en el resultado de la búsqueda (p. ej. el autor de un gol). Acá se
          // prioriza que el dato sea fiel por sobre que la redacción sea variada.
          temperature: 0.3,
        },
        { deadlineAt },
      ));
    } catch (error) {
      // Si ya teníamos a dónde mandarlo, eso le sirve más que un error.
      if (navegacion) return { texto: 'Tocá el botón para ir a donde necesitás.', navegacion };
      throw error;
    }
    busquedaForzadaPendiente = false;
    const toolCalls = ofrecerHerramientas ? message.tool_calls : undefined;

    if (!toolCalls || toolCalls.length === 0) {
      const textoRaw = (message.content ?? '').trim();
      if (!textoRaw) {
        if (navegacion) return { texto: 'Tocá el botón para ir a donde necesitás.', navegacion };
        throw new Error('El asistente no pudo responder. Probá de nuevo en un momento.');
      }

      if (
        ofrecerHerramientas &&
        busquedaDisponible() &&
        !yaSeForzoBusqueda &&
        !usoHerramienta('buscar_informacion_externa') &&
        pareceQueNoSabe(textoRaw) &&
        // "No sé, preguntale al personal" es la respuesta CORRECTA para algo de
        // la residencia: buscarlo en internet solo trae datos de otro lugar.
        !derivaAlPersonal(textoRaw)
      ) {
        yaSeForzoBusqueda = true;
        busquedaForzadaPendiente = true;
        msgs.push(mensajeAsistenteLimpio(message));
        msgs.push({
          role: 'user',
          content:
            '(Nota del sistema, no la menciones) No le digas al usuario que no tenés esa información: todavía no buscaste. ' +
            'Usá buscar_informacion_externa ahora con una consulta breve y concreta, y después respondé con lo que encuentres. ' +
            'Si la búsqueda no trae nada útil, recién ahí decile que no encontraste esa información. ' +
            'Si la pregunta era sobre la residencia (lugares, objetos, personal, reglas), no busques: decile que le pregunte al personal.',
        });
        continue;
      }

      return finalizarRespuesta(textoRaw, navegacion, conHerramientas, mensajeUsuario, usoHerramienta);
    }

    // Ya contestó y además pidió solo el botón (pasa seguido con qwen): no hace
    // falta otra vuelta al modelo — cada vuelta son ~3000 tokens de la cuota.
    const soloNavegacion = toolCalls.every((tc) => tc.function.name === 'navegar_a_pantalla');
    const textoYaDado = (message.content ?? '').trim();
    if (soloNavegacion && textoYaDado) {
      for (const toolCall of toolCalls) {
        await ejecutarHerramienta(toolCall, organizacionId, residenteId, herramientasUsadas, (nav) => {
          navegacion = nav;
        });
      }
      msgs.push({ role: 'assistant', content: textoYaDado });
      return finalizarRespuesta(textoYaDado, navegacion, conHerramientas, mensajeUsuario, usoHerramienta);
    }

    msgs.push(mensajeAsistenteLimpio(message));

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

/**
 * Limpieza y controles de la respuesta final: herramientas escritas como
 * texto, markdown, suposiciones sobre la residencia y el botón de sección.
 */
function finalizarRespuesta(
  textoRaw: string,
  navegacion: NavegacionAccion | undefined,
  conHerramientas: boolean,
  mensajeUsuario: string | undefined,
  usoHerramienta: (nombre: string) => boolean,
): RespuestaAsistente {
  const extraido = extraerNavegacionDelTexto(textoRaw);
  const texto = corregirCaminos(limpiarMarkdown(extraido.texto));

  // Suposiciones sobre la residencia ("suelen guardarse en la sala de
  // oración"): el modelo no tiene ese dato y el residente le cree. Si no
  // salió de las actividades reales, se reemplaza por el "no sé" correcto.
  if (conHerramientas && !usoHerramienta('buscar_actividades') && pareceSuposicionSobreLaResidencia(texto)) {
    return { texto: RESPUESTA_PREGUNTAR_AL_PERSONAL };
  }

  const nav = navegacion ?? extraido.navegacion;
  return {
    texto: texto || 'Tocá el botón para ir a donde necesitás.',
    navegacion: conHerramientas ? (nav ?? botonSugerido(mensajeUsuario ?? '', texto, usoHerramienta)) : nav,
  };
}

/**
 * Solo los campos estándar. Algunos modelos devuelven extras (p. ej.
 * `reasoning` en gpt-oss) que otro vendor del fallback rechaza con un 400 si
 * se los reenvía en el historial de la vuelta siguiente.
 */
function mensajeAsistenteLimpio(message: ChatCompletionOutput['message']): Record<string, unknown> {
  const limpio: Record<string, unknown> = { role: 'assistant', content: message.content ?? '' };
  if (message.tool_calls && message.tool_calls.length > 0) {
    limpio.tool_calls = message.tool_calls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.function.name, arguments: tc.function.arguments },
      // Gemini 3 exige que se le devuelva la "thought_signature" de cada
      // llamada a herramienta en la vuelta siguiente (si no, 400). Los demás
      // vendors la sacan antes de enviar (ver sinCamposDeGemini).
      ...(tc.extra_content ? { extra_content: tc.extra_content } : {}),
    }));
  }
  return limpio;
}

/**
 * Para la vuelta final sin herramientas: varios vendors rechazan un historial
 * con `tool_calls`/`role: tool` si el pedido no declara `tools`. Se pasan los
 * resultados ya obtenidos como texto, para que conteste con ellos.
 */
function mensajesSinHerramientas(msgs: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const resultados = msgs.filter((m) => m.role === 'tool').map((m) => String(m.content ?? ''));
  const sinHerramientas = msgs.filter((m) => m.role !== 'tool' && !(m.role === 'assistant' && m.tool_calls));
  if (resultados.length === 0) return sinHerramientas;
  return [
    ...sinHerramientas,
    {
      role: 'user',
      content:
        '(Nota del sistema, no la menciones) Estos son los datos que ya consultaste para responder:\n' +
        resultados.join('\n').slice(0, 4000) +
        '\nRespondé ahora la pregunta del usuario usando solo estos datos. Si no alcanzan, decilo sin inventar.',
    },
  ];
}

/**
 * El modelo se olvida seguido de agregar el botón aunque la respuesta sea
 * sobre una sección de la app. Se agrega solo cuando es claro a cuál:
 * por la herramienta que usó, o porque la pregunta nombra UNA sección.
 * Si la respuesta salió de internet, ninguna pantalla la muestra: sin botón.
 */
function botonSugerido(
  mensajeUsuario: string,
  respuesta: string,
  usoHerramienta: (nombre: string) => boolean,
): NavegacionAccion | undefined {
  if (usoHerramienta('buscar_informacion_externa')) return undefined;
  if (derivaAlPersonal(respuesta)) return undefined;

  // Primero lo que nombró el residente ("¿cómo juego al memotest?" → Juegos),
  // aunque el modelo haya consultado otra cosa (p. ej. los tutoriales).
  const enLaPregunta = seccionesMencionadas(mensajeUsuario);
  const unicaEnLaPregunta = enLaPregunta.length === 1 ? enLaPregunta[0] : undefined;
  if (unicaEnLaPregunta) return botonDeSeccion(unicaEnLaPregunta);

  const actividades = seccionPorId('actividades');
  const tutoriales = seccionPorId('tutoriales');
  if (usoHerramienta('buscar_actividades') && actividades) return botonDeSeccion(actividades);
  if (usoHerramienta('buscar_tutoriales') && tutoriales) return botonDeSeccion(tutoriales);

  // La pregunta no nombra ninguna sección pero la respuesta explica cómo
  // llegar a una ("tocá el botón naranja "Más" y después "Tutoriales""): botón a esa.
  if (enLaPregunta.length === 0 && /\b(?:toc[aá]|entr[aá]|and[aá])\s/i.test(respuesta)) {
    const enLaRespuesta = seccionesMencionadas(respuesta).filter((sec) => sec.id !== 'mas');
    const unicaEnLaRespuesta = enLaRespuesta.length === 1 ? enLaRespuesta[0] : undefined;
    if (unicaEnLaRespuesta) return botonDeSeccion(unicaEnLaRespuesta);
  }
  return undefined;
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
      const fechaStr = args.fecha as string | undefined;
      const busqueda = (args.busqueda as string | undefined) ?? '';
      const horaStr = args.hora as string | undefined;
      // Con el feed del hogar configurado, las actividades son las que ve el residente en
      // la pantalla Actividades (vienen del sistema del hogar), no las de la tabla propia.
      if (env.ledorFeedKey && feedAplicaA(organizacionId)) {
        const delHogar = await horariosExternos.buscarParaAsistente({ fecha: fechaStr, busqueda, hora: horaStr });
        return delHogar.length > 0
          ? JSON.stringify(delHogar)
          : JSON.stringify({ mensaje: 'No se encontraron actividades para esa búsqueda en ese día/hora.' });
      }
      if (!organizacionId) return JSON.stringify({ error: 'No se pudo resolver la organización del residente.' });
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
        // Sin esto, ante "¿y mañana?" el modelo repetía el clima de HOY como si fuera el pronóstico.
        pronosticoProximosDias: clima.pronostico.slice(0, 5).map((d) => ({
          fecha: d.fecha,
          dia: d.labelDia,
          descripcion: d.descripcion,
          tempMax: d.tempMax,
          tempMin: d.tempMin,
        })),
        nota: 'temperatura/sensacionTermica/humedad son de AHORA. Para otro día usá pronosticoProximosDias.',
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
