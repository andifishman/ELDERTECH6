import { getSupabaseAdmin } from './supabaseAdmin';
import type { CrearPedidoInput, EstadoPedido, PedidoSugerenciaConResidente, TranscripcionEstado } from '../providers/requests/RequestTypes';
import { firmarUrlPrivada } from './storageUrls';
import { withRepoLogging } from '../logging/repoLogger';

const SELECT_CON_RESIDENTE = '*, residente:residentes(id, nombre, apellido, habitacion, seccion)';

function mapRow(row: unknown): PedidoSugerenciaConResidente {
  const r = row as PedidoSugerenciaConResidente & { residente: PedidoSugerenciaConResidente['residente'] | PedidoSugerenciaConResidente['residente'][] };
  return { ...r, residente: Array.isArray(r.residente) ? (r.residente[0] ?? null) : r.residente };
}

async function firmarAudio(p: PedidoSugerenciaConResidente): Promise<PedidoSugerenciaConResidente> {
  return { ...p, audio_url: await firmarUrlPrivada(p.audio_url) };
}

export const crearPedido = withRepoLogging('requestsRepository', 'crearPedido', async (input: CrearPedidoInput): Promise<PedidoSugerenciaConResidente> => {
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
  return firmarAudio(mapRow(data));
});

export interface EditarPropioInput {
  titulo: string;
  descripcion?: string | null;
}

/** Solo permite editar mientras el residente sigue siendo el dueño y la solicitud sigue "pendiente" (nadie la tomó todavía). */
export const actualizarPropio = withRepoLogging('requestsRepository', 'actualizarPropio', async (id: string, residenteId: string, input: EditarPropioInput): Promise<PedidoSugerenciaConResidente | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .update({ titulo: input.titulo, descripcion: input.descripcion ?? null })
    .eq('id', id)
    .eq('residente_id', residenteId)
    .eq('estado', 'pendiente')
    .select(SELECT_CON_RESIDENTE)
    .maybeSingle();
  if (error) throw new Error(`Error al editar la solicitud: ${error.message}`);
  return data ? firmarAudio(mapRow(data)) : null;
});

export const listarPropios = withRepoLogging('requestsRepository', 'listarPropios', async (residenteId: string): Promise<PedidoSugerenciaConResidente[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .select(SELECT_CON_RESIDENTE)
    .eq('residente_id', residenteId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar tus solicitudes: ${error.message}`);
  return Promise.all(((data ?? []) as unknown[]).map((f) => firmarAudio(mapRow(f))));
});

export interface ListarAdminFiltros {
  estado?: EstadoPedido;
  tipo?: string;
  seccion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export const listarAdmin = withRepoLogging('requestsRepository', 'listarAdmin', async (organizacionId: string, filtros: ListarAdminFiltros): Promise<PedidoSugerenciaConResidente[]> => {
  let query = getSupabaseAdmin().from('pedidos_sugerencias').select(SELECT_CON_RESIDENTE).eq('organizacion_id', organizacionId);

  if (filtros.estado) query = query.eq('estado', filtros.estado);
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
  if (filtros.fechaDesde) query = query.gte('created_at', filtros.fechaDesde);
  if (filtros.fechaHasta) query = query.lte('created_at', filtros.fechaHasta);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar las solicitudes: ${error.message}`);

  let filas = await Promise.all(((data ?? []) as unknown[]).map((f) => firmarAudio(mapRow(f))));
  // La sección vive en el residente relacionado — se filtra en memoria porque
  // el filtro cruza una tabla vinculada (mismo enfoque que el resto del backoffice).
  if (filtros.seccion) filas = filas.filter((f) => f.residente?.seccion === filtros.seccion);
  return filas;
});

export const obtenerPorId = withRepoLogging('requestsRepository', 'obtenerPorId', async (id: string): Promise<PedidoSugerenciaConResidente | null> => {
  const { data, error } = await getSupabaseAdmin().from('pedidos_sugerencias').select(SELECT_CON_RESIDENTE).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar la solicitud: ${error.message}`);
  return data ? firmarAudio(mapRow(data)) : null;
});

export const getResidenteId = withRepoLogging('requestsRepository', 'getResidenteId', async (id: string): Promise<string | null> => {
  const { data } = await getSupabaseAdmin().from('pedidos_sugerencias').select('residente_id').eq('id', id).maybeSingle();
  return data?.residente_id ?? null;
});

export const actualizarEstado = withRepoLogging('requestsRepository', 'actualizarEstado', async (id: string, estado: EstadoPedido, resueltoPor: string | null): Promise<void> => {
  const { error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .update({
      estado,
      resuelto_por: estado === 'resuelta' ? resueltoPor : null,
      resuelto_en: estado === 'resuelta' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar el estado: ${error.message}`);
});

export const actualizarTranscripcion = withRepoLogging('requestsRepository', 'actualizarTranscripcion', async (id: string, transcripcion: string | null, estado: TranscripcionEstado): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('pedidos_sugerencias').update({ transcripcion, transcripcion_estado: estado }).eq('id', id);
  if (error) throw new Error(`Error al guardar la transcripción: ${error.message}`);
});

export const eliminar = withRepoLogging('requestsRepository', 'eliminar', async (id: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('pedidos_sugerencias').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la solicitud: ${error.message}`);
});

/** Sube al bucket `pedidos-audio`. */
export const subirAudio = withRepoLogging('requestsRepository', 'subirAudio', async (residenteId: string, buffer: Buffer, contentType: string, originalName: string): Promise<string> => {
  const ext = originalName.split('.').pop() ?? 'm4a';
  const path = `${residenteId}/${Date.now()}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('pedidos-audio').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Error al subir el audio: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('pedidos-audio').getPublicUrl(path);
  return data.publicUrl;
});
