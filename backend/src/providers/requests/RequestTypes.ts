export type TipoPedido = 'pedido' | 'comentario' | 'sugerencia' | 'actividad_propuesta' | 'recomendacion_pelicula';
export type EstadoPedido = 'pendiente' | 'en_proceso' | 'resuelta';
export type TranscripcionEstado = 'pendiente' | 'completada' | 'fallida';

export interface ResidenteResumen {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
  seccion: string | null;
}

export interface PedidoSugerencia {
  id: string;
  organizacion_id: string;
  residente_id: string;
  tipo: TipoPedido;
  titulo: string;
  descripcion: string | null;
  audio_url: string | null;
  audio_duracion_segundos: number | null;
  transcripcion: string | null;
  transcripcion_estado: TranscripcionEstado | null;
  estado: EstadoPedido;
  resuelto_por: string | null;
  resuelto_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoSugerenciaConResidente extends PedidoSugerencia {
  residente: ResidenteResumen | null;
}

export interface CrearPedidoInput {
  organizacionId: string;
  residenteId: string;
  tipo: TipoPedido;
  titulo: string;
  descripcion: string | null;
  audioUrl: string | null;
  audioDuracionSegundos: number | null;
  transcripcion: string | null;
  transcripcionEstado: TranscripcionEstado | null;
}
