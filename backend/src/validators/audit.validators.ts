import { z } from 'zod';

export const listarAuditoriaQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
});
