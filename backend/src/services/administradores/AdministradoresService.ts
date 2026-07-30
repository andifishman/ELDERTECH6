import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/administradoresRepository';
import * as auditService from '../audit/AuditService';
import { SUPER_ADMIN_IDS } from '../../config/superAdmins';

/**
 * Porteo de `backoffice/src/features/administradores/useAdministradores.ts`.
 *
 * Excepción explícita a "los Services nunca reimplementan autorización":
 * hoy esto lo protege una policy RLS real (`super_admin_perfiles_rls`, chequea
 * `auth.jwt()->>'email'`) porque `rol` en `perfiles_usuario` solo distingue
 * residente/admin/staff — "super_admin" no existe como valor de columna, es
 * puramente un allowlist de emails (ver `config/superAdmins.ts`, también
 * usado por `requireAdmin` en `middlewares/auth.ts`). Como este backend usa
 * service_role (sin RLS), ese chequeo se reimplementa acá a propósito; si no,
 * cualquier admin/staff común podría promover/degradar roles vía la API.
 * Candidato a reemplazar por una columna `rol='super_admin'` real más
 * adelante — fuera de alcance de esta migración.
 */
function requireSuperAdmin(user: AuthUser): void {
  if (!user.isSuperAdmin) {
    throw new HttpError(403, 'Solo una cuenta super admin puede gestionar administradores.');
  }
}

export async function listar(user: AuthUser): Promise<repo.PerfilAdmin[]> {
  requireSuperAdmin(user);
  return repo.listarPerfiles();
}

export async function cambiarRol(user: AuthUser, id: string, rol: repo.RolUsuarioDB): Promise<void> {
  requireSuperAdmin(user);
  if (SUPER_ADMIN_IDS.includes(id)) {
    throw new HttpError(403, 'No se puede modificar el rol de una cuenta super admin.');
  }

  await repo.actualizarRol(id, rol);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'perfiles_usuario',
    registroId: id,
    descripcion: `Cambió el rol de un usuario a "${rol}"`,
  });
}
