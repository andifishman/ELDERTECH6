import { getSupabaseAdmin } from './supabaseAdmin';
import type { CrearPedidoInput, EstadoPedido, PedidoSugerenciaConResidente, TranscripcionEstado } from '../providers/requests/RequestTypes';

const SELECT_CON_RESIDENTE = '*, residente:residentes(id, nombre, apellido, habitacion, seccion)';

function mapRow(row: unknown): PedidoSugerenciaConResidente {
  const r = row as PedidoSugerenciaConResidente & { residente: PedidoSugerenciaConResidente['residente'] | PedidoSugerenciaConResidente['residente'][] };
  return { ...r, residente: Array.isArray(r.residente) ? (r.residente[0] ?? null) : r.residente };
}

export async function crearPedido(input: CrearPedidoInput): Promise<PedidoSugerenciaConResidente> {
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
}

export async function listarPropios(residenteId: string): Promise<PedidoSugerenciaConResidente[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .select(SELECT_CON_RESIDENTE)
    .eq('residente_id', residenteId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar tus solicitudes: ${error.message}`);
  return ((data ?? []) as unknown[]).map(mapRow);
}

export interface ListarAdminFiltros {
  estado?: EstadoPedido;
  tipo?: string;
  seccion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export async function listarAdmin(organizacionId: string, filtros: ListarAdminFiltros): Promise<PedidoSugerenciaConResidente[]> {
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
}

export async function obtenerPorId(id: string): Promise<PedidoSugerenciaConResidente | null> {
  const { data, error } = await getSupabaseAdmin().from('pedidos_sugerencias').select(SELECT_CON_RESIDENTE).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar la solicitud: ${error.message}`);
  return data ? mapRow(data) : null;
}

export async function getResidenteId(id: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin().from('pedidos_sugerencias').select('residente_id').eq('id', id).maybeSingle();
  return data?.residente_id ?? null;
}

export async function actualizarEstado(id: string, estado: EstadoPedido, resueltoPor: string | null): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('pedidos_sugerencias')
    .update({
      estado,
      resuelto_por: estado === 'resuelta' ? resueltoPor : null,
      resuelto_en: estado === 'resuelta' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar el estado: ${error.message}`);
}

export async function actualizarTranscripcion(id: string, transcripcion: string | null, estado: TranscripcionEstado): Promise<void> {
  const { error } = await getSupabaseAdmin().from('pedidos_sugerencias').update({ transcripcion, transcripcion_estado: estado }).eq('id', id);
  if (error) throw new Error(`Error al guardar la transcripción: ${error.message}`);
}

export async function eliminar(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('pedidos_sugerencias').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la solicitud: ${error.message}`);
}

/** Sube al bucket `pedidos-audio`. */
export async function subirAudio(residenteId: string, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'm4a';
  const path = `${residenteId}/${Date.now()}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('pedidos-audio').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Error al subir el audio: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('pedidos-audio').getPublicUrl(path);
  return data.publicUrl;
}
