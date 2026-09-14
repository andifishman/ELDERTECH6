export type EstadoRecordatorio = 'pendiente' | 'realizado' | 'vencido' | 'cancelado';

/** Minutos de anticipación de la notificación — siempre 60 (1 hora), fijo y obligatorio. */
export const RECORDATORIO_OFFSET_MINUTOS = 60;

/**
 * "Repetir todos los días" no es una recurrencia real: este modelo no tiene
 * columna de recurrencia ni un cron que la expanda (ver comentario de la
 * migración del módulo — es a propósito mínimo, título + fecha + hora). Se
 * resuelve creando una fila por día para una ventana acotada, no de forma
 * indefinida. 60 días (~2 meses) es un techo razonable para una actividad de
 * la residencia sin tener que rediseñar el modelo.
 */
export const REPETIR_DIARIO_DIAS = 60;

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
  /** Si viene en true al crear, se generan filas para REPETIR_DIARIO_DIAS días seguidos en vez de una sola. */
  repetirDiario?: boolean;
}

export interface ListarRecordatoriosOpciones {
  desde?: string;
  hasta?: string;
  estado?: EstadoRecordatorio;
}
