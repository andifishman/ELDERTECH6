export type TipoMensajeHablemos = 'texto' | 'audio';
export type EstadoMensajeHablemos = 'enviado' | 'recibido' | 'leido';

export interface ResidenteResumenHablemos {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string | null;
  foto_url: string | null;
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

export interface Conversacion {
  id: string;
  organizacion_id: string;
  creado_por: string;
  ultimo_mensaje_preview: string | null;
  ultimo_mensaje_tipo: TipoMensajeHablemos | null;
  ultimo_mensaje_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Conversación desde el punto de vista de UN residente — incluye al otro participante y su propio no-leídos. */
export interface ConversacionConDetalle extends Conversacion {
  otroParticipante: ResidenteResumenHablemos | null;
  noLeidosCount: number;
}

export interface CrearMensajeTextoInput {
  conversacionId: string;
  remitenteId: string;
  contenido: string;
}

export interface CrearMensajeAudioInput {
  conversacionId: string;
  remitenteId: string;
  audioUrl: string;
  audioDuracionSegundos: number | null;
}

export interface ListarMensajesOpciones {
  before?: string;
  limit: number;
}
