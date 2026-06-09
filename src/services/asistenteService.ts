// Servicio del Asistente — IA (Gemini) + Supabase
import { supabase } from './supabase';
import type {
  SesionAsistente,
  MensajeAsistente,
  FaqAsistente,
  MensajeContexto,
} from '@/types/asistente.types';

// ─── Constantes ──────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

// Máximo de mensajes anteriores que se mandan como contexto a Gemini
const MAX_CONTEXTO = 10;

// System prompt del asistente
const SYSTEM_PROMPT = `Sos el asistente virtual de ElderTech, una aplicación para adultos mayores residentes en geriátricos.

Tu rol es ayudar a personas mayores con dudas sobre:
- WhatsApp (mensajes, fotos, videollamadas, audios)
- Llamadas telefónicas
- Fotos y cámara del celular
- Configuración del teléfono (volumen, brillo, WiFi, Bluetooth)
- Internet y navegación básica
- Contactos
- La aplicación ElderTech (horarios, radio, clima, tutoriales)

Reglas estrictas de comunicación:
- Usá lenguaje adulto, respetuoso y claro. NUNCA hablés como si el usuario fuera un niño.
- Frases cortas. Máximo 2-3 oraciones por párrafo.
- Cuando des instrucciones, usá pasos numerados (1. 2. 3.)
- Evitá términos técnicos. Si usás uno, explicalo en la misma oración.
- No uses emojis en exceso. Solo uno o dos por respuesta como máximo.
- Sé paciente y directo. No agregues relleno ni frases como "¡Claro que sí!" o "¡Excelente pregunta!".
- Si no sabés algo, decilo claramente y sugerí dónde buscar ayuda.
- Recordá el contexto de la conversación actual para responder preguntas de seguimiento.
- Máximo 150 palabras por respuesta.

Ejemplo de tono correcto:
Usuario: ¿Cómo hago una videollamada?
Respuesta:
Para hacer una videollamada por WhatsApp:
1. Abra WhatsApp.
2. Toque el nombre de la persona.
3. Toque el ícono de cámara en la parte superior.
4. Espere a que la otra persona atienda.`;

// ─── Gemini IA ────────────────────────────────────────────────────────────────

/**
 * Llama a Gemini 1.5 Flash con el historial de la conversación.
 * Devuelve la respuesta como string o lanza un error.
 */
export async function consultarGemini(
  mensajeUsuario: string,
  historial: MensajeContexto[],
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta EXPO_PUBLIC_GEMINI_API_KEY en el .env');
  }

  // Armar el array de contents: system prompt como primer mensaje + historial + pregunta actual
  const contents: MensajeContexto[] = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Entendido. Estoy listo para ayudar.' }] },
    ...historial.slice(-MAX_CONTEXTO),
    { role: 'user', parts: [{ text: mensajeUsuario }] },
  ];

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 400,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const texto =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!texto) throw new Error('Gemini no devolvió respuesta');
  return texto.trim();
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
