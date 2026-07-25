import { z } from 'zod';

export const pasoInputSchema = z.object({
  orden: z.number().int(),
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim(),
  imagen_url: z.string().url().nullable(),
  tip: z.string().nullable(),
});

export const tutorialAdminInputSchema = z.object({
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().nullable().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  formato: z.enum(['video', 'guia']),
  nivel: z.enum(['principiante', 'intermedio', 'avanzado']),
  url_video: z.string().url().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  duracion_segundos: z.number().int().nonnegative().nullable().optional(),
  lo_que_aprenderas: z.array(z.string()).nullable().optional(),
  activo: z.boolean(),
  pasos: z.array(pasoInputSchema).optional(),
});

export const crearCategoriaSchema = z.object({
  nombre: z.string().trim().min(1),
  emoji: z.string().trim().optional(),
});

export const eliminarQuerySchema = z.object({
  titulo: z.string().trim().optional(),
});

export const subirImagenQuerySchema = z.object({
  carpeta: z.enum(['thumbnails', 'pasos']).default('thumbnails'),
});
