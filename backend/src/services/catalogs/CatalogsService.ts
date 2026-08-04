import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/catalogsRepository';
import * as auditService from '../audit/AuditService';
import { StatusCodes } from 'http-status-codes';

/** Secciones del geriátrico — enum fijo (tabla `seccion_enum` en la DB), no requiere Repository. */
export const SECCIONES = [
  '1 AC', '1 B', '1 FRAGA',
  '2 AC', '2 B', '2 MODERADO', '2 REHABILITACION',
  '3 AC', '3B',
  'BAIT',
] as const;

export interface Catalogos {
  tiposActividad: repo.TipoActividad[];
  ubicaciones: repo.Ubicacion[];
  responsables: repo.Responsable[];
  secciones: readonly string[];
  intereses: repo.Interes[];
}

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export async function obtenerCatalogos(user: AuthUser): Promise<Catalogos> {
  const organizacionId = requireOrganizacionId(user);
  const [tiposActividad, ubicaciones, responsables, intereses] = await Promise.all([
    repo.findTiposActividad(organizacionId),
    repo.findUbicaciones(organizacionId),
    repo.findResponsables(organizacionId),
    repo.findIntereses(),
  ]);
  return { tiposActividad, ubicaciones, responsables, secciones: SECCIONES, intereses };
}

export async function crearTipoActividad(
  user: AuthUser,
  input: { nombre: string; emoji?: string; horaInicioDefault?: string; horaFinDefault?: string },
): Promise<string> {
  const organizacionId = requireOrganizacionId(user);
  const id = await repo.crearTipoActividad({
    organizacionId,
    nombre: input.nombre,
    emoji: input.emoji || null,
    horaInicioDefault: input.horaInicioDefault || null,
    horaFinDefault: input.horaFinDefault || null,
  });
  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'tipos_actividad',
    registroId: id,
    descripcion: `Creó el tipo de actividad "${input.nombre}"`,
  });
  return id;
}

export async function crearUbicacion(user: AuthUser, nombre: string): Promise<string> {
  const organizacionId = requireOrganizacionId(user);
  const id = await repo.crearUbicacion({ organizacionId, nombre });
  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'ubicaciones',
    registroId: id,
    descripcion: `Creó la ubicación "${nombre}"`,
  });
  return id;
}

/** Porteo de `crearResponsable` (backoffice/src/services/catalogosService.ts): separa nombre completo en nombre/apellido. */
export async function crearResponsable(user: AuthUser, nombreCompleto: string): Promise<string> {
  const organizacionId = requireOrganizacionId(user);
  const partes = nombreCompleto.trim().split(/\s+/);
  const nombre = partes[0] ?? nombreCompleto;
  const apellido = partes.slice(1).join(' ') || '';

  const id = await repo.crearResponsable({ organizacionId, nombre, apellido });
  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'responsables',
    registroId: id,
    descripcion: `Creó el responsable "${nombreCompleto}"`,
  });
  return id;
}
