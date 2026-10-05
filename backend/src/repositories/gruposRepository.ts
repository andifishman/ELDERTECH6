import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export type TipoGrupo = 'seccion' | 'personalizado';

export interface Grupo {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoGrupo;
  seccion: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrupoConCantidad extends Grupo {
  cantidad_residentes: number;
}

export interface ResidenteBasico {
  id: string;
  nombre: string;
  apellido: string;
  seccion: string | null;
  habitacion: string | null;
  activo: boolean;
}

export async function listarGrupos(organizacionId: string): Promise<GrupoConCantidad[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('grupos')
    .select('*, grupo_residentes(count)')
    .eq('organizacion_id', organizacionId)
    .order('tipo', { ascending: true })
    .order('nombre', { ascending: true });
  if (error) throw new Error(`Error al cargar los grupos: ${error.message}`);
  return ((data ?? []) as unknown as Array<Grupo & { grupo_residentes: Array<{ count: number }> }>).map((g) => ({
    ...g,
    cantidad_residentes: g.grupo_residentes?.[0]?.count ?? 0,
  }));
}

export async function obtenerGrupo(id: string): Promise<Grupo | null> {
  const { data, error } = await getSupabaseAdmin().from('grupos').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar el grupo: ${error.message}`);
  return (data as Grupo | null) ?? null;
}

export async function obtenerGrupoPorNombre(organizacionId: string, nombre: string): Promise<Grupo | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('grupos')
    .select('*')
    .eq('organizacion_id', organizacionId)
    .ilike('nombre', nombre)
    .maybeSingle();
  if (error) throw new Error(`Error al buscar el grupo: ${error.message}`);
  return (data as Grupo | null) ?? null;
}

export async function listarMiembros(grupoId: string): Promise<ResidenteBasico[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('grupo_residentes')
    .select('residente:residentes!inner(id, nombre, apellido, seccion, habitacion, activo)')
    .eq('grupo_id', grupoId);
  if (error) throw new Error(`Error al cargar los integrantes del grupo: ${error.message}`);
  return ((data ?? []) as unknown as Array<{ residente: ResidenteBasico }>)
    .map((row) => row.residente)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function crearGrupo(organizacionId: string, nombre: string, descripcion: string | null): Promise<Grupo> {
  logger.info('repo:call', { repository: 'gruposRepository', action: 'crearGrupo', organizacionId, nombre });
  const { data, error } = await getSupabaseAdmin()
    .from('grupos')
    .insert({ organizacion_id: organizacionId, nombre, descripcion, tipo: 'personalizado' })
    .select('*')
    .single();
  if (error) throw new Error(`Error al crear el grupo: ${error.message}`);
  return data as Grupo;
}

export async function actualizarGrupo(id: string, cambios: { nombre?: string; descripcion?: string | null }): Promise<Grupo> {
  const { data, error } = await getSupabaseAdmin()
    .from('grupos')
    .update({ ...cambios, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(`Error al actualizar el grupo: ${error.message}`);
  return data as Grupo;
}

export async function eliminarGrupo(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('grupos').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar el grupo: ${error.message}`);
}

export async function agregarMiembros(grupoId: string, residenteIds: string[]): Promise<void> {
  if (residenteIds.length === 0) return;
  const filas = residenteIds.map((residenteId) => ({ grupo_id: grupoId, residente_id: residenteId }));
  const { error } = await getSupabaseAdmin().from('grupo_residentes').upsert(filas, { onConflict: 'grupo_id,residente_id', ignoreDuplicates: true });
  if (error) throw new Error(`Error al agregar integrantes al grupo: ${error.message}`);
}

export async function quitarMiembro(grupoId: string, residenteId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('grupo_residentes').delete().eq('grupo_id', grupoId).eq('residente_id', residenteId);
  if (error) throw new Error(`Error al quitar el integrante del grupo: ${error.message}`);
}

/** Para armar la lista "Agregar usuarios" del detalle de grupo — quiénes NO están ya adentro. */
export async function listarResidentesFueraDelGrupo(organizacionId: string, grupoId: string): Promise<ResidenteBasico[]> {
  const db = getSupabaseAdmin();
  const [{ data: todos, error: errTodos }, { data: miembros, error: errMiembros }] = await Promise.all([
    db.from('residentes').select('id, nombre, apellido, seccion, habitacion, activo').eq('organizacion_id', organizacionId).order('nombre', { ascending: true }),
    db.from('grupo_residentes').select('residente_id').eq('grupo_id', grupoId),
  ]);
  if (errTodos) throw new Error(`Error al cargar los residentes: ${errTodos.message}`);
  if (errMiembros) throw new Error(`Error al cargar los integrantes del grupo: ${errMiembros.message}`);
  const idsMiembros = new Set(((miembros ?? []) as Array<{ residente_id: string }>).map((m) => m.residente_id));
  return ((todos ?? []) as ResidenteBasico[]).filter((r) => !idsMiembros.has(r.id));
}
