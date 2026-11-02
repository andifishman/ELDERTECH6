import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/profileRepository';

export type RolBackoffice = 'super_admin' | 'admin' | 'editor';

export interface PerfilBackoffice extends Omit<repo.PerfilPropioRow, 'rol'> {
  rol: RolBackoffice;
}

/** Traduce el rol de la base (admin/staff/residente) + la condición de super admin al rol que muestra el backoffice. */
export function rolBackoffice(user: AuthUser): RolBackoffice {
  if (user.isSuperAdmin) return 'super_admin';
  return user.rol === 'admin' ? 'admin' : 'editor';
}

export async function obtener(user: AuthUser): Promise<PerfilBackoffice> {
  const fila = await repo.obtenerPerfilPropio(user.supabaseUserId);
  // Un super admin del allowlist puede no tener fila de perfil: se arma un perfil mínimo.
  const base: repo.PerfilPropioRow = fila ?? {
    id: user.supabaseUserId,
    organizacion_id: user.organizacionId,
    residente_id: user.residenteId,
    rol: user.rol,
    nombre_completo: null,
    avatar_url: null,
    email: user.email,
    activo: true,
    ultimo_acceso: null,
    created_at: new Date().toISOString(),
  };
  return { ...base, email: base.email ?? user.email, rol: rolBackoffice(user) };
}

/** Best-effort: no registra el acceso de quien no tiene fila de perfil. */
export async function registrarAcceso(user: AuthUser): Promise<void> {
  await repo.registrarAcceso(user.supabaseUserId);
}

export async function actualizar(user: AuthUser, input: repo.ActualizarPerfilInput): Promise<void> {
  await repo.actualizarPerfil(user.supabaseUserId, input);
}

export async function subirAvatar(user: AuthUser, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  return repo.subirAvatar(user.supabaseUserId, buffer, contentType, originalName);
}
