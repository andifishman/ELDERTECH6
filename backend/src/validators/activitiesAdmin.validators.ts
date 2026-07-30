import { z } from 'zod';

export const patronRecurrenciaSchema = z.object({
  dias_semana: z.array(z.number().int().min(0).max(6)).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const residenteOverrideSchema = z.object({
  residente_id: z.string().uuid(),
  incluido: z.boolean(),
});

export const actividadAdminInputSchema = z.object({
  nombre: z.string().trim().min(1),
  descripcion: z.string().trim().nullable().optional(),
  tipo_actividad_id: z.string().uuid().nullable().optional(),
  ubicacion_id: z.string().uuid().nullable().optional(),
  responsable_id: z.string().uuid().nullable().optional(),
  emoji_icono: z.string().nullable().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Formato esperado HH:MM'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  es_recurrente: z.boolean(),
  patron_recurrencia: patronRecurrenciaSchema.nullable().optional(),
  secciones_objetivo: z.array(z.string()).nullable().optional(),
  residentesOverride: z.array(residenteOverrideSchema).optional(),
  notificar_al_crear: z.boolean().optional(),
  recordatorio_minutos_antes: z.number().int().positive().nullable().optional(),
});

export const listarActividadesQuerySchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD')
    .optional(),
});

export const setActivoSchema = z.object({
  activo: z.boolean(),
  nombre: z.string().trim().optional(),
});

export const eliminarQuerySchema = z.object({
  nombre: z.string().trim().optional(),
});
