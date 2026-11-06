import { z } from 'zod';
import { CONTRASTE_MINIMO, contrasteConBlanco, esColorHex } from '../utils/color';

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

/** "#RRGGBB" con contraste suficiente contra texto blanco, o null para volver al violeta ElderTech. */
const colorPrincipal = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v ? v.toUpperCase() : null))
  .refine((v) => v === undefined || v === null || esColorHex(v), { message: 'El color tiene que ser un hexadecimal como #5F3E88.' })
  .refine((v) => v === undefined || v === null || !esColorHex(v) || contrasteConBlanco(v) >= CONTRASTE_MINIMO, {
    message: 'Ese color es muy claro: el texto blanco no se leería bien. Elegí uno más oscuro.',
  });

export const actualizarOrganizacionSchema = z
  .object({
    nombre: z.string().trim().min(2, 'El nombre es muy corto').max(120).optional(),
    ciudad: textoOpcional(80),
    provincia: textoOpcional(80),
    direccion: textoOpcional(160),
    telefono: textoOpcional(40),
    email: z.string().trim().toLowerCase().email('Email inválido').max(160).nullable().optional().or(z.literal('').transform(() => null)),
    colorPrincipal,
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'No hay nada para actualizar');
