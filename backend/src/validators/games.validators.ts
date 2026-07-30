import { z } from 'zod';
import { JUEGOS } from '../repositories/gamesRepository';

export const registrarPartidaSchema = z.object({
  juego: z.enum(JUEGOS),
  resultado: z.enum(['ganado', 'perdido']).nullable().optional(),
});
