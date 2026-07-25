import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/tutorialsRepository';
import type { TutorialAdmin, TutorialAdminInput, CategoriaTutorial } from '../../providers/tutorials/TutorialTypes';
import * as auditService from '../audit/AuditService';

/** Porteo de `backoffice/src/services/articulosService.ts` — operaciones admin-only (backoffice). */

export async function listarTodos(): Promise<TutorialAdmin[]> {
  return repo.listarTodosAdmin();
}

export async function listarEliminados(): Promise<TutorialAdmin[]> {
  return repo.listarEliminadosAdmin();
}

export async function crearCategoria(user: AuthUser, nombre: string, emoji?: string): Promise<string> {
  const id = await repo.crearCategoriaTutorial(nombre, emoji || null);
  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'categorias_tutorial',
    registroId: id,
    descripcion: `Creó la categoría "${nombre}"`,
  });
  return id;
}

export async function obtenerPorId(id: string): Promise<TutorialAdmin> {
  const tutorial = await repo.obtenerAdminPorId(id);
  if (!tutorial) throw new HttpError(404, 'Tutorial no encontrado.');
  return tutorial;
}

export async function listarPasos(tutorialId: string) {
  return repo.getPasos(tutorialId);
}

export async function crear(user: AuthUser, input: TutorialAdminInput): Promise<string> {
  const id = await repo.crearTutorialAdmin(input);
  await auditService.registrarAuditoria(user, {
    accion: input.activo ? 'publicar' : 'crear',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `${input.activo ? 'Publicó' : 'Creó borrador de'} "${input.titulo}"`,
  });
  return id;
}

export async function actualizar(user: AuthUser, id: string, input: TutorialAdminInput): Promise<void> {
  await repo.actualizarTutorialAdmin(id, input);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Editó "${input.titulo}"`,
  });
}

/** Soft delete — mueve a la papelera. */
export async function eliminar(user: AuthUser, id: string, titulo?: string): Promise<void> {
  await repo.eliminarTutorialAdmin(id);
  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Movió a papelera "${titulo ?? id}"`,
  });
}

export async function restaurar(user: AuthUser, id: string, titulo?: string): Promise<void> {
  await repo.restaurarTutorialAdmin(id);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Restauró "${titulo ?? id}" desde la papelera`,
  });
}

export async function eliminarDefinitivo(user: AuthUser, id: string, titulo?: string): Promise<void> {
  await repo.eliminarTutorialDefinitivo(id);
  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'tutoriales',
    registroId: id,
    descripcion: `Eliminó definitivamente "${titulo ?? id}"`,
  });
}

export async function subirImagen(carpeta: string, buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  return repo.subirImagenTutorial(carpeta, buffer, contentType, originalName);
}

export async function subirAudio(buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  return repo.subirAudioTutorial(buffer, contentType, originalName);
}

export type { CategoriaTutorial };
