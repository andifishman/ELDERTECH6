import { z } from 'zod';

export const guardarPermisosSchema = z.object({
  permisos: z
    .array(
      z.object({
        moduloId: z.string().min(1).max(50),
        ver: z.boolean(),
        crear: z.boolean(),
        editar: z.boolean(),
        eliminar: z.boolean(),
      }),
    )
    .max(50),
});
