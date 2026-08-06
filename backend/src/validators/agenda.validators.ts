import { z } from 'zod';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

const prioridadSchema = z.enum(['baja', 'media', 'alta', 'urgente']);
const estadoSchema = z.enum(['pendiente', 'realizado', 'vencido', 'cancelado']);
const recurrenciaTipoSchema = z.enum(['ninguna', 'diaria', 'laborables', 'semanal', 'mensual', 'anual', 'personalizada']);
const offsetNotificacionSchema = z.union([z.literal(0), z.literal(10), z.literal(30), z.literal(60), z.literal(1440)]);

export const crearRecordatorioSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  descripcion: z.string().trim().max(2000).nullable().optional(),
  fecha: z.string().regex(FECHA_REGEX, 'Formato esperado YYYY-MM-DD'),
  hora: z.string().regex(HORA_REGEX, 'Formato esperado HH:MM').nullable().optional(),
  prioridad: prioridadSchema.default('media'),
  color: z.string().trim().max(20).nullable().optional(),
  icono: z.string().trim().max(8).nullable().optional(),
  recordatorio_offset_minutos: offsetNotificacionSchema.nullable().optional(),
  origen: z.enum(['manual', 'rapido']).optional(),
  recurrencia_tipo: recurrenciaTipoSchema.default('ninguna'),
  recurrencia_dias_semana: z.array(z.number().int().min(0).max(6)).max(7).nullable().optional(),
  recurrencia_hasta: z.string().regex(FECHA_REGEX).nullable().optional(),
  audio_url: z.string().trim().url().nullable().optional(),
  audio_transcripcion: z.string().trim().nullable().optional(),
  audio_duracion_segundos: z.coerce.number().int().nonnegative().nullable().optional(),
});

export const editarRecordatorioSchema = crearRecordatorioSchema.partial();

export const cambiarEstadoSchema = z.object({
  estado: z.enum(['pendiente', 'realizado', 'cancelado']),
});

export const listarRecordatoriosQuerySchema = z.object({
  desde: z.string().regex(FECHA_REGEX).optional(),
  hasta: z.string().regex(FECHA_REGEX).optional(),
  estado: estadoSchema.optional(),
  q: z.string().trim().optional(),
});

export const rangoFechaQuerySchema = z.object({
  fecha: z.string().regex(FECHA_REGEX).optional(),
});

export const proximosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const subirAudioBodySchema = z.object({
  duracionSegundos: z.coerce.number().int().nonnegative().optional(),
});

export const importarHorarioSchema = z.object({
  actividadId: z.string().uuid(),
});
