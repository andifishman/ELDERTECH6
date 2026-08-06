import { getSupabaseAdmin } from './supabaseAdmin';
import { withRepoLogging } from '../logging/repoLogger';
import { coincideBusqueda } from '../utils/textSearch';
import type {
  EstadoRecordatorio,
  ListarRecordatoriosOpciones,
  Recordatorio,
  RecordatorioInputRow,
} from '../providers/agenda/AgendaTypes';

const REPO = 'agendaRepository';
const TABLA = 'agenda_recordatorios';

export const crear = withRepoLogging(REPO, 'crear', async (
  row: RecordatorioInputRow,
): Promise<Recordatorio> => {
  const { data, error } = await getSupabaseAdmin().from(TABLA).insert(row).select('*').single();
  if (error) throw new Error(`Error al crear el recordatorio: ${error.message}`);
  return data as Recordatorio;
});

/** Inserta ocurrencias futuras de una serie recurrente en lotes de 100 (mismo criterio que `activitiesRepository`). */
export const insertOcurrenciasBatch = withRepoLogging(REPO, 'insertOcurrenciasBatch', async (
  rows: RecordatorioInputRow[],
): Promise<string[]> => {
  if (rows.length === 0) return [];
  const ids: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await getSupabaseAdmin().from(TABLA).insert(rows.slice(i, i + 100)).select('id');
    if (error) throw new Error(`Error al generar las ocurrencias del recordatorio: ${error.message}`);
    ids.push(...(data ?? []).map((r) => r.id as string));
  }
  return ids;
});

export const obtenerPorId = withRepoLogging(REPO, 'obtenerPorId', async (
  id: string,
  residenteId: string,
): Promise<Recordatorio | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('id', id)
    .eq('residente_id', residenteId)
    .maybeSingle();
  if (error) throw new Error(`Error al buscar el recordatorio: ${error.message}`);
  return (data as Recordatorio) ?? null;
});

/** Listado con filtros — usado por el historial y la búsqueda. `q` se filtra en JS (sin tildes, ver textSearch). */
export const listar = withRepoLogging(REPO, 'listar', async (
  residenteId: string,
  opciones: ListarRecordatoriosOpciones,
): Promise<Recordatorio[]> => {
  let query = getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('residente_id', residenteId)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: false });

  if (opciones.desde) query = query.gte('fecha', opciones.desde);
  if (opciones.hasta) query = query.lte('fecha', opciones.hasta);
  if (opciones.estado) query = query.eq('estado', opciones.estado);

  const { data, error } = await query;
  if (error) throw new Error(`Error al listar los recordatorios: ${error.message}`);

  const recordatorios = (data ?? []) as Recordatorio[];
  if (!opciones.q?.trim()) return recordatorios;

  return recordatorios.filter(
    (r) =>
      coincideBusqueda(r.titulo, opciones.q!) ||
      (r.descripcion && coincideBusqueda(r.descripcion, opciones.q!)) ||
      (r.audio_transcripcion && coincideBusqueda(r.audio_transcripcion, opciones.q!)) ||
      coincideBusqueda(r.fecha, opciones.q!),
  );
});

export const listarPorRangoFecha = withRepoLogging(REPO, 'listarPorRangoFecha', async (
  residenteId: string,
  desde: string,
  hasta: string,
): Promise<Recordatorio[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('residente_id', residenteId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .neq('estado', 'cancelado')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Error al listar los recordatorios del período: ${error.message}`);
  return (data ?? []) as Recordatorio[];
});

export const listarProximos = withRepoLogging(REPO, 'listarProximos', async (
  residenteId: string,
  desde: string,
  limit: number,
): Promise<Recordatorio[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('residente_id', residenteId)
    .eq('estado', 'pendiente')
    .gte('fecha', desde)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`Error al listar los próximos recordatorios: ${error.message}`);
  return (data ?? []) as Recordatorio[];
});

export const actualizar = withRepoLogging(REPO, 'actualizar', async (
  id: string,
  residenteId: string,
  patch: Partial<RecordatorioInputRow>,
): Promise<Recordatorio | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .update(patch)
    .eq('id', id)
    .eq('residente_id', residenteId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Error al editar el recordatorio: ${error.message}`);
  return (data as Recordatorio) ?? null;
});

