import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export const ACCIONES = ['ver', 'crear', 'editar', 'eliminar'] as const;
export type AccionModulo = (typeof ACCIONES)[number];

export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  asignable: boolean;
  activo: boolean;
}

/** Qué puede hacer un usuario dentro de un módulo. */
export interface PermisoModulo {
  moduloId: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

interface FilaPermiso {
  modulo_id: string;
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
}

function aPermiso(f: FilaPermiso): PermisoModulo {
  return { moduloId: f.modulo_id, ver: f.puede_ver, crear: f.puede_crear, editar: f.puede_editar, eliminar: f.puede_eliminar };
}

export async function listarModulos(): Promise<Modulo[]> {
  const { data, error } = await getSupabaseAdmin().from('modulos').select('*').eq('activo', true).order('orden', { ascending: true });
  if (error) throw new Error(`Error al cargar los módulos: ${error.message}`);
  return (data ?? []) as Modulo[];
}

export async function obtenerPermisosUsuario(usuarioId: string): Promise<PermisoModulo[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('modulo_usuario')
    .select('modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar')
    .eq('usuario_id', usuarioId);
  if (error) throw new Error(`Error al cargar los permisos: ${error.message}`);
  return ((data ?? []) as FilaPermiso[]).map(aPermiso);
}

/** Todos los permisos de todos los usuarios — para el resumen de la pantalla Accesos. */
export async function obtenerPermisosDeTodos(): Promise<Map<string, PermisoModulo[]>> {
  const { data, error } = await getSupabaseAdmin()
    .from('modulo_usuario')
    .select('usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar');
  if (error) throw new Error(`Error al cargar los permisos: ${error.message}`);
  const porUsuario = new Map<string, PermisoModulo[]>();
  for (const f of (data ?? []) as Array<FilaPermiso & { usuario_id: string }>) {
    const lista = porUsuario.get(f.usuario_id) ?? [];
    lista.push(aPermiso(f));
    porUsuario.set(f.usuario_id, lista);
  }
  return porUsuario;
}

/** Reemplaza TODOS los permisos del usuario por los recibidos (los módulos sin ningún permiso se borran). */
export async function reemplazarPermisosUsuario(usuarioId: string, permisos: PermisoModulo[], actorId: string): Promise<void> {
  logger.info('repo:call', { repository: 'accessRepository', action: 'reemplazarPermisosUsuario', usuarioId, modulos: permisos.length });
  const db = getSupabaseAdmin();
  const { error: errBorrar } = await db.from('modulo_usuario').delete().eq('usuario_id', usuarioId);
  if (errBorrar) throw new Error(`Error al actualizar los permisos: ${errBorrar.message}`);

  const filas = permisos
    .filter((p) => p.ver || p.crear || p.editar || p.eliminar)
    .map((p) => ({
      usuario_id: usuarioId,
      modulo_id: p.moduloId,
      puede_ver: p.ver,
      puede_crear: p.crear,
      puede_editar: p.editar,
      puede_eliminar: p.eliminar,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    }));
  if (filas.length === 0) return;
  const { error } = await db.from('modulo_usuario').insert(filas);
  if (error) throw new Error(`Error al guardar los permisos: ${error.message}`);
}

export async function borrarPermisosUsuario(usuarioId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('modulo_usuario').delete().eq('usuario_id', usuarioId);
  if (error) throw new Error(`Error al quitar los permisos: ${error.message}`);
}

/** Permisos mínimos para quien recién recibe acceso al backoffice: solo ver el Dashboard. */
export async function otorgarPermisosIniciales(usuarioId: string, actorId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('modulo_usuario')
    .upsert(
      { usuario_id: usuarioId, modulo_id: 'dashboard', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, updated_by: actorId },
      { onConflict: 'usuario_id,modulo_id', ignoreDuplicates: true },
    );
  if (error) throw new Error(`Error al otorgar permisos iniciales: ${error.message}`);
}

export interface PerfilBackoffice {
  id: string;
  username: string;
  rol: 'residente' | 'admin' | 'staff';
  activo: boolean;
}

export async function listarUsuariosBackoffice(): Promise<PerfilBackoffice[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('perfiles_usuario')
    .select('id, username, rol, activo')
    .in('rol', ['admin', 'staff'])
    .order('username', { ascending: true });
  if (error) throw new Error(`Error al cargar los usuarios del backoffice: ${error.message}`);
  return (data ?? []) as PerfilBackoffice[];
}

export async function obtenerPerfilBackoffice(id: string): Promise<PerfilBackoffice | null> {
  const { data, error } = await getSupabaseAdmin().from('perfiles_usuario').select('id, username, rol, activo').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar el usuario: ${error.message}`);
  return (data as PerfilBackoffice | null) ?? null;
}
