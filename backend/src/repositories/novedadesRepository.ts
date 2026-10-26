import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export const CATEGORIAS_NOVEDAD = ['general', 'evento', 'salud', 'comida', 'cumpleanos', 'visita', 'aviso'] as const;
export type CategoriaNovedad = (typeof CATEGORIAS_NOVEDAD)[number];

export interface Novedad {
  id: string;
  organizacion_id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  /** null = para todos los residentes */
  grupo_ids: string[] | null;
  visible_hasta: string;
  /** Desde cuándo se ve en la app (puede ser a futuro: novedad programada) */
  publicar_en: string;
  /** Guardada sin publicar: no se ve en la app */
  es_borrador: boolean;
  /** Aparece primero en la lista de los residentes */
  fijada: boolean;
  categoria: CategoriaNovedad;
  /** Si la noticia es de un evento, cuándo es */
  fecha_evento: string | null;
  notificacion_id: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovedadAdmin extends Novedad {
  cantidad_lecturas: number;
  /** A cuántos residentes les llega (todos los activos, o los de los grupos elegidos) */
  cantidad_destinatarios: number;
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
  publicarEn: string;
  esBorrador: boolean;
  fijada: boolean;
  categoria: CategoriaNovedad;
  fechaEvento: string | null;
}

export interface ActualizarNovedadInput {
  titulo?: string;
  texto?: string;
  imagenUrl?: string | null;
  fijada?: boolean;
  categoria?: CategoriaNovedad;
  fechaEvento?: string | null;
  publicarEn?: string;
  visibleHasta?: string;
  esBorrador?: boolean;
}

export async function listarParaAdmin(organizacionId: string): Promise<NovedadAdmin[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('novedades')
    .select('*, novedad_lecturas(count)')
    .eq('organizacion_id', organizacionId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar las novedades: ${error.message}`);
  const filas = (data ?? []) as unknown as Array<Novedad & { novedad_lecturas: Array<{ count: number }> }>;
  const destinatarios = await contarDestinatarios(organizacionId, filas.map((f) => f.grupo_ids));
  return filas.map(({ novedad_lecturas, ...n }, i) => ({
    ...n,
    cantidad_lecturas: novedad_lecturas?.[0]?.count ?? 0,
    cantidad_destinatarios: destinatarios[i] ?? 0,
  }));
}

/** Cuántos residentes alcanza cada novedad: todos los activos si no tiene grupos, o los integrantes de sus grupos. */
async function contarDestinatarios(organizacionId: string, gruposPorNovedad: Array<string[] | null>): Promise<number[]> {
  const { count, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('*', { count: 'exact', head: true })
    .eq('organizacion_id', organizacionId)
    .eq('activo', true);
  if (error) throw new Error(`Error al contar los residentes: ${error.message}`);
  const total = count ?? 0;

  const todosLosGrupos = [...new Set(gruposPorNovedad.flatMap((g) => g ?? []))];
  const integrantes = new Map<string, Set<string>>();
  if (todosLosGrupos.length > 0) {
    const { data: filas, error: errorGrupos } = await getSupabaseAdmin()
      .from('grupo_residentes')
      .select('grupo_id, residente_id')
      .in('grupo_id', todosLosGrupos);
    if (errorGrupos) throw new Error(`Error al cargar los grupos: ${errorGrupos.message}`);
    for (const f of (filas ?? []) as Array<{ grupo_id: string; residente_id: string }>) {
      if (!integrantes.has(f.grupo_id)) integrantes.set(f.grupo_id, new Set());
      integrantes.get(f.grupo_id)!.add(f.residente_id);
    }
  }
  return gruposPorNovedad.map((grupos) => {
    if (!grupos) return total;
    const union = new Set<string>();
    for (const g of grupos) integrantes.get(g)?.forEach((r) => union.add(r));
    return union.size;
  });
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
      publicar_en: input.publicarEn,
      es_borrador: input.esBorrador,
      fijada: input.fijada,
      categoria: input.categoria,
      fecha_evento: input.fechaEvento,
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
  if (cambios.fijada !== undefined) fila.fijada = cambios.fijada;
  if (cambios.categoria !== undefined) fila.categoria = cambios.categoria;
  if (cambios.fechaEvento !== undefined) fila.fecha_evento = cambios.fechaEvento;
  if (cambios.publicarEn !== undefined) fila.publicar_en = cambios.publicarEn;
  if (cambios.visibleHasta !== undefined) fila.visible_hasta = cambios.visibleHasta;
  if (cambios.esBorrador !== undefined) fila.es_borrador = cambios.esBorrador;
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

/**
 * Borra las novedades publicadas cuyo evento ya pasó (visible_hasta es las
 * 00:00 del día siguiente al evento). Los borradores no se tocan. Las
 * lecturas se borran solas (on delete cascade). Devuelve los títulos borrados.
 */
export async function eliminarVencidas(ahora: Date): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('novedades')
    .delete()
    .eq('es_borrador', false)
    .lte('visible_hasta', ahora.toISOString())
    .select('titulo');
  if (error) throw new Error(`Error al eliminar las novedades vencidas: ${error.message}`);
  return ((data ?? []) as Array<{ titulo: string }>).map((n) => n.titulo);
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
    .lte('publicar_en', new Date().toISOString())
    .eq('es_borrador', false)
    .order('fijada', { ascending: false })
    .order('publicar_en', { ascending: false });
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
