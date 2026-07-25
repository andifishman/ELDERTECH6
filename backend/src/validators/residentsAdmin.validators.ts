import { z } from 'zod';

export const residenteAdminInputSchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  seccion: z.string().trim().nullable().optional(),
  notas: z.string().trim().nullable().optional(),
});

export const crearUsuarioSchema = residenteAdminInputSchema.extend({
  username: z.string().trim().min(3),
  dni: z.string().trim().min(4),
});

export const resetearPasswordSchema = z.object({
  dni: z.string().trim().min(4),
});

export const setActivoSchema = z.object({
  activo: z.boolean(),
  nombre: z.string().trim().optional(),
});
