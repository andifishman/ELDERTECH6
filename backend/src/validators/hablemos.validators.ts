import { z } from 'zod';

export const crearConversacionSchema = z.object({
  residenteId: z.string().uuid(),
});

export const enviarMensajeTextoSchema = z.object({
  contenido: z.string().trim().min(1).max(2000),
});

export const listarMensajesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// Vacío = "mostrar todos" (ver buscarPorNombreConCuenta) — no exigir min(1).
export const buscarResidentesQuerySchema = z.object({
  q: z.string().trim().default(''),
});

export const enviarMensajeAudioBodySchema = z.object({
  duracionSegundos: z.coerce.number().int().nonnegative().optional(),
});
