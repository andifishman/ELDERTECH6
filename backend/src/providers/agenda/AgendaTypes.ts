export type EstadoRecordatorio = 'pendiente' | 'realizado' | 'vencido' | 'cancelado';

/** Minutos de anticipación de la notificación — siempre 60 (1 hora), fijo y obligatorio. */
export const RECORDATORIO_OFFSET_MINUTOS = 60;

/**
 * "Repetir" (opción "Todo el mes" al agregar desde Horarios) no es una
 * recurrencia real: este modelo no tiene columna de recurrencia ni un cron
 * que la expanda (ver comentario de la migración del módulo — es a propósito
 * mínimo, título + fecha + hora). Se resuelve creando una fila por día desde
 * la fecha elegida hasta el último día de ESE mes — no de forma indefinida —
 * todas compartiendo `grupo_id` para poder borrarlas juntas después.
 */
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

  /** Comparten el mismo grupo_id las filas creadas juntas con la opción "todo el mes" — null en un recordatorio suelto. */
  grupo_id: string | null;

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
  grupo_id?: string | null;
}

/** Input de creación/edición recibido del cliente (ya validado por Zod). */
export interface RecordatorioInput {
  titulo: string;
  fecha: string;
  hora: string;
  /** Si viene en true al crear, se generan filas desde `fecha` hasta fin de ese mes en vez de una sola. */
  repetirDiario?: boolean;
}

export interface ListarRecordatoriosOpciones {
  desde?: string;
  hasta?: string;
  estado?: EstadoRecordatorio;
}
