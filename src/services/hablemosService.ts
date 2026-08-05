// Servicio: Hablemos — mensajería entre residentes. Habla con el backend propio
// (nunca con Supabase directo) para todo lo que sea lectura/escritura de datos.
import { apiClient } from './apiClient';

export type TipoMensajeHablemos = 'texto' | 'audio';
export type EstadoMensajeHablemos = 'enviado' | 'recibido' | 'leido';

export interface ResidenteBusqueda {
  id: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
}

export interface ConversacionHablemos {
  id: string;
  organizacion_id: string;
  creado_por: string;
  ultimo_mensaje_preview: string | null;
  ultimo_mensaje_tipo: TipoMensajeHablemos | null;
  ultimo_mensaje_at: string | null;
  created_at: string;
  updated_at: string;
  otroParticipante: ResidenteBusqueda | null;
  noLeidosCount: number;
}

export interface MensajeHablemos {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  tipo: TipoMensajeHablemos;
  contenido: string | null;
  audio_url: string | null;
  audio_duracion_segundos: number | null;
  estado: EstadoMensajeHablemos;
  recibido_en: string | null;
  leido_en: string | null;
  created_at: string;
}

export async function buscarResidentes(q: string): Promise<ResidenteBusqueda[]> {
  return apiClient.get<ResidenteBusqueda[]>(`/api/hablemos/residentes?q=${encodeURIComponent(q)}`);
}

export async function listarConversaciones(): Promise<ConversacionHablemos[]> {
  return apiClient.get<ConversacionHablemos[]>('/api/hablemos/conversaciones');
}

export async function iniciarConversacion(residenteId: string): Promise<ConversacionHablemos> {
  return apiClient.post<ConversacionHablemos>('/api/hablemos/conversaciones', { residenteId });
}

export interface ListarMensajesOpciones {
  before?: string;
  limit?: number;
}

export async function listarMensajes(conversacionId: string, opciones: ListarMensajesOpciones = {}): Promise<MensajeHablemos[]> {
  const params = new URLSearchParams();
  if (opciones.before) params.set('before', opciones.before);
  if (opciones.limit) params.set('limit', String(opciones.limit));
  const qs = params.toString();
  return apiClient.get<MensajeHablemos[]>(`/api/hablemos/conversaciones/${conversacionId}/mensajes${qs ? `?${qs}` : ''}`);
}

export async function enviarMensajeTexto(conversacionId: string, contenido: string): Promise<MensajeHablemos> {
  return apiClient.post<MensajeHablemos>(`/api/hablemos/conversaciones/${conversacionId}/mensajes/texto`, { contenido });
}

export async function enviarMensajeAudio(conversacionId: string, audioUri: string, duracionSegundos: number): Promise<MensajeHablemos> {
  const form = new FormData();
  form.append('duracionSegundos', String(duracionSegundos));
  form.append('audio', { uri: audioUri, type: 'audio/m4a', name: 'audio.m4a' } as unknown as Blob);
  return apiClient.postForm<MensajeHablemos>(`/api/hablemos/conversaciones/${conversacionId}/mensajes/audio`, form);
}

export async function marcarRecibidos(conversacionId: string): Promise<void> {
  await apiClient.patch<void>(`/api/hablemos/conversaciones/${conversacionId}/recibidos`);
}

export async function marcarLeidos(conversacionId: string): Promise<void> {
  await apiClient.patch<void>(`/api/hablemos/conversaciones/${conversacionId}/leidos`);
}
