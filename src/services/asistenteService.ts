// Servicio del Asistente — habla con nuestro backend (eldertech-api), nunca
// directo con Groq ni con las tablas de Supabase. Antes esto llamaba a Groq
// (chat + Whisper) directo desde el cliente con EXPO_PUBLIC_GROQ_API_KEY —
// esa key viajaba adentro del build. Ahora vive solo en el backend.
import { apiClient } from './apiClient';
import type {
  SesionAsistente,
  MensajeAsistente,
  FaqAsistente,
  MensajeContexto,
  NavegacionAccion,
} from '@/types/asistente.types';

export type { NavegacionAccion };

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export async function getFaq(): Promise<FaqAsistente[]> {
  try {
    return await apiClient.get<FaqAsistente[]>('/api/assistant/faq');
  } catch {
    return [];
  }
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

export async function crearSesion(_residenteId: string): Promise<SesionAsistente> {
  // residenteId se ignora acá — el backend lo resuelve del token de sesión.
  // Se mantiene el parámetro para no tener que tocar los callers existentes.
  return apiClient.post<SesionAsistente>('/api/assistant/sessions');
}

export async function getSesionesRecientes(_residenteId: string, limit = 10): Promise<SesionAsistente[]> {
  return apiClient.get<SesionAsistente[]>(`/api/assistant/sessions?limit=${limit}`);
}

export async function actualizarTituloSesion(sesionId: string, titulo: string): Promise<void> {
  await apiClient.patch(`/api/assistant/sessions/${sesionId}`, { titulo });
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export async function getMensajesDeSesion(sesionId: string): Promise<MensajeAsistente[]> {
  return apiClient.get<MensajeAsistente[]>(`/api/assistant/messages?sesionId=${sesionId}`);
}

export async function getMensajesFavoritos(_residenteId: string): Promise<MensajeAsistente[]> {
  try {
    return await apiClient.get<MensajeAsistente[]>('/api/assistant/messages/favorites');
  } catch {
    return [];
  }
}

export async function guardarMensaje(
  sesionId: string,
  _residenteId: string,
  rol: 'usuario' | 'asistente',
  contenido: string,
): Promise<MensajeAsistente> {
  return apiClient.post<MensajeAsistente>('/api/assistant/messages', { sesionId, rol, contenido });
}

export async function toggleFavoritoMensaje(mensajeId: string, esFavorito: boolean): Promise<void> {
  await apiClient.patch(`/api/assistant/messages/${mensajeId}/favorite`, { esFavorito });
}

// ─── IA ───────────────────────────────────────────────────────────────────────

export async function generarTituloSesion(primerMensaje: string): Promise<string> {
  const fallback = primerMensaje.length > 40 ? `${primerMensaje.slice(0, 40).trimEnd()}…` : primerMensaje;
  try {
    const { titulo } = await apiClient.post<{ titulo: string }>('/api/assistant/titles/generate', { primerMensaje });
    return titulo.length > 0 ? titulo : fallback;
  } catch {
    return fallback;
  }
}

export async function consultarIA(
  mensajeUsuario: string,
  historial: MensajeContexto[],
): Promise<{ texto: string; navegacion?: NavegacionAccion }> {
  return apiClient.post('/api/assistant/chat/completion', { mensaje: mensajeUsuario, historial });
}

// ─── Transcripción de voz ─────────────────────────────────────────────────────

export async function transcribirAudio(audioUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio', { uri: audioUri, type: 'audio/m4a', name: 'audio.m4a' } as unknown as Blob);

  const { texto } = await apiClient.postForm<{ texto: string }>('/api/assistant/transcribe', formData);
  if (!texto) throw new Error('No se detectó voz en el audio.');
  return texto;
}
