import { getSupabaseAdmin } from './supabaseAdmin';
import { withRepoLogging } from '../logging/repoLogger';
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

export const listar = withRepoLogging(REPO, 'listar', async (
  residenteId: string,
  opciones: ListarRecordatoriosOpciones,
): Promise<Recordatorio[]> => {
  let query = getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('residente_id', residenteId)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (opciones.desde) query = query.gte('fecha', opciones.desde);
  if (opciones.hasta) query = query.lte('fecha', opciones.hasta);
  if (opciones.estado) query = query.eq('estado', opciones.estado);

  const { data, error } = await query;
  if (error) throw new Error(`Error al listar los recordatorios: ${error.message}`);
  return (data ?? []) as Recordatorio[];
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
    .order('hora', { ascending: true });
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
    .order('hora', { ascending: true })
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

// ─── Usadas por el cron (`AgendaReminderProcessorService`) — sin scope de residente. ──

/** Pendientes sin notificar cuya ventana de aviso (evento - 30min) ya llegó. */
export const listarCandidatosNotificacion = withRepoLogging(REPO, 'listarCandidatosNotificacion', async (): Promise<Recordatorio[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('estado', 'pendiente')
    .eq('notificacion_enviada', false);
  if (error) throw new Error(`Error al listar los recordatorios a notificar: ${error.message}`);
  return (data ?? []) as Recordatorio[];
});

/** Pendientes cuya fecha+hora ya pasó — el cron los pasa a 'vencido'. */
export const listarPendientesParaVencer = withRepoLogging(REPO, 'listarPendientesParaVencer', async (): Promise<Recordatorio[]> => {
  const hoy = new Date().toISOString().slice(0, 10);
  const horaActual = new Date().toTimeString().slice(0, 8);

  const { data, error } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('estado', 'pendiente')
    .lt('fecha', hoy);
  if (error) throw new Error(`Error al listar los recordatorios vencidos: ${error.message}`);

  // Además de fechas ya pasadas, sumamos los de hoy cuya hora ya pasó (consulta aparte —
  // comparar fecha+hora en un solo filtro de PostgREST no es directo con columnas separadas).
  const { data: deHoy, error: errorHoy } = await getSupabaseAdmin()
    .from(TABLA)
    .select('*')
    .eq('estado', 'pendiente')
    .eq('fecha', hoy)
    .lt('hora', horaActual);
  if (errorHoy) throw new Error(`Error al listar los recordatorios vencidos de hoy: ${errorHoy.message}`);

  return [...(data ?? []), ...(deHoy ?? [])] as Recordatorio[];
});

export const marcarNotificacionEnviada = withRepoLogging(REPO, 'marcarNotificacionEnviada', async (id: string): Promise<void> => {
  const { error } = await getSupabaseAdmin()
    .from(TABLA)
    .update({ notificacion_enviada: true, notificacion_enviada_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al marcar la notificación como enviada: ${error.message}`);
});

export const marcarVencidos = withRepoLogging(REPO, 'marcarVencidos', async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const { error } = await getSupabaseAdmin().from(TABLA).update({ estado: 'vencido' }).in('id', ids);
  if (error) throw new Error(`Error al marcar recordatorios como vencidos: ${error.message}`);
});
