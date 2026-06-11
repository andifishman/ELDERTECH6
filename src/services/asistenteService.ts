// Servicio del Asistente — IA (Gemini) + Supabase
import { supabase } from './supabase';
import type {
  SesionAsistente,
  MensajeAsistente,
  FaqAsistente,
  MensajeContexto,
} from '@/types/asistente.types';

// ─── Constantes ──────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
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

Ejemplo 1 — tecnología:
Usuario: ¿Cómo hago una videollamada?
Respuesta: Para hacer una videollamada por WhatsApp:
1. Abra WhatsApp.
2. Toque el nombre de la persona.
3. Toque el ícono de cámara arriba a la derecha.
4. Espere a que la otra persona atienda.

Ejemplo 2 — término moderno:
Usuario: ¿Qué es un "chad"?
Respuesta: "Chad" es una palabra de internet que se usa para describir a alguien seguro de sí mismo, exitoso o admirable. Los jóvenes la usan como elogio, como decir "ese chico es un crack".`;
}

// ─── Groq IA ─────────────────────────────────────────────────────────────────

async function llamarGroq(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 400,
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('Falta EXPO_PUBLIC_GROQ_API_KEY en el .env');
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const texto = data?.choices?.[0]?.message?.content ?? '';
  if (!texto) throw new Error('Groq no devolvió respuesta');
  return texto.trim();
}

export async function generarTituloSesion(primerMensaje: string): Promise<string> {
  const fallback =
    primerMensaje.length > 40
      ? primerMensaje.slice(0, 40).trimEnd() + '…'
      : primerMensaje;

  if (!GROQ_API_KEY) return fallback;

  try {
    const titulo = await llamarGroq(
      [{ role: 'user', content: `Generá un título corto (máximo 5 palabras) para una conversación que empieza con: "${primerMensaje}". Solo el título, sin comillas ni puntuación al final.` }],
      20,
    );
    return titulo.length > 0 ? titulo : fallback;
  } catch {
    return fallback;
  }
}

export async function consultarGemini(
  mensajeUsuario: string,
  historial: MensajeContexto[],
): Promise<string> {
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...historial.slice(-MAX_CONTEXTO),
    { role: 'user', content: mensajeUsuario },
  ];
  return llamarGroq(messages, 400);
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
