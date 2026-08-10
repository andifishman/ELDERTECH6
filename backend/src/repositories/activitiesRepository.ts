import { getSupabaseAdmin } from './supabaseAdmin';
import { toSupabaseDate } from '../utils/date';
import type { ActividadCompleta, ActividadInputRow, ResidenteOverrideInput } from '../providers/activities/ActivityTypes';
import { logger } from '../logging/logger';

const ACTIVIDAD_SELECT = `
  *,
  tipo_actividad:tipos_actividad(*),
  ubicacion:ubicaciones(*),
  responsable:responsables(*),
  actividad_residentes_override(residente_id, incluido)
`;

/** Porteo de `fetchActividadesPorFecha` (src/services/actividadesService.ts). */
export async function fetchActividadesPorFecha(organizacionId: string, fecha: Date): Promise<ActividadCompleta[]> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'fetchActividadesPorFecha', organizacionId, fecha });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select(ACTIVIDAD_SELECT)
    .eq('organizacion_id', organizacionId)
    .eq('fecha', toSupabaseDate(fecha))
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });

  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as unknown as ActividadCompleta[];

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'fetchActividadesPorFecha', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Porteo de `getActividadById` (src/services/actividadesService.ts). */
export async function getActividadById(id: string): Promise<ActividadCompleta | null> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'getActividadById', id });
  try {
  const { data, error } = await getSupabaseAdmin().from('actividades').select(ACTIVIDAD_SELECT).eq('id', id).maybeSingle();

  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return (data as unknown as ActividadCompleta) ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'getActividadById', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
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
/** Minutos desde medianoche de un string 'HH:MM' o 'HH:MM:SS' — null si no matchea ese formato. */
function minutosDesdeMedianoche(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(hora.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;
  return horas * 60 + minutos;
}

/**
 * Filtra por hora aproximada: primero busca actividades cuyo rango
 * [hora_inicio, hora_fin] contenga esa hora (o, sin hora_fin, que empiecen
 * dentro de una ventana de 30 min); si ninguna matchea así, en vez de
 * devolver vacío se queda con la más cercana en el tiempo — para que el
 * asistente pueda decir "la más cercana a esa hora es X" en vez de
 * "no se encontró nada" ante una hora que no coincide justo con ninguna.
 */
function filtrarPorHora(filas: ActividadRow[], horaConsulta: string): ActividadRow[] {
  const minConsulta = minutosDesdeMedianoche(horaConsulta);
  if (minConsulta === null) return filas;

  const conMinutos = filas
    .map((a) => ({ fila: a, inicio: minutosDesdeMedianoche(a.hora_inicio), fin: minutosDesdeMedianoche(a.hora_fin) }))
    .filter((x): x is { fila: ActividadRow; inicio: number; fin: number | null } => x.inicio !== null);

  const dentroDeRango = conMinutos.filter(({ inicio, fin }) =>
    fin !== null ? minConsulta >= inicio && minConsulta <= fin : Math.abs(minConsulta - inicio) <= 30,
  );
  if (dentroDeRango.length > 0) return dentroDeRango.map((x) => x.fila);
  if (conMinutos.length === 0) return [];

  const masCercana = conMinutos.reduce((mejor, actual) =>
    Math.abs(actual.inicio - minConsulta) < Math.abs(mejor.inicio - minConsulta) ? actual : mejor,
  );
  return [masCercana.fila];
}

export async function searchActivitiesByText(
  organizacionId: string,
  busqueda: string,
  fecha: Date,
  hora?: string,
): Promise<ActividadParaIA[]> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'searchActivitiesByText', organizacionId, busqueda, fecha, hora });
  try {
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
  const porTexto = query ? filas.filter((a) => a.nombre.toLowerCase().includes(query)) : filas;
  const filtradas = hora ? filtrarPorHora(porTexto, hora) : porTexto;

  return filtradas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    hora_inicio: a.hora_inicio,
    hora_fin: a.hora_fin ?? '',
    lugar: a.ubicacion?.nombre ?? '',
    descripcion: a.descripcion ?? '',
  }));

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'searchActivitiesByText', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// ─── Admin (backoffice) ──────────────────────────────────────────────────────
// Porteo de `backoffice/src/services/actividadesService.ts`.

