import { z } from 'zod';

export const crearTipoActividadSchema = z.object({
  nombre: z.string().trim().min(1),
  emoji: z.string().trim().optional(),
  horaInicioDefault: z.string().trim().optional(),
  horaFinDefault: z.string().trim().optional(),
});

export const crearUbicacionSchema = z.object({
  nombre: z.string().trim().min(1),
});

export const crearResponsableSchema = z.object({
  nombreCompleto: z.string().trim().min(1),
});
