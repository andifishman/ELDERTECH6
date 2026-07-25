import { z } from 'zod';

export const faqInputSchema = z.object({
  pregunta: z.string().trim().min(1),
  categoria: z.string().trim().nullable().optional(),
  emoji: z.string().trim().nullable().optional(),
  activo: z.boolean(),
});

export const eliminarFaqQuerySchema = z.object({
  pregunta: z.string().trim().optional(),
});

export const reordenarFaqSchema = z.object({
  faqs: z.array(z.object({ id: z.string().uuid(), orden: z.number().int() })),
});

export const historialQuerySchema = z.object({
  limite: z.coerce.number().int().positive().max(200).optional(),
});
