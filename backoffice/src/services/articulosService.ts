import { apiClient } from '@/lib/apiClient';
import type { TutorialConCategoria, CategoriaTutorial, FormatoTutorial, PasoTutorial } from '@/types/database.types';

export interface PasoInput {
  orden: number;
  titulo: string;
  descripcion: string;
  imagen_url: string | null;
  tip: string | null;
}

export interface TutorialInput {
  titulo: string;
  descripcion?: string | null;
  categoria_id?: string | null;
  formato: FormatoTutorial;
  nivel: string;
  url_video?: string | null;
  thumbnail_url?: string | null;
  duracion_segundos?: number | null;
  lo_que_aprenderas?: string[] | null;
  activo: boolean;
  pasos?: PasoInput[];
}

export async function listarArticulos(): Promise<TutorialConCategoria[]> {
  return apiClient.get<TutorialConCategoria[]>('/api/admin/tutorials');
}

export async function listarEliminados(): Promise<TutorialConCategoria[]> {
  return apiClient.get<TutorialConCategoria[]>('/api/admin/tutorials/trash');
}

// Mismo endpoint público que usa la app móvil — es de solo lectura, no hace falta duplicarlo en /admin.
export async function listarCategoriasArticulo(): Promise<CategoriaTutorial[]> {
  return apiClient.get<CategoriaTutorial[]>('/api/tutorials/categories');
}

// Crea una nueva categoría de tutoriales. El emoji es opcional: si no se
// completa, la categoría se muestra solo con el nombre.
export async function crearCategoriaTutorial(nombre: string, emoji?: string): Promise<string> {
  const { id } = await apiClient.post<{ id: string }>('/api/admin/tutorials/categories', { nombre, emoji });
  return id;
}

export async function obtenerArticulo(id: string): Promise<TutorialConCategoria | null> {
  return apiClient.get<TutorialConCategoria>(`/api/admin/tutorials/${id}`);
}

export async function listarPasos(tutorialId: string): Promise<PasoTutorial[]> {
  return apiClient.get<PasoTutorial[]>(`/api/admin/tutorials/${tutorialId}/steps`);
}

export async function crearArticulo(input: TutorialInput): Promise<string> {
  const { id } = await apiClient.post<{ id: string }>('/api/admin/tutorials', input);
  return id;
}

export async function actualizarArticulo(id: string, input: TutorialInput): Promise<void> {
  await apiClient.patch<void>(`/api/admin/tutorials/${id}`, input);
}

// Soft delete: mueve a la papelera
export async function eliminarArticulo(id: string, titulo?: string): Promise<void> {
  const query = titulo ? `?titulo=${encodeURIComponent(titulo)}` : '';
  await apiClient.delete<void>(`/api/admin/tutorials/${id}${query}`);
}

// Restaurar desde la papelera
export async function restaurarArticulo(id: string, titulo?: string): Promise<void> {
  const query = titulo ? `?titulo=${encodeURIComponent(titulo)}` : '';
  await apiClient.post<void>(`/api/admin/tutorials/${id}/restore${query}`);
}

// Eliminación definitiva e irreversible
export async function eliminarDefinitivamente(id: string, titulo?: string): Promise<void> {
  const query = titulo ? `?titulo=${encodeURIComponent(titulo)}` : '';
  await apiClient.delete<void>(`/api/admin/tutorials/${id}/permanent${query}`);
}

// Sube una imagen al bucket tutorial-images y devuelve la URL pública
export async function subirImagenTutorial(archivo: File, carpeta = 'thumbnails'): Promise<string> {
  const form = new FormData();
  form.append('archivo', archivo);
  const { url } = await apiClient.postForm<{ url: string }>(`/api/admin/tutorials/images?carpeta=${carpeta}`, form);
  return url;
}

// Sube un archivo de audio al bucket tutorial-audio y devuelve la URL pública
export async function subirAudioTutorial(archivo: File): Promise<string> {
  const form = new FormData();
  form.append('archivo', archivo);
  const { url } = await apiClient.postForm<{ url: string }>('/api/admin/tutorials/audio', form);
  return url;
}
