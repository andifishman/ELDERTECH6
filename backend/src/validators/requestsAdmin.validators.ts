import { z } from 'zod';
import { TIPOS_PEDIDO } from './requests.validators';

export const listarQuerySchema = z.object({
  estado: z.enum(['pendiente', 'en_proceso', 'resuelta']).optional(),
  tipo: z.enum(TIPOS_PEDIDO).optional(),
  seccion: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  busqueda: z.string().optional(),
  ordenar: z.enum(['recientes', 'antiguos', 'usuario_asc', 'usuario_desc']).optional(),
});

export const actualizarEstadoSchema = z.object({
  estado: z.enum(['pendiente', 'en_proceso', 'resuelta']),
});
