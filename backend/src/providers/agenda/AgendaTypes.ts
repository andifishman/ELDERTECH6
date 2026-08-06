export type PrioridadRecordatorio = 'baja' | 'media' | 'alta' | 'urgente';
export type EstadoRecordatorio = 'pendiente' | 'realizado' | 'vencido' | 'cancelado';
export type TipoContenidoRecordatorio = 'texto' | 'audio' | 'ambos';
export type OrigenRecordatorio = 'manual' | 'rapido' | 'horarios';
export type RecurrenciaTipo = 'ninguna' | 'diaria' | 'laborables' | 'semanal' | 'mensual' | 'anual' | 'personalizada';

/** Offsets de notificación soportados, en minutos antes del evento. `null` = sin notificación (default). */
export type OffsetNotificacion = 0 | 10 | 30 | 60 | 1440;

export interface Recordatorio {
  id: string;
  residente_id: string;
  organizacion_id: string;
  creado_por: string;

  titulo: string;
  descripcion: string | null;
  fecha: string; // 'YYYY-MM-DD'
  hora: string | null; // 'HH:MM:SS'

  prioridad: PrioridadRecordatorio;
  color: string | null;
  icono: string | null;

  estado: EstadoRecordatorio;
  completado_en: string | null;

  tipo_contenido: TipoContenidoRecordatorio;
  audio_url: string | null;
  audio_transcripcion: string | null;
  audio_duracion_segundos: number | null;

  recordatorio_offset_minutos: OffsetNotificacion | null;
  notificacion_enviada: boolean;

  origen: OrigenRecordatorio;
  actividad_origen_id: string | null;

  serie_id: string | null;
  es_plantilla: boolean;
  recurrencia_tipo: RecurrenciaTipo;
  recurrencia_dias_semana: number[] | null;
  recurrencia_hasta: string | null;

  created_at: string;
  updated_at: string;
}

/** Fila lista para insert — sin campos que resuelve la base (id/timestamps). */
export interface RecordatorioInputRow {
  residente_id: string;
  organizacion_id: string;
  creado_por: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string | null;
  prioridad: PrioridadRecordatorio;
  color: string | null;
  icono: string | null;
  tipo_contenido: TipoContenidoRecordatorio;
  audio_url: string | null;
  audio_transcripcion: string | null;
  audio_duracion_segundos: number | null;
  recordatorio_offset_minutos: OffsetNotificacion | null;
  origen: OrigenRecordatorio;
  actividad_origen_id: string | null;
  serie_id: string | null;
  es_plantilla: boolean;
  recurrencia_tipo: RecurrenciaTipo;
  recurrencia_dias_semana: number[] | null;
  recurrencia_hasta: string | null;
  estado?: EstadoRecordatorio;
  notificacion_enviada?: boolean;
}

/** Input de creación/edición recibido del cliente (ya validado por Zod). */
export interface RecordatorioInput {
  titulo: string;
  descripcion?: string | null;
  fecha: string;
  hora?: string | null;
  prioridad: PrioridadRecordatorio;
  color?: string | null;
  icono?: string | null;
  recordatorio_offset_minutos?: OffsetNotificacion | null;
  origen?: OrigenRecordatorio;
  recurrencia_tipo?: RecurrenciaTipo;
  recurrencia_dias_semana?: number[] | null;
  recurrencia_hasta?: string | null;
  // Audio ya subido vía POST /api/agenda/audio (ver AgendaService.subirYTranscribirAudio)
  audio_url?: string | null;
  audio_transcripcion?: string | null;
  audio_duracion_segundos?: number | null;
}

export interface ListarRecordatoriosOpciones {
  desde?: string;
  hasta?: string;
  estado?: EstadoRecordatorio;
  q?: string;
}

/** Recordatorio con notificación pendiente de disparar — usado por el cron. */
export interface RecordatorioCandidatoNotificacion extends Recordatorio {
  residente_id: string;
}
