import { z } from 'zod';

export const listTutorialsQuerySchema = z.object({
  categoriaId: z.string().uuid().optional(),
});

export const relacionadosQuerySchema = z.object({
  categoriaId: z.string().uuid().nullable().optional(),
});

export const progresoSchema = z.object({
  favorito: z.boolean().optional(),
  completado: z.boolean().optional(),
  segundos_vistos: z.number().int().nonnegative().optional(),
  ultima_vista: z.string().optional(),
});

export const historialQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});
