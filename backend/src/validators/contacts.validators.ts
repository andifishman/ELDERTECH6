import { z } from 'zod';

export const crearContactoSchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().nullable().optional(),
  telefono: z.string().trim().min(1),
  whatsapp_disponible: z.boolean().optional(),
  foto_url: z.string().url().nullable().optional(),
  origen_contacto: z.enum(['dispositivo', 'manual']).optional(),
  contacto_device_id: z.string().nullable().optional(),
  favorito: z.boolean().optional(),
  orden: z.number().int().optional(),
  tipo_contacto_id: z.string().uuid().nullable().optional(),
  notas: z.string().nullable().optional(),
});

export const actualizarContactoSchema = crearContactoSchema.partial();

export const toggleFavoritoSchema = z.object({
  favorito: z.boolean(),
});
