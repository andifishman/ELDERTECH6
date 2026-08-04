import { getCacheStore } from '../../cache';
import { env } from '../../config/env';
import { ProviderManager, type IProvider } from '../../core/provider';
import type { ChatCompletionInput, ChatCompletionOutput, GroqToolCall } from '../../providers/chat/ChatTypes';
import { GroqModelProvider } from '../../providers/chat/GroqModelProvider';
import { GroqWhisperProvider, type TranscriptionInput, type TranscriptionOutput } from '../../providers/chat/GroqWhisperProvider';
import { OpenRouterProvider } from '../../providers/chat/OpenRouterProvider';
import * as activitiesService from '../activities/ActivitiesService';
import * as tutorialsService from '../tutorials/TutorialsService';
import { buildSystemPrompt, HERRAMIENTAS_IA } from './prompt';
import { esIntentLlamar, extraerNavegacionDelTexto } from './textUtils';
import type { MensajeContexto, NavegacionAccion, RespuestaAsistente } from './types';

const MAX_CONTEXTO = 10;
const MAX_TOOL_ITERATIONS = 5;

let chatManager: ProviderManager<ChatCompletionInput, ChatCompletionOutput> | null = null;
let whisperManager: ProviderManager<TranscriptionInput, TranscriptionOutput> | null = null;

function getChatManager(): ProviderManager<ChatCompletionInput, ChatCompletionOutput> {
  if (chatManager) return chatManager;
  if (!env.groqApiKey) throw new Error('GROQ_API_KEY no configurada en el servidor.');

  const providers: IProvider<ChatCompletionInput, ChatCompletionOutput>[] = [
    new GroqModelProvider('llama-3.3-70b-versatile', env.groqApiKey, 1),
    new GroqModelProvider('llama-3.1-8b-instant', env.groqApiKey, 2),
    new GroqModelProvider('llama3-70b-8192', env.groqApiKey, 3),
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
    );
    return resultado.texto.length > 0 ? resultado.texto : fallback;
  } catch {
    return fallback;
  }
}

export async function consultarIA(
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

  return ejecutarLoopAgentico(messages, 400, true, organizacionId);
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
): Promise<RespuestaAsistente> {
  const manager = getChatManager();
  const msgs = [...messages];
  let navegacion: NavegacionAccion | undefined;
  const herramientasUsadas = new Set<string>();

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const input: ChatCompletionInput = {
      messages: msgs,
      maxTokens,
      tools: conHerramientas ? HERRAMIENTAS_IA : undefined,
      toolChoice: conHerramientas ? 'auto' : undefined,
    };

    const { message } = await manager.execute(input);
    const toolCalls = message.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      const textoRaw = (message.content ?? '').trim();
      if (!textoRaw) throw new Error('El asistente no pudo responder. Probá de nuevo en un momento.');
      const extraido = extraerNavegacionDelTexto(textoRaw);
      return { texto: extraido.texto, navegacion: navegacion ?? extraido.navegacion };
    }

    msgs.push(message as unknown as Record<string, unknown>);

    for (const toolCall of toolCalls) {
      msgs.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: await ejecutarHerramienta(toolCall, organizacionId, herramientasUsadas, (nav) => {
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
      const fecha = fechaStr ? new Date(fechaStr) : new Date();
      const actividades = await activitiesService.searchActividades(organizacionId, busqueda, fecha);
      return actividades.length > 0
        ? JSON.stringify(actividades)
        : JSON.stringify({ mensaje: 'No se encontraron actividades para esa búsqueda en esa fecha.' });
    }

    if (toolCall.function.name === 'buscar_tutoriales') {
      const busqueda = (args.busqueda as string | undefined) ?? '';
      const tutoriales = await tutorialsService.searchTutoriales(busqueda);
      return tutoriales.length > 0
        ? JSON.stringify(tutoriales)
        : JSON.stringify({ mensaje: 'No se encontraron tutoriales para esa búsqueda.' });
    }

    if (toolCall.function.name === 'navegar_a_pantalla') {
      setNavegacion({
        ruta: (args.ruta as string) ?? '/horarios',
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
