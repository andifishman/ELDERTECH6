import { z } from 'zod';

export const getActivitiesQuerySchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado YYYY-MM-DD')
    .optional(),
});
