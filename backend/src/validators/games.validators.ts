import { z } from 'zod';
import { JUEGOS } from '../repositories/gamesRepository';

export const registrarPartidaSchema = z.object({
  juego: z.enum(JUEGOS),
  resultado: z.enum(['ganado', 'perdido']).nullable().optional(),
  puntos: z.number().int().nonnegative().nullable().optional(),
});

export const estadisticasParamsSchema = z.object({
  juego: z.enum(JUEGOS),
});

export const topPuntajesQuerySchema = z.object({
  limite: z.coerce.number().int().positive().max(20).optional(),
});
