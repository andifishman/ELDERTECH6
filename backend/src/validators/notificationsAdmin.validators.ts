import { z } from 'zod';

const destinoFiltroSchema = z.object({
  seccion: z.string().optional(),
  habitacion: z.string().optional(),
  nivel_dificultad: z.string().optional(),
  interes_ids: z.array(z.string().uuid()).optional(),
  residente_ids: z.array(z.string().uuid()).optional(),
});

export const notificationInputSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  mensaje: z.string().trim().min(1).max(500),
  imagen_url: z.string().url().nullable().optional(),
  icono: z.string().nullable().optional(),
  tipo: z.enum(['informacion', 'importante', 'recordatorio', 'urgente', 'actividad', 'tutorial', 'general']),
  destino_tipo: z.enum(['todos', 'residentes', 'especificos', 'seccion', 'habitacion', 'intereses', 'nivel_dificultad']),
  destino_filtro: destinoFiltroSchema.nullable().optional(),
  excluir_residente_ids: z.array(z.string().uuid()).nullable().optional(),
  programacion_tipo: z.enum(['instantanea', 'programada']),
  programada_para: z.string().nullable().optional(),
  recurrencia: z.enum(['ninguna', 'diaria', 'semanal', 'mensual']).optional(),
  silenciosa: z.boolean().optional(),
  sonido: z.boolean().optional(),
  vibracion: z.boolean().optional(),
  prioridad: z.enum(['alta', 'normal', 'baja']).optional(),
  pantalla_destino: z.string().nullable().optional(),
});

export const crearNotificationSchema = z.object({
  notificacion: notificationInputSchema,
  accion: z.enum(['borrador', 'enviar', 'programar']),
});

export const programarSchema = z.object({
  programada_para: z.string(),
  recurrencia: z.enum(['ninguna', 'diaria', 'semanal', 'mensual']).optional(),
});

export const listarQuerySchema = z.object({
  estado: z.enum(['borrador', 'programada', 'enviando', 'enviada', 'fallida', 'cancelada']).optional(),
  busqueda: z.string().optional(),
  orden: z.enum(['recientes', 'antiguas']).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export const previewAudienciaSchema = z.object({
  destino_tipo: z.enum(['todos', 'residentes', 'especificos', 'seccion', 'habitacion', 'intereses', 'nivel_dificultad']),
  destino_filtro: destinoFiltroSchema.nullable().optional(),
  excluir_residente_ids: z.array(z.string().uuid()).nullable().optional(),
});
