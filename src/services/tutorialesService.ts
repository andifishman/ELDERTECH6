// Servicio de Tutoriales — habla con nuestro backend (eldertech-api), nunca
// directo con Supabase. La búsqueda ahora es server-side (ilike en la query,
// no un filter() en el cliente).
import { apiClient } from './apiClient';
import type {
  CategoriaTutorial,
  Tutorial,
  TutorialConProgreso,
  PasoTutorial,
  ProgresoTutorial,
} from '@/types/database.types';

/** Convierte segundos en texto legible: 65 → "1 min", 3600 → "60 min" */
export function formatearDuracion(segundos: number | null): string {
  if (!segundos) return '';
  const min = Math.ceil(segundos / 60);
  return `${min} min`;
}

export async function getCategoriasTutorial(): Promise<CategoriaTutorial[]> {
  return apiClient.get<CategoriaTutorial[]>('/api/tutorials/categories');
}

export async function getTutoriales(categoriaId?: string | null): Promise<Tutorial[]> {
  const query = categoriaId ? `?categoriaId=${categoriaId}` : '';
  return apiClient.get<Tutorial[]>(`/api/tutorials${query}`);
}

export async function getTutorialesConProgreso(
  _residenteId: string | null,
  categoriaId?: string | null,
): Promise<TutorialConProgreso[]> {
  const query = categoriaId ? `?categoriaId=${categoriaId}` : '';
  return apiClient.get<TutorialConProgreso[]>(`/api/tutorials${query}`);
}

export async function getTutorialById(id: string, _residenteId: string | null): Promise<TutorialConProgreso | null> {
  return apiClient.get<TutorialConProgreso>(`/api/tutorials/${id}`);
}

export async function getTutorialesRelacionados(tutorialId: string, categoriaId: string | null): Promise<Tutorial[]> {
  const query = categoriaId ? `?categoriaId=${categoriaId}` : '';
  return apiClient.get<Tutorial[]>(`/api/tutorials/${tutorialId}/related${query}`);
}

export async function getPasosTutorial(tutorialId: string): Promise<PasoTutorial[]> {
  return apiClient.get<PasoTutorial[]>(`/api/tutorials/${tutorialId}/steps`);
}

export async function upsertProgreso(
  _residenteId: string,
  tutorialId: string,
  updates: {
    favorito?: boolean;
    completado?: boolean;
    segundos_vistos?: number;
    ultima_vista?: string;
  },
): Promise<void> {
  await apiClient.post(`/api/tutorials/${tutorialId}/progress`, updates);
}

export async function registrarVista(_residenteId: string, tutorialId: string): Promise<void> {
  await apiClient.post(`/api/tutorials/${tutorialId}/view`);
}

export async function getHistorial(_residenteId: string, limit = 5): Promise<TutorialConProgreso[]> {
  return apiClient.get<TutorialConProgreso[]>(`/api/tutorials/history?limit=${limit}`);
}

export async function getFavoritos(_residenteId: string): Promise<TutorialConProgreso[]> {
  return apiClient.get<TutorialConProgreso[]>('/api/tutorials/favorites');
}

// Reexportado por compatibilidad de tipos con código que aún lo importe.
export type { ProgresoTutorial };
