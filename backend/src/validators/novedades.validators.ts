import { z } from 'zod';

export const publicarNovedadSchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(120),
  texto: z.string().trim().min(1, 'El texto es obligatorio').max(4000),
  imagenUrl: z.string().url().nullable().optional(),
  grupoIds: z.array(z.string().uuid()).optional().default([]),
  notificar: z.boolean().optional().default(true),
});

export const actualizarNovedadSchema = z.object({
  titulo: z.string().trim().min(1).max(120).optional(),
  texto: z.string().trim().min(1).max(4000).optional(),
  imagenUrl: z.string().url().nullable().optional(),
});