export const actualizarEstado = withRepoLogging(REPO, 'actualizarEstado', async (
  id: string,
  residenteId: string,
  estado: EstadoRecordatorio,
): Promise<Recordatorio | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .update({ estado, completado_en: estado === 'realizado' ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('residente_id', residenteId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Error al cambiar el estado del recordatorio: ${error.message}`);
  return (data as Recordatorio) ?? null;
});

export const eliminar = withRepoLogging(REPO, 'eliminar', async (
  id: string,
  residenteId: string,
): Promise<void> => {
  const { error } = await getSupabaseAdmin().from(TABLA).delete().eq('id', id).eq('residente_id', residenteId);
  if (error) throw new Error(`Error al eliminar el recordatorio: ${error.message}`);
});

/** Sube al bucket `agenda-audio`. */
export const subirAudio = withRepoLogging(REPO, 'subirAudio', async (
  residenteId: string,
  buffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<string> => {
  const ext = originalName.split('.').pop() ?? 'm4a';
  const path = `${residenteId}/${Date.now()}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('agenda-audio').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Error al subir el audio del recordatorio: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('agenda-audio').getPublicUrl(path);
  return data.publicUrl;
});

// ─── Usadas por el cron (`AgendaReminderProcessorService`) — sin scope de residente. ──

/** Pendientes con notificación configurada y todavía no enviada, cuya ventana de aviso ya llegó. */
export const listarCandidatosNotificacion = withRepoLogging(REPO, 'listarCandidatosNotificacion', async (): Promise<Recordatorio[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('estado', 'pendiente')
    .eq('notificacion_enviada', false)
    .not('recordatorio_offset_minutos', 'is', null);
  if (error) throw new Error(`Error al listar los recordatorios a notificar: ${error.message}`);
  return (data ?? []) as Recordatorio[];
});

/** Pendientes cuya fecha+hora ya pasó — el cron los pasa a 'vencido'. */
export const listarPendientesParaVencer = withRepoLogging(REPO, 'listarPendientesParaVencer', async (): Promise<Recordatorio[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('estado', 'pendiente')
    .not('hora', 'is', null)
    .lt('fecha', new Date().toISOString().slice(0, 10));
  if (error) throw new Error(`Error al listar los recordatorios vencidos: ${error.message}`);

  // Además de fechas ya pasadas, sumamos los de hoy cuya hora ya pasó (consulta aparte —
  // comparar fecha+hora en un solo filtro de PostgREST no es directo con columnas separadas).
  const hoy = new Date().toISOString().slice(0, 10);
  const horaActual = new Date().toTimeString().slice(0, 8);
  const { data: deHoy, error: errorHoy } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('estado', 'pendiente')
    .eq('fecha', hoy)
    .not('hora', 'is', null)
    .lt('hora', horaActual);
  if (errorHoy) throw new Error(`Error al listar los recordatorios vencidos de hoy: ${errorHoy.message}`);

  return [...(data ?? []), ...(deHoy ?? [])] as Recordatorio[];
});

export const marcarNotificacionEnviada = withRepoLogging(REPO, 'marcarNotificacionEnviada', async (id: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from(TABLA).update({ notificacion_enviada: true }).eq('id', id);
  if (error) throw new Error(`Error al marcar la notificación como enviada: ${error.message}`);
});

export const marcarVencidos = withRepoLogging(REPO, 'marcarVencidos', async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const { error } = await getSupabaseAdmin().from(TABLA).update({ estado: 'vencido' }).in('id', ids);
  if (error) throw new Error(`Error al marcar recordatorios como vencidos: ${error.message}`);
});
