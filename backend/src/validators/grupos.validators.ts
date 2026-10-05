import { z } from 'zod';

export const crearGrupoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  descripcion: z.string().trim().max(300).nullable().optional(),
  residenteIds: z.array(z.string().uuid()).optional().default([]),
});

export const actualizarGrupoSchema = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  descripcion: z.string().trim().max(300).nullable().optional(),
});

export const agregarMiembrosSchema = z.object({
  residenteIds: z.array(z.string().uuid()).min(1, 'Elegí al menos un residente'),
});
