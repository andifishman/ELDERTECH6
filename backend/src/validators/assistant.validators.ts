import { z } from 'zod';

export const guardarMensajeSchema = z.object({
  sesionId: z.string().uuid(),
  rol: z.enum(['usuario', 'asistente']),
  contenido: z.string().trim().min(1).max(4000),
});

export const chatCompletionSchema = z.object({
  mensaje: z.string().trim().min(1).max(2000),
  historial: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(20),
});

export const generarTituloSchema = z.object({
  primerMensaje: z.string().trim().min(1).max(2000),
});

export const actualizarTituloSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
});

export const toggleFavoritoSchema = z.object({
  esFavorito: z.boolean(),
});

export const getMensajesQuerySchema = z.object({
  sesionId: z.string().uuid(),
});
