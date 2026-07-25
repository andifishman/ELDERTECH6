import { z } from 'zod';

export const actualizarPerfilSchema = z.object({
  nombre_completo: z.string().trim().min(1).optional(),
  avatar_url: z.string().url().optional(),
});
