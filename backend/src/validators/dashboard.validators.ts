import { z } from 'zod';

export const limiteQuerySchema = z.object({
  limite: z.coerce.number().int().positive().max(100).optional(),
});
