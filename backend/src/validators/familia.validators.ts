import { z } from 'zod';

const fechaIso = z.string().datetime({ offset: true });
const fechaDia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
const texto = (max: number) => z.string().trim().min(1, 'Este campo es obligatorio').max(max);
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

// ─── Backoffice: familiares y vínculos ───────────────────────────────────────

export const crearFamiliarSchema = z.object({
  nombre: texto(80),
  apellido: texto(80),
  email: z.string().trim().toLowerCase().email('Email inválido').max(160),
  telefono: textoOpcional(40),
  residentes: z
    .array(z.object({ residenteId: z.string().uuid(), parentesco: textoOpcional(60) }))
    .min(1, 'Elegí al menos un residente')
    .max(20),
});

export const actualizarFamiliarSchema = z
  .object({
    nombre: texto(80).optional(),
    apellido: texto(80).optional(),
    telefono: textoOpcional(40).optional(),
    activo: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No hay nada para actualizar');

export const crearVinculoSchema = z.object({
  residenteId: z.string().uuid(),
  parentesco: textoOpcional(60),
});

export const actualizarVinculoSchema = z.object({ parentesco: textoOpcional(60) });

// ─── Backoffice: contenido ───────────────────────────────────────────────────

export const crearAvisoSchema = z.object({
  titulo: texto(120),
  texto: texto(4000),
  importante: z.boolean().optional().default(false),
  /** Ausente = ahora; a futuro = queda programado */
  publicarEn: fechaIso.optional(),
});

export const actualizarAvisoSchema = z
  .object({ titulo: texto(120).optional(), texto: texto(4000).optional(), importante: z.boolean().optional(), publicarEn: fechaIso.optional() })
  .refine((v) => Object.keys(v).length > 0, 'No hay nada para actualizar');

const camposEvento = {
  titulo: texto(120),
  descripcion: textoOpcional(2000),
  lugar: textoOpcional(120),
  iniciaEn: fechaIso,
  terminaEn: fechaIso.nullable().optional().transform((v) => v ?? null),
  abiertoInscripcion: z.boolean().optional().default(false),
  cupo: z.number().int().min(1).max(10000).nullable().optional().transform((v) => v ?? null),
};

export const crearEventoSchema = z.object(camposEvento).refine((v) => !v.terminaEn || new Date(v.terminaEn) >= new Date(v.iniciaEn), {
  message: 'El evento no puede terminar antes de empezar',
  path: ['terminaEn'],
});

export const actualizarEventoSchema = z
  .object({
    titulo: texto(120).optional(),
    descripcion: textoOpcional(2000).optional(),
    lugar: textoOpcional(120).optional(),
    iniciaEn: fechaIso.optional(),
    terminaEn: fechaIso.nullable().optional(),
    abiertoInscripcion: z.boolean().optional(),
    cupo: z.number().int().min(1).max(10000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No hay nada para actualizar');

export const documentoCamposSchema = z.object({ titulo: texto(120), descripcion: textoOpcional(500) });

export const crearAlbumSchema = z.object({
  titulo: texto(120),
  actividad: textoOpcional(120),
  fecha: fechaDia.optional(),
  /** true = publicarlo ahora; false = guardarlo como borrador */
  publicar: z.boolean().optional().default(false),
});

export const actualizarAlbumSchema = z
  .object({ titulo: texto(120).optional(), actividad: textoOpcional(120).optional(), fecha: fechaDia.optional(), publicar: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, 'No hay nada para actualizar');

export const categoriaSchema = z.object({ nombre: texto(60) });
export const actualizarCategoriaSchema = z
  .object({ nombre: texto(60).optional(), activa: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, 'No hay nada para actualizar');

export const estadoCasoSchema = z.object({ estado: z.enum(['pendiente', 'en_proceso', 'resuelta']) });
export const respuestaSchema = z.object({ texto: texto(4000) });
export const responderPropuestaSchema = z.object({
  estado: z.enum(['pendiente', 'en_revision', 'aceptada', 'no_posible']),
  respuesta: textoOpcional(2000),
});

// ─── App de familiares ───────────────────────────────────────────────────────

export const rangoAgendaSchema = z
  .object({ desde: fechaDia, hasta: fechaDia })
  .refine((v) => v.desde <= v.hasta, { message: 'El rango de fechas es inválido', path: ['hasta'] })
  .refine((v) => (new Date(`${v.hasta}T12:00:00Z`).getTime() - new Date(`${v.desde}T12:00:00Z`).getTime()) / 86_400_000 <= 62, {
    message: 'El rango no puede superar los 62 días',
    path: ['hasta'],
  });

export const mesSchema = z.object({ mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido (AAAA-MM)') });

export const inscripcionSchema = z.object({ personas: z.number().int().min(1).max(10).optional().default(1) });

export const reaccionSchema = z.object({ tipo: z.enum(['corazon', 'me_gusta', 'abrazo']).nullable() });
export const comentarioSchema = z.object({ texto: texto(500) });

export const mensajeSchema = z.object({ contenido: z.string().trim().max(2000).optional().default('') });

export const crearCasoSchema = z
  .object({
    tipo: z.enum(['consulta', 'sugerencia', 'reclamo']),
    categoriaId: z.string().uuid().nullable().optional(),
    residenteId: z.string().uuid().nullable().optional(),
    asunto: texto(120),
    descripcion: texto(4000),
  })
  .refine((v) => v.tipo !== 'consulta' || !!v.categoriaId, { message: 'Elegí una categoría para la consulta', path: ['categoriaId'] });

export const crearPropuestaSchema = z.object({
  tipo: z.enum(['proponer', 'ofrecerse']),
  titulo: texto(120),
  descripcion: texto(2000),
});
