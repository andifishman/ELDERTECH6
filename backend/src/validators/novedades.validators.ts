import { z } from 'zod';
import { CATEGORIAS_NOVEDAD } from '../repositories/novedadesRepository';

const fechaIso = z.string().datetime({ offset: true });

export const publicarNovedadSchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(120),
  texto: z.string().trim().min(1, 'El texto es obligatorio').max(4000),
  imagenUrl: z.string().url().nullable().optional(),
  grupoIds: z.array(z.string().uuid()).optional().default([]),
  notificar: z.boolean().optional().default(true),
  categoria: z.enum(CATEGORIAS_NOVEDAD).optional().default('general'),
  fijada: z.boolean().optional().default(false),
  /** null/ausente = ahora; a futuro = novedad programada */
  publicarEn: fechaIso.nullable().optional(),
  /** Cuántos días se muestra desde que se publica */
  duracionDias: z.number().int().min(1).max(365).optional().default(30),
  /** Hasta cuándo se ve (el backoffice manda el fin del día del evento); si falta, se usa duracionDias */
  visibleHasta: fechaIso.optional(),
  /** Día y hora del evento — obligatoria */
  fechaEvento: fechaIso,
  /** Guardarla sin publicar */
  borrador: z.boolean().optional().default(false),
});

export const actualizarNovedadSchema = z.object({
  titulo: z.string().trim().min(1).max(120).optional(),
  texto: z.string().trim().min(1).max(4000).optional(),
  imagenUrl: z.string().url().nullable().optional(),
  categoria: z.enum(CATEGORIAS_NOVEDAD).optional(),
  fijada: z.boolean().optional(),
  fechaEvento: fechaIso.optional(),
  publicarEn: fechaIso.optional(),
  visibleHasta: fechaIso.optional(),
});

/** Publicar un borrador: ahora o a una fecha, con o sin aviso. */
export const publicarBorradorSchema = z.object({
  notificar: z.boolean().optional().default(true),
  publicarEn: fechaIso.nullable().optional(),
  duracionDias: z.number().int().min(1).max(365).optional().default(30),
  visibleHasta: fechaIso.optional(),
});
