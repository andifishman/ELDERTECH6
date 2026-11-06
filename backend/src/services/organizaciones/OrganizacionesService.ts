import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/organizacionesRepository';
import * as auditService from '../audit/AuditService';

/** Solo el super admin llama a esto (el router ya exige `requireSuperAdmin`). */
export async function listarParaGestion(): Promise<repo.OrganizacionDetalle[]> {
  return repo.listarTodasConDetalle();
}

export async function actualizar(user: AuthUser, id: string, cambios: repo.CambiosOrganizacion): Promise<repo.OrganizacionDetalle> {
  const antes = await repo.obtenerDetalle(id);
  if (!antes) throw new HttpError(StatusCodes.NOT_FOUND, 'Institución no encontrada.');

  const resultado = await repo.actualizar(id, cambios);
  if (resultado === 'sin_columna') {
    throw new HttpError(StatusCodes.CONFLICT, 'Falta aplicar la migración del color por institución (supabase/migrations/20261103120000_organizacion_color.sql).');
  }
  if (!resultado) throw new HttpError(StatusCodes.NOT_FOUND, 'Institución no encontrada.');

  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'organizaciones',
    registroId: id,
    descripcion: `Editó la institución "${antes.nombre}"${cambios.colorPrincipal !== undefined ? ` (color principal: ${cambios.colorPrincipal ?? 'por defecto'})` : ''}`,
    datosPrevios: { nombre: antes.nombre, colorPrincipal: antes.colorPrincipal },
    datosNuevos: { ...cambios },
  });
  return resultado;
}
