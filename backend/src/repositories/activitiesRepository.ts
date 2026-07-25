import { getSupabaseAdmin } from './supabaseAdmin';
import { toSupabaseDate } from '../utils/date';
import type { ActividadCompleta, ActividadInputRow, ResidenteOverrideInput } from '../providers/activities/ActivityTypes';

const ACTIVIDAD_SELECT = `
  *,
  tipo_actividad:tipos_actividad(*),
  ubicacion:ubicaciones(*),
  responsable:responsables(*),
  actividad_residentes_override(residente_id, incluido)
`;

/** Porteo de `fetchActividadesPorFecha` (src/services/actividadesService.ts). */
export async function fetchActividadesPorFecha(organizacionId: string, fecha: Date): Promise<ActividadCompleta[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select(ACTIVIDAD_SELECT)
    .eq('organizacion_id', organizacionId)
    .eq('fecha', toSupabaseDate(fecha))
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as unknown as ActividadCompleta[];
}

/** Porteo de `getActividadById` (src/services/actividadesService.ts). */
export async function getActividadById(id: string): Promise<ActividadCompleta | null> {
  const { data, error } = await getSupabaseAdmin().from('actividades').select(ACTIVIDAD_SELECT).eq('id', id).maybeSingle();

  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return (data as unknown as ActividadCompleta) ?? null;
}

export interface ActividadParaIA {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  descripcion: string;
}

interface ActividadRow {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string | null;
  descripcion: string | null;
  ubicacion?: { nombre?: string } | null;
}

/**
 * Búsqueda de texto libre de actividades del día — usada por la herramienta
 * `buscar_actividades` del asistente. Porteo directo de la lógica que hoy
 * vive en `src/services/actividadesService.ts` (buscarActividadesPorTexto),
 * ahora resuelta server-side contra la service-role key.
 */
export async function searchActivitiesByText(
  organizacionId: string,
  busqueda: string,
  fecha: Date,
): Promise<ActividadParaIA[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select('id, nombre, hora_inicio, hora_fin, descripcion, ubicacion:ubicaciones(nombre)')
    .eq('organizacion_id', organizacionId)
    .eq('fecha', toSupabaseDate(fecha))
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al buscar actividades: ${error.message}`);

  const filas = (data ?? []) as unknown as ActividadRow[];
  const query = busqueda.trim().toLowerCase();
  const filtradas = query ? filas.filter((a) => a.nombre.toLowerCase().includes(query)) : filas;

  return filtradas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    hora_inicio: a.hora_inicio,
    hora_fin: a.hora_fin ?? '',
    lugar: a.ubicacion?.nombre ?? '',
    descripcion: a.descripcion ?? '',
  }));
}

// ─── Admin (backoffice) ──────────────────────────────────────────────────────
// Porteo de `backoffice/src/services/actividadesService.ts`.

export async function listarActividadesAdmin(organizacionId: string, fecha?: string): Promise<ActividadCompleta[]> {
  let query = getSupabaseAdmin().from('actividades').select(ACTIVIDAD_SELECT).eq('organizacion_id', organizacionId).order('hora_inicio', { ascending: true });
  if (fecha) query = query.eq('fecha', fecha);

  const { data, error } = await query;
  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as unknown as ActividadCompleta[];
}

export async function obtenerActividadAdmin(id: string): Promise<ActividadCompleta | null> {
  const { data, error } = await getSupabaseAdmin().from('actividades').select(ACTIVIDAD_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return (data as unknown as ActividadCompleta) ?? null;
}

export async function getPlantillaIdYFecha(id: string): Promise<{ plantillaId: string | null; fecha: string | null }> {
  const { data, error } = await getSupabaseAdmin().from('actividades').select('plantilla_id, fecha').eq('id', id).single();
  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return { plantillaId: data?.plantilla_id ?? null, fecha: data?.fecha ?? null };
}

export async function insertActividad(row: ActividadInputRow): Promise<string> {
  const { data, error } = await getSupabaseAdmin().from('actividades').insert(row).select('id').single();
  if (error) throw new Error(`Error al crear actividad: ${error.message}`);
  return data.id as string;
}

export async function updateActividad(id: string, row: Partial<ActividadInputRow> & { updated_at?: string }): Promise<void> {
  const { error } = await getSupabaseAdmin().from('actividades').update(row).eq('id', id);
  if (error) throw new Error(`Error al actualizar actividad: ${error.message}`);
}

export async function marcarComoPlantilla(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('actividades').update({ plantilla_id: id }).eq('id', id);
  if (error) throw new Error(`Error al marcar la plantilla: ${error.message}`);
}

/** Inserta las filas de ocurrencias en lotes de 100 (paridad con el original) y devuelve los ids creados. */
export async function insertOcurrenciasBatch(rows: ActividadInputRow[]): Promise<string[]> {
  const idsCreados: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await getSupabaseAdmin().from('actividades').insert(rows.slice(i, i + 100)).select('id');
    if (error) throw new Error(`Error al generar ocurrencias: ${error.message}`);
    if (data) idsCreados.push(...data.map((r) => r.id as string));
  }
  return idsCreados;
}

/** Borra todas las ocurrencias de un grupo (nunca la plantilla en sí). */
export async function eliminarOcurrencias(plantillaId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('actividades').delete().eq('plantilla_id', plantillaId).neq('id', plantillaId);
  if (error) throw new Error(`Error al borrar ocurrencias: ${error.message}`);
}

/** Borra la plantilla + todas sus ocurrencias en un solo query. */
export async function eliminarGrupo(plantillaId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('actividades')
    .delete()
    .or(`id.eq.${plantillaId},plantilla_id.eq.${plantillaId}`);
  if (error) throw new Error(`Error al eliminar la actividad: ${error.message}`);
}

export async function setActivoGrupo(plantillaId: string, activo: boolean): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('actividades')
    .update({ activo, updated_at: new Date().toISOString() })
    .or(`id.eq.${plantillaId},plantilla_id.eq.${plantillaId}`);
  if (error) throw new Error(`Error al actualizar la actividad: ${error.message}`);
}

export async function setActivoUno(id: string, activo: boolean): Promise<void> {
  const { error } = await getSupabaseAdmin().from('actividades').update({ activo, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error al actualizar la actividad: ${error.message}`);
}

export async function eliminarUno(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('actividades').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la actividad: ${error.message}`);
}

export async function sincronizarResidentesOverride(actividadId: string, overrides?: ResidenteOverrideInput[]): Promise<void> {
  await getSupabaseAdmin().from('actividad_residentes_override').delete().eq('actividad_id', actividadId);
  if (overrides && overrides.length > 0) {
    const { error } = await getSupabaseAdmin()
      .from('actividad_residentes_override')
      .insert(overrides.map((o) => ({ actividad_id: actividadId, residente_id: o.residente_id, incluido: o.incluido })));
    if (error) throw new Error(`Error al guardar las excepciones: ${error.message}`);
  }
}

/** Propaga las excepciones de la plantilla a cada ocurrencia recién generada, en lotes de 500. */
export async function propagarOverrideAOcurrencias(occurrenceIds: string[], overrides?: ResidenteOverrideInput[]): Promise<void> {
  if (!overrides || overrides.length === 0 || occurrenceIds.length === 0) return;
  const rows = occurrenceIds.flatMap((actividad_id) => overrides.map((o) => ({ actividad_id, residente_id: o.residente_id, incluido: o.incluido })));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await getSupabaseAdmin().from('actividad_residentes_override').insert(rows.slice(i, i + 500));
    if (error) throw new Error(`Error al propagar las excepciones: ${error.message}`);
  }
}
