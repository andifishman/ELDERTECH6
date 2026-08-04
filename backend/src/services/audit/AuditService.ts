import { logger } from '../../logging/logger';
import { HttpError } from '../../middlewares/errorHandler';
import * as repo from '../../repositories/auditRepository';
import type { AuthUser } from '../../middlewares/auth';
import { StatusCodes } from 'http-status-codes';

/**
 * Porteo de `backoffice/src/services/auditService.ts`. Cross-cutting: cada
 * Service admin-only la llama como último paso después de una mutación
 * exitosa — nunca duplicada dentro de un Repository. No bloqueante: si el
 * log falla, solo se advierte (igual que el original).
 */
export async function registrarAuditoria(
  user: AuthUser,
  params: {
    accion: repo.AccionAuditoria;
    tabla: string;
    registroId?: string | null;
    descripcion?: string;
    datosNuevos?: Record<string, unknown> | null;
    datosPrevios?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await repo.insertAuditLog({
      organizacionId: user.organizacionId,
      usuarioId: user.supabaseUserId,
      usuarioNombre: user.email,
      ...params,
    });
  } catch (err) {
    logger.warn('[auditoria] no se pudo registrar la acción', {
      error: err instanceof Error ? err.message : String(err),
      tabla: params.tabla,
      accion: params.accion,
    });
  }
}

export async function listar(user: AuthUser, limit?: number): Promise<repo.AuditLog[]> {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return repo.listarAuditLogs(user.organizacionId, limit);
}
