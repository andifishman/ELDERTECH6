import { z } from 'zod';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

const estadoSchema = z.enum(['pendiente', 'realizado', 'vencido', 'cancelado']);

export const crearRecordatorioSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  fecha: z.string().regex(FECHA_REGEX, 'Formato esperado YYYY-MM-DD'),
  hora: z.string().regex(HORA_REGEX, 'Formato esperado HH:MM'),
});

export const editarRecordatorioSchema = crearRecordatorioSchema.partial();

export const cambiarEstadoSchema = z.object({
  estado: z.enum(['pendiente', 'realizado', 'cancelado']),
});

export const listarRecordatoriosQuerySchema = z.object({
  desde: z.string().regex(FECHA_REGEX).optional(),
  hasta: z.string().regex(FECHA_REGEX).optional(),
  estado: estadoSchema.optional(),
});

export const rangoFechaQuerySchema = z.object({
  fecha: z.string().regex(FECHA_REGEX).optional(),
});

export const proximosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
