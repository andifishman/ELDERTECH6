export type EstadoRecordatorio = 'pendiente' | 'realizado' | 'vencido' | 'cancelado';

/** Minutos de anticipación de la notificación — siempre 30, fijo y obligatorio. */
export const RECORDATORIO_OFFSET_MINUTOS = 30;

export interface Recordatorio {
  id: string;
  residente_id: string;
  organizacion_id: string;
  creado_por: string;

  titulo: string;
  fecha: string; // 'YYYY-MM-DD'
  hora: string; // 'HH:MM:SS'

  estado: EstadoRecordatorio;
  completado_en: string | null;

  notificacion_enviada: boolean;
  notificacion_enviada_en: string | null;

  created_at: string;
  updated_at: string;
}

/** Fila lista para insert — sin campos que resuelve la base (id/timestamps). */
export interface RecordatorioInputRow {
  residente_id: string;
  organizacion_id: string;
  creado_por: string;
  titulo: string;
  fecha: string;
  hora: string;
  estado?: EstadoRecordatorio;
  notificacion_enviada?: boolean;
}

/** Input de creación/edición recibido del cliente (ya validado por Zod). */
export interface RecordatorioInput {
  titulo: string;
  fecha: string;
  hora: string;
}

export interface ListarRecordatoriosOpciones {
  desde?: string;
  hasta?: string;
  estado?: EstadoRecordatorio;
}
