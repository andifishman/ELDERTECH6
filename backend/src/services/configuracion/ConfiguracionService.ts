import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/configuracionRepository';
import * as auditService from '../audit/AuditService';
import { StatusCodes } from 'http-status-codes';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export async function obtener(user: AuthUser): Promise<repo.Organizacion | null> {
  return repo.obtenerOrganizacion(requireOrganizacionId(user));
}

export async function actualizar(user: AuthUser, input: repo.ActualizarOrganizacionInput): Promise<void> {
  const organizacionId = requireOrganizacionId(user);
  await repo.actualizarOrganizacion(organizacionId, input);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'organizaciones',
    registroId: organizacionId,
    descripcion: 'Actualizó la configuración general',
  });
}
