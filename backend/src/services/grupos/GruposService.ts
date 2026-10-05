import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/gruposRepository';
import * as auditService from '../audit/AuditService';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export async function listar(user: AuthUser): Promise<repo.GrupoConCantidad[]> {
  return repo.listarGrupos(requireOrganizacionId(user));
}

export interface GrupoDetalle {
  grupo: repo.Grupo;
  miembros: repo.ResidenteBasico[];
}

export async function obtenerDetalle(id: string): Promise<GrupoDetalle> {
  const grupo = await repo.obtenerGrupo(id);
  if (!grupo) throw new HttpError(StatusCodes.NOT_FOUND, 'Grupo no encontrado.');
  const miembros = await repo.listarMiembros(id);
  return { grupo, miembros };
}

export async function residentesDisponibles(user: AuthUser, grupoId: string): Promise<repo.ResidenteBasico[]> {
  const grupo = await repo.obtenerGrupo(grupoId);
  if (!grupo) throw new HttpError(StatusCodes.NOT_FOUND, 'Grupo no encontrado.');
  return repo.listarResidentesFueraDelGrupo(requireOrganizacionId(user), grupoId);
}

export async function crear(user: AuthUser, nombre: string, descripcion: string | null, residenteIds: string[]): Promise<repo.Grupo> {
  const organizacionId = requireOrganizacionId(user);
  const existente = await repo.obtenerGrupoPorNombre(organizacionId, nombre);
  if (existente) throw new HttpError(StatusCodes.BAD_REQUEST, `Ya existe un grupo llamado "${nombre}".`);

  const grupo = await repo.crearGrupo(organizacionId, nombre, descripcion);
  if (residenteIds.length > 0) await repo.agregarMiembros(grupo.id, residenteIds);

  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'grupos',
    registroId: grupo.id,
    descripcion: `Creó el grupo "${nombre}"${residenteIds.length ? ` con ${residenteIds.length} integrante(s)` : ''}`,
    datosNuevos: { nombre, descripcion, residenteIds },
  });
  return grupo;
}

export async function actualizar(user: AuthUser, id: string, cambios: { nombre?: string; descripcion?: string | null }): Promise<repo.Grupo> {
  const grupo = await repo.obtenerGrupo(id);
  if (!grupo) throw new HttpError(StatusCodes.NOT_FOUND, 'Grupo no encontrado.');

  // Los grupos de sección mantienen su nombre sincronizado con seccion_enum — solo se puede editar la descripción.
  if (grupo.tipo === 'seccion' && cambios.nombre && cambios.nombre !== grupo.nombre) {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'El nombre de un grupo de sección no se puede cambiar.');
  }

  if (cambios.nombre && cambios.nombre !== grupo.nombre) {
    const existente = await repo.obtenerGrupoPorNombre(grupo.organizacion_id, cambios.nombre);
    if (existente && existente.id !== id) throw new HttpError(StatusCodes.BAD_REQUEST, `Ya existe un grupo llamado "${cambios.nombre}".`);
  }

  const actualizado = await repo.actualizarGrupo(id, cambios);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'grupos',
    registroId: id,
    descripcion: `Editó el grupo "${grupo.nombre}"`,
    datosPrevios: { nombre: grupo.nombre, descripcion: grupo.descripcion },
    datosNuevos: cambios,
  });
  return actualizado;
}

export async function eliminar(user: AuthUser, id: string): Promise<void> {
  const grupo = await repo.obtenerGrupo(id);
  if (!grupo) throw new HttpError(StatusCodes.NOT_FOUND, 'Grupo no encontrado.');
  if (grupo.tipo === 'seccion') {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Los grupos de sección no se pueden eliminar — se mantienen sincronizados automáticamente.');
  }
  await repo.eliminarGrupo(id);
  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'grupos',
    registroId: id,
    descripcion: `Eliminó el grupo "${grupo.nombre}"`,
    datosPrevios: { nombre: grupo.nombre },
  });
}

export async function agregarMiembros(user: AuthUser, grupoId: string, residenteIds: string[]): Promise<void> {
  const grupo = await repo.obtenerGrupo(grupoId);
  if (!grupo) throw new HttpError(StatusCodes.NOT_FOUND, 'Grupo no encontrado.');
  if (grupo.tipo === 'seccion') {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'No se puede sumar gente a mano a un grupo de sección — se arma solo según la sección de cada residente.');
  }
  if (residenteIds.length === 0) return;
  await repo.agregarMiembros(grupoId, residenteIds);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'grupo_residentes',
    registroId: grupoId,
    descripcion: `Agregó ${residenteIds.length} integrante(s) al grupo "${grupo.nombre}"`,
    datosNuevos: { residenteIds },
  });
}

export async function quitarMiembro(user: AuthUser, grupoId: string, residenteId: string): Promise<void> {
  const grupo = await repo.obtenerGrupo(grupoId);
  if (!grupo) throw new HttpError(StatusCodes.NOT_FOUND, 'Grupo no encontrado.');
  if (grupo.tipo === 'seccion') {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'No se puede sacar a alguien de un grupo de sección a mano — cambiá la sección del residente desde su ficha.');
  }
  await repo.quitarMiembro(grupoId, residenteId);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'grupo_residentes',
    registroId: grupoId,
    descripcion: `Quitó a un integrante del grupo "${grupo.nombre}"`,
    datosPrevios: { residenteId },
  });
}
