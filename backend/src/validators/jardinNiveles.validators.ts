import { z } from 'zod';
import { TOTAL_NIVELES_JARDIN } from '../services/games/JardinNivelesService';

export const completarNivelParamsSchema = z.object({
  nivel: z.coerce.number().int().min(1).max(TOTAL_NIVELES_JARDIN),
});

export const completarNivelBodySchema = z.object({
  estrellas: z.number().int().min(1).max(3),
  movimientosUsados: z.number().int().min(0),
});
