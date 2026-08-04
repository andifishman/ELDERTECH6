import { getSupabaseAdmin } from './supabaseAdmin';
import type { CrearPedidoInput, EstadoPedido, PedidoSugerenciaConResidente, TranscripcionEstado } from '../providers/requests/RequestTypes';
import { logger } from '../logging/logger';

const SELECT_CON_RESIDENTE = '*, residente:residentes(id, nombre, apellido, habitacion, seccion)';

function mapRow(row: unknown): PedidoSugerenciaConResidente {
  const r = row as PedidoSugerenciaConResidente & { residente: PedidoSugerenciaConResidente['residente'] | PedidoSugerenciaConResidente['residente'][] };
  return { ...r, residente: Array.isArray(r.residente) ? (r.residente[0] ?? null) : r.residente };
}

export async function crearPedido(input: CrearPedidoInput): Promise<PedidoSugerenciaConResidente> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'crearPedido', input });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .insert({
      organizacion_id: input.organizacionId,
      residente_id: input.residenteId,
      tipo: input.tipo,
      titulo: input.titulo,
      descripcion: input.descripcion,
      audio_url: input.audioUrl,
      audio_duracion_segundos: input.audioDuracionSegundos,
      transcripcion: input.transcripcion,
      transcripcion_estado: input.transcripcionEstado,
    })
    .select(SELECT_CON_RESIDENTE)
    .single();
  if (error) throw new Error(`Error al guardar la solicitud: ${error.message}`);
  return mapRow(data);

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'crearPedido', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface EditarPropioInput {
  titulo: string;
  descripcion?: string | null;
}

/** Solo permite editar mientras el residente sigue siendo el dueño y la solicitud sigue "pendiente" (nadie la tomó todavía). */
export async function actualizarPropio(id: string, residenteId: string, input: EditarPropioInput): Promise<PedidoSugerenciaConResidente | null> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'actualizarPropio', id, residenteId, input });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .update({ titulo: input.titulo, descripcion: input.descripcion ?? null })
    .eq('id', id)
    .eq('residente_id', residenteId)
    .eq('estado', 'pendiente')
    .select(SELECT_CON_RESIDENTE)
    .maybeSingle();
  if (error) throw new Error(`Error al editar la solicitud: ${error.message}`);
  return data ? mapRow(data) : null;

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'actualizarPropio', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function listarPropios(residenteId: string): Promise<PedidoSugerenciaConResidente[]> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'listarPropios', residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .select(SELECT_CON_RESIDENTE)
    .eq('residente_id', residenteId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar tus solicitudes: ${error.message}`);
  return ((data ?? []) as unknown[]).map(mapRow);

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'listarPropios', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface ListarAdminFiltros {
  estado?: EstadoPedido;
  tipo?: string;
  seccion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export async function listarAdmin(organizacionId: string, filtros: ListarAdminFiltros): Promise<PedidoSugerenciaConResidente[]> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'listarAdmin', organizacionId, filtros });
  try {
  let query = getSupabaseAdmin().from('pedidos_sugerencias').select(SELECT_CON_RESIDENTE).eq('organizacion_id', organizacionId);

  if (filtros.estado) query = query.eq('estado', filtros.estado);
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
  if (filtros.fechaDesde) query = query.gte('created_at', filtros.fechaDesde);
  if (filtros.fechaHasta) query = query.lte('created_at', filtros.fechaHasta);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar las solicitudes: ${error.message}`);

  let filas = ((data ?? []) as unknown[]).map(mapRow);
  // La sección vive en el residente relacionado — se filtra en memoria porque
  // el filtro cruza una tabla vinculada (mismo enfoque que el resto del backoffice).
  if (filtros.seccion) filas = filas.filter((f) => f.residente?.seccion === filtros.seccion);
  return filas;

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'listarAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerPorId(id: string): Promise<PedidoSugerenciaConResidente | null> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'obtenerPorId', id });
  try {
  const { data, error } = await getSupabaseAdmin().from('pedidos_sugerencias').select(SELECT_CON_RESIDENTE).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar la solicitud: ${error.message}`);
  return data ? mapRow(data) : null;

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'obtenerPorId', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function getResidenteId(id: string): Promise<string | null> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'getResidenteId', id });
  try {
  const { data } = await getSupabaseAdmin().from('pedidos_sugerencias').select('residente_id').eq('id', id).maybeSingle();
  return data?.residente_id ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'getResidenteId', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function actualizarEstado(id: string, estado: EstadoPedido, resueltoPor: string | null): Promise<void> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'actualizarEstado', id, estado, resueltoPor });
  try {
  const { error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .update({
      estado,
      resuelto_por: estado === 'resuelta' ? resueltoPor : null,
      resuelto_en: estado === 'resuelta' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar el estado: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'actualizarEstado', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function actualizarTranscripcion(id: string, transcripcion: string | null, estado: TranscripcionEstado): Promise<void> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'actualizarTranscripcion', id, transcripcion, estado });
  try {
  const { error } = await getSupabaseAdmin().from('pedidos_sugerencias').update({ transcripcion, transcripcion_estado: estado }).eq('id', id);
  if (error) throw new Error(`Error al guardar la transcripción: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'actualizarTranscripcion', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function eliminar(id: string): Promise<void> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'eliminar', id });
  try {
  const { error } = await getSupabaseAdmin().from('pedidos_sugerencias').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la solicitud: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'eliminar', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Sube al bucket `pedidos-audio`. */
export async function subirAudio(residenteId: string, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  logger.info('repo:call', { repository: 'requestsRepository', action: 'subirAudio', residenteId, buffer, contentType, originalName });
  try {
  const ext = originalName.split('.').pop() ?? 'm4a';
  const path = `${residenteId}/${Date.now()}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('pedidos-audio').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Error al subir el audio: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('pedidos-audio').getPublicUrl(path);
  return data.publicUrl;

  } catch (err) {
    logger.error('repo:error', { repository: 'requestsRepository', action: 'subirAudio', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
