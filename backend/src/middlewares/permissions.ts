import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../logging/logger';
import * as accessRepo from '../repositories/accessRepository';
import type { AccionModulo } from '../repositories/accessRepository';

export type { AccionModulo };

/** Los módulos son filas de la tabla `modulos` (ver migración 20261005120000_permisos_por_modulo.sql). */
export type ModuloId =
  | 'dashboard'
  | 'horarios'
  | 'tutoriales'
  | 'usuarios'
  | 'pedidos'
  | 'notificaciones'
  | 'asistente'
  | 'auditoria'
  | 'configuracion'
  | 'administradores'
  | 'accesos'
  | 'grupos';

export function tienePermiso(permisos: accessRepo.PermisoModulo[], modulo: ModuloId, accion: AccionModulo): boolean {
  const p = permisos.find((x) => x.moduloId === modulo);
  if (!p || !p.ver) return false; // sin "ver" no se puede nada más en el módulo
  return accion === 'ver' ? true : p[accion];
}

/**
 * Exige que el usuario autenticado tenga permiso sobre un módulo. Va DESPUÉS de
 * `requireAuth` + `requireAdmin`. Si se pasan varias acciones alcanza con que
 * tenga CUALQUIERA (ej. subir una imagen sirve tanto para crear como para editar).
 *
 * El Super Super Admin (allowlist de emails) pasa siempre. Todos los demás se
 * resuelven contra `modulo_usuario` en cada request — sin caché, así que quitar
 * un permiso rige de inmediato.
 */
export function requirePermission(modulo: ModuloId, ...acciones: AccionModulo[]) {
  const aceptadas: AccionModulo[] = acciones.length > 0 ? acciones : ['ver'];
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'No autenticado' });
        return;
      }
      if (req.user.isSuperAdmin) {
        next();
        return;
      }
      const permisos = await accessRepo.obtenerPermisosUsuario(req.user.supabaseUserId);
      if (aceptadas.some((a) => tienePermiso(permisos, modulo, a))) {
        next();
        return;
      }
      logger.warn('requirePermission: acceso denegado', {
        userId: req.user.supabaseUserId,
        modulo,
        acciones: aceptadas,
        path: req.path,
        method: req.method,
      });
      res.status(StatusCodes.FORBIDDEN).json({ error: `No tenés permiso para ${aceptadas.join(' / ')} en este módulo.` });
    } catch (err) {
      logger.error('requirePermission: no se pudieron resolver los permisos', { error: err instanceof Error ? err.message : String(err) });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'No se pudieron verificar los permisos' });
    }
  };
}

/** Solo el Super Super Admin (allowlist de emails). Usar en lo que nunca se delega: Accesos, Administradores. */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isSuperAdmin) {
    res.status(StatusCodes.FORBIDDEN).json({ error: 'Solo una cuenta Super Admin puede hacer esto.' });
    return;
  }
  next();
}
