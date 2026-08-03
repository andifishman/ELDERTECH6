import { z } from 'zod';

export const TIPOS_PEDIDO = ['pedido', 'comentario', 'sugerencia', 'actividad_propuesta', 'recomendacion_pelicula'] as const;

export const crearPedidoSchema = z.object({
  tipo: z.enum(TIPOS_PEDIDO),
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().nullable().optional(),
  duracionSegundos: z.coerce.number().int().nonnegative().optional(),
});

export const editarPedidoPropioSchema = z.object({
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().nullable().optional(),
});
