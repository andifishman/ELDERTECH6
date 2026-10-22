import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export interface Novedad {
  id: string;
  organizacion_id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  /** null = para todos los residentes */
  grupo_ids: string[] | null;
  visible_hasta: string;
  notificacion_id: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovedadAdmin extends Novedad {
  cantidad_lecturas: number;
}

export interface NovedadResidente extends Novedad {
  leida: boolean;
}

export interface CrearNovedadInput {
  titulo: string;
  texto: string;
  imagenUrl: string | null;
  grupoIds: string[] | null;
  visibleHasta: string;
}

export interface ActualizarNovedadInput {
  titulo?: string;
  texto?: string;
  imagenUrl?: string | null;
}

export async function listarParaAdmin(organizacionId: string): Promise<NovedadAdmin[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('novedades')
    .select('*, novedad_lecturas(count)')
    .eq('organizacion_id', organizacionId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar las novedades: ${error.message}`);
  return ((data ?? []) as unknown as Array<Novedad & { novedad_lecturas: Array<{ count: number }> }>).map(({ novedad_lecturas, ...n }) => ({
    ...n,
    cantidad_lecturas: novedad_lecturas?.[0]?.count ?? 0,
  }));
}

export async function obtener(id: string): Promise<Novedad | null> {
  const { data, error } = await getSupabaseAdmin().from('novedades').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar la novedad: ${error.message}`);
  return (data as Novedad | null) ?? null;
}

export async function crear(organizacionId: string, creadoPor: string, input: CrearNovedadInput): Promise<Novedad> {
  logger.info('repo:call', { repository: 'novedadesRepository', action: 'crear', organizacionId, titulo: input.titulo });
  const { data, error } = await getSupabaseAdmin()
    .from('novedades')
    .insert({
      organizacion_id: organizacionId,
      titulo: input.titulo,
      texto: input.texto,
      imagen_url: input.imagenUrl,
      grupo_ids: input.grupoIds,
      visible_hasta: input.visibleHasta,
      creado_por: creadoPor,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Error al crear la novedad: ${error.message}`);
  return data as Novedad;
}

export async function actualizar(id: string, cambios: ActualizarNovedadInput): Promise<Novedad> {
  const fila: Record<string, unknown> = {};
  if (cambios.titulo !== undefined) fila.titulo = cambios.titulo;
  if (cambios.texto !== undefined) fila.texto = cambios.texto;
  if (cambios.imagenUrl !== undefined) fila.imagen_url = cambios.imagenUrl;
  const { data, error } = await getSupabaseAdmin().from('novedades').update(fila).eq('id', id).select('*').single();
  if (error) throw new Error(`Error al actualizar la novedad: ${error.message}`);
  return data as Novedad;
}

export async function vincularNotificacion(id: string, notificacionId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('novedades').update({ notificacion_id: notificacionId }).eq('id', id);
  if (error) throw new Error(`Error al vincular la notificación: ${error.message}`);
}

export async function eliminar(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('novedades').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la novedad: ${error.message}`);
}

async function gruposDelResidente(residenteId: string): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin().from('grupo_residentes').select('grupo_id').eq('residente_id', residenteId);
  if (error) throw new Error(`Error al cargar los grupos del residente: ${error.message}`);
  return ((data ?? []) as Array<{ grupo_id: string }>).map((g) => g.grupo_id);
}

/** Novedades vigentes que le corresponden al residente (para todos, o para alguno de sus grupos), con su estado de lectura. */
export async function listarParaResidente(organizacionId: string, residenteId: string): Promise<NovedadResidente[]> {
  const grupos = await gruposDelResidente(residenteId);

  let query = getSupabaseAdmin()
    .from('novedades')
    .select('*')
    .eq('organizacion_id', organizacionId)
    .gt('visible_hasta', new Date().toISOString())
    .order('created_at', { ascending: false });
  query = grupos.length > 0 ? query.or(`grupo_ids.is.null,grupo_ids.ov.{${grupos.join(',')}}`) : query.is('grupo_ids', null);

  const { data, error } = await query;
  if (error) throw new Error(`Error al cargar las novedades: ${error.message}`);
  const novedades = (data ?? []) as Novedad[];
  if (novedades.length === 0) return [];

  const { data: lecturas, error: errorLecturas } = await getSupabaseAdmin()
    .from('novedad_lecturas')
    .select('novedad_id')
    .eq('residente_id', residenteId)
    .in('novedad_id', novedades.map((n) => n.id));
  if (errorLecturas) throw new Error(`Error al cargar las lecturas: ${errorLecturas.message}`);
  const leidas = new Set(((lecturas ?? []) as Array<{ novedad_id: string }>).map((l) => l.novedad_id));

  return novedades.map((n) => ({ ...n, leida: leidas.has(n.id) }));
}

export async function marcarLeida(novedadId: string, residenteId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('novedad_lecturas')
    .upsert({ novedad_id: novedadId, residente_id: residenteId }, { onConflict: 'novedad_id,residente_id', ignoreDuplicates: true });
  if (error) throw new Error(`Error al marcar la novedad como leída: ${error.message}`);
}

/** Sube la foto al bucket `tutorial-images` (el mismo que usa el resto del backoffice para imágenes). */
export async function subirImagen(buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'jpg';
  const path = `novedades/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await getSupabaseAdmin().storage.from('tutorial-images').upload(path, buffer, { contentType, upsert: false, cacheControl: '31536000' });
  if (error) throw new Error(`Error al subir la foto: ${error.message}`);
  const { data } = getSupabaseAdmin().storage.from('tutorial-images').getPublicUrl(path);
  return data.publicUrl;
}