export async function listarActividadesAdmin(organizacionId: string, fecha?: string): Promise<ActividadCompleta[]> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'listarActividadesAdmin', organizacionId, fecha });
  try {
  let query = getSupabaseAdmin().from('actividades').select(ACTIVIDAD_SELECT).eq('organizacion_id', organizacionId).order('hora_inicio', { ascending: true });
  if (fecha) query = query.eq('fecha', fecha);

  const { data, error } = await query;
  if (error) throw new Error(`Error al cargar actividades: ${error.message}`);
  return (data ?? []) as unknown as ActividadCompleta[];

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'listarActividadesAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerActividadAdmin(id: string): Promise<ActividadCompleta | null> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'obtenerActividadAdmin', id });
  try {
  const { data, error } = await getSupabaseAdmin().from('actividades').select(ACTIVIDAD_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return (data as unknown as ActividadCompleta) ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'obtenerActividadAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function getPlantillaIdYFecha(id: string): Promise<{ plantillaId: string | null; fecha: string | null }> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'getPlantillaIdYFecha', id });
  try {
  const { data, error } = await getSupabaseAdmin().from('actividades').select('plantilla_id, fecha').eq('id', id).single();
  if (error) throw new Error(`Error al cargar actividad: ${error.message}`);
  return { plantillaId: data?.plantilla_id ?? null, fecha: data?.fecha ?? null };

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'getPlantillaIdYFecha', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function insertActividad(row: ActividadInputRow): Promise<string> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'insertActividad', row });
  try {
  const { data, error } = await getSupabaseAdmin().from('actividades').insert(row).select('id').single();
  if (error) throw new Error(`Error al crear actividad: ${error.message}`);
  return data.id as string;

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'insertActividad', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function updateActividad(id: string, row: Partial<ActividadInputRow> & { updated_at?: string }): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'updateActividad', id, row });
  try {
  const { error } = await getSupabaseAdmin().from('actividades').update(row).eq('id', id);
  if (error) throw new Error(`Error al actualizar actividad: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'updateActividad', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function marcarComoPlantilla(id: string): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'marcarComoPlantilla', id });
  try {
  const { error } = await getSupabaseAdmin().from('actividades').update({ plantilla_id: id }).eq('id', id);
  if (error) throw new Error(`Error al marcar la plantilla: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'marcarComoPlantilla', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Inserta las filas de ocurrencias en lotes de 100 (paridad con el original) y devuelve los ids creados. */
export async function insertOcurrenciasBatch(rows: ActividadInputRow[]): Promise<string[]> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'insertOcurrenciasBatch', rows });
  try {
  const idsCreados: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await getSupabaseAdmin().from('actividades').insert(rows.slice(i, i + 100)).select('id');
    if (error) throw new Error(`Error al generar ocurrencias: ${error.message}`);
    if (data) idsCreados.push(...data.map((r) => r.id as string));
  }
  return idsCreados;

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'insertOcurrenciasBatch', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Borra todas las ocurrencias de un grupo (nunca la plantilla en sí). */
export async function eliminarOcurrencias(plantillaId: string): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'eliminarOcurrencias', plantillaId });
  try {
  const { error } = await getSupabaseAdmin().from('actividades').delete().eq('plantilla_id', plantillaId).neq('id', plantillaId);
  if (error) throw new Error(`Error al borrar ocurrencias: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'eliminarOcurrencias', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Borra la plantilla + todas sus ocurrencias en un solo query. */
export async function eliminarGrupo(plantillaId: string): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'eliminarGrupo', plantillaId });
  try {
  const { error } = await getSupabaseAdmin()
    .from('actividades')
    .delete()
    .or(`id.eq.${plantillaId},plantilla_id.eq.${plantillaId}`);
  if (error) throw new Error(`Error al eliminar la actividad: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'eliminarGrupo', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function setActivoGrupo(plantillaId: string, activo: boolean): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'setActivoGrupo', plantillaId, activo });
  try {
  const { error } = await getSupabaseAdmin()
    .from('actividades')
    .update({ activo, updated_at: new Date().toISOString() })
    .or(`id.eq.${plantillaId},plantilla_id.eq.${plantillaId}`);
  if (error) throw new Error(`Error al actualizar la actividad: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'setActivoGrupo', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function setActivoUno(id: string, activo: boolean): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'setActivoUno', id, activo });
  try {
  const { error } = await getSupabaseAdmin().from('actividades').update({ activo, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error al actualizar la actividad: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'setActivoUno', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function eliminarUno(id: string): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'eliminarUno', id });
  try {
  const { error } = await getSupabaseAdmin().from('actividades').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la actividad: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'eliminarUno', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function sincronizarResidentesOverride(actividadId: string, overrides?: ResidenteOverrideInput[]): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'sincronizarResidentesOverride', actividadId, overrides });
  try {
  await getSupabaseAdmin().from('actividad_residentes_override').delete().eq('actividad_id', actividadId);
  if (overrides && overrides.length > 0) {
    const { error } = await getSupabaseAdmin()
      .from('actividad_residentes_override')
      .insert(overrides.map((o) => ({ actividad_id: actividadId, residente_id: o.residente_id, incluido: o.incluido })));
    if (error) throw new Error(`Error al guardar las excepciones: ${error.message}`);
  }

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'sincronizarResidentesOverride', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Propaga las excepciones de la plantilla a cada ocurrencia recién generada, en lotes de 500. */
export async function propagarOverrideAOcurrencias(occurrenceIds: string[], overrides?: ResidenteOverrideInput[]): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'propagarOverrideAOcurrencias', occurrenceIds, overrides });
  try {
  if (!overrides || overrides.length === 0 || occurrenceIds.length === 0) return;
  const rows = occurrenceIds.flatMap((actividad_id) => overrides.map((o) => ({ actividad_id, residente_id: o.residente_id, incluido: o.incluido })));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await getSupabaseAdmin().from('actividad_residentes_override').insert(rows.slice(i, i + 500));
    if (error) throw new Error(`Error al propagar las excepciones: ${error.message}`);
  }

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'propagarOverrideAOcurrencias', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// ─── Recordatorios automáticos (módulo Notificaciones) ──────────────────────────

export interface ActividadPendienteRecordatorio {
  id: string;
  organizacion_id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  ubicacion: { nombre: string } | null;
  recordatorio_minutos_antes: number;
  secciones_objetivo: string[] | null;
}

/**
 * Candidatas a recordatorio: hoy o mañana, con `recordatorio_minutos_antes`
 * configurado y todavía no enviado. El filtro exacto de la ventana (ahora
 * está a <= X minutos del inicio) se hace en el Service, en JS, porque
 * combinar `fecha` (date) + `hora_inicio` (time) en una sola comparación de
 * timestamp no es directo en PostgREST.
 */
export async function listarCandidatasRecordatorio(): Promise<ActividadPendienteRecordatorio[]> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'listarCandidatasRecordatorio' });
  try {
  const hoy = toSupabaseDate(new Date());
  const mañana = toSupabaseDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const { data, error } = await getSupabaseAdmin()
    .from('actividades')
    .select('id, organizacion_id, nombre, fecha, hora_inicio, ubicacion:ubicaciones(nombre), recordatorio_minutos_antes, secciones_objetivo')
    .not('recordatorio_minutos_antes', 'is', null)
    .eq('recordatorio_enviado', false)
    .eq('activo', true)
    .in('fecha', [hoy, mañana]);

  if (error) throw new Error(`Error al buscar recordatorios de actividades: ${error.message}`);
  return ((data ?? []) as unknown as Array<ActividadPendienteRecordatorio & { ubicacion: { nombre: string } | { nombre: string }[] | null }>).map((a) => ({
    ...a,
    ubicacion: Array.isArray(a.ubicacion) ? (a.ubicacion[0] ?? null) : a.ubicacion,
  }));

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'listarCandidatasRecordatorio', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function marcarRecordatorioEnviado(actividadId: string, notificationId: string): Promise<void> {
  logger.info('repo:call', { repository: 'activitiesRepository', action: 'marcarRecordatorioEnviado', actividadId, notificationId });
  try {
  const { error } = await getSupabaseAdmin().from('actividades').update({ recordatorio_enviado: true, notificacion_id: notificationId }).eq('id', actividadId);
  if (error) throw new Error(`Error al marcar el recordatorio como enviado: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'activitiesRepository', action: 'marcarRecordatorioEnviado', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
