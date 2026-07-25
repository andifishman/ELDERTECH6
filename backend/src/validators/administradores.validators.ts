import { z } from 'zod';

export const cambiarRolSchema = z.object({
  rol: z.enum(['residente', 'admin', 'staff']),
});
