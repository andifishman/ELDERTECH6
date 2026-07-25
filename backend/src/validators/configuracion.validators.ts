import { z } from 'zod';

export const actualizarConfiguracionSchema = z.object({
  nombre: z.string().trim().min(1),
  direccion: z.string().trim().nullable().optional(),
  telefono: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal('')),
  logo_url: z.string().trim().nullable().optional(),
});
