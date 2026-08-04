import { HttpError } from '../../middlewares/errorHandler';
import * as repo from '../../repositories/tutorialsRepository';
import type { CategoriaTutorial, PasoTutorial, Tutorial, TutorialConProgreso } from '../../providers/tutorials/TutorialTypes';
import type { TutorialParaIA } from '../../repositories/tutorialsRepository';
import { StatusCodes } from 'http-status-codes';

export async function getCategorias(): Promise<CategoriaTutorial[]> {
  return repo.getCategorias();
}

export async function getTutoriales(residenteId: string | null, categoriaId?: string | null): Promise<TutorialConProgreso[]> {
  return repo.getTutorialesConProgreso(residenteId, categoriaId);
}

export async function getTutorialById(id: string, residenteId: string | null): Promise<TutorialConProgreso> {
  const tutorial = await repo.getTutorialById(id, residenteId);
  if (!tutorial) throw new HttpError(StatusCodes.NOT_FOUND, 'Tutorial no encontrado.');
  return tutorial;
}

export async function getPasos(tutorialId: string): Promise<PasoTutorial[]> {
  return repo.getPasos(tutorialId);
}

export async function getRelacionados(tutorialId: string, categoriaId: string | null): Promise<Tutorial[]> {
  return repo.getTutorialesRelacionados(tutorialId, categoriaId, 3);
}

export async function guardarProgreso(residenteId: string, tutorialId: string, updates: repo.ProgresoUpdates): Promise<void> {
  await repo.upsertProgreso(residenteId, tutorialId, updates);
}

/** Registra que el residente abrió el tutorial (historial) — porteo de `registrarVista`. */
export async function registrarVista(residenteId: string, tutorialId: string): Promise<void> {
  await repo.upsertProgreso(residenteId, tutorialId, { ultima_vista: new Date().toISOString() });
}

export async function getHistorial(residenteId: string, limit?: number): Promise<TutorialConProgreso[]> {
  return repo.getHistorial(residenteId, limit);
}

export async function getFavoritos(residenteId: string): Promise<TutorialConProgreso[]> {
  return repo.getFavoritos(residenteId);
}

/** Búsqueda por texto para la herramienta `buscar_tutoriales` del asistente de IA. */
export async function searchTutoriales(busqueda: string): Promise<TutorialParaIA[]> {
  return repo.searchTutorialsByText(busqueda);
}
