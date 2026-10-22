// ========================================
// SERVICIO: Novedades
// DESCRIPCIÓN:
// Noticias de la residencia que ven los residentes en el botón
// "Novedades" de la app. Cada una dura un mes publicada; puede ir a
// todos o solo a algunos grupos, y opcionalmente manda un aviso al
// celular (se registra como una notificación más).
// ========================================
import { apiClient } from '@/lib/apiClient';
import { optimizarImagen } from './articulosService';

export interface Novedad {
  id: string;
  organizacion_id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  /** null = para todos los residentes */
  grupo_ids: string[] | null;
  visible_hasta: string;
  notificacion_id: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovedadConLecturas extends Novedad {
  cantidad_lecturas: number;
}

export interface PublicarNovedadInput {
  titulo: string;
  texto: string;
  imagenUrl: string | null;
  /** Vacío = para todos los residentes */
  grupoIds: string[];
  notificar: boolean;
}

export interface EditarNovedadInput {
  titulo?: string;
  texto?: string;
  imagenUrl?: string | null;
}

export async function listarNovedades(): Promise<NovedadConLecturas[]> {
  return apiClient.get<NovedadConLecturas[]>('/api/admin/novedades');
}

export async function obtenerNovedad(id: string): Promise<Novedad> {
  return apiClient.get<Novedad>(`/api/admin/novedades/${id}`);
}

export async function publicarNovedad(input: PublicarNovedadInput): Promise<Novedad> {
  return apiClient.post<Novedad>('/api/admin/novedades', input);
}

export async function editarNovedad(id: string, input: EditarNovedadInput): Promise<Novedad> {
  return apiClient.patch<Novedad>(`/api/admin/novedades/${id}`, input);
}

export async function eliminarNovedad(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/admin/novedades/${id}`);
}

/** Achica la foto y la sube; devuelve la URL pública. */
export async function subirFotoNovedad(archivo: File): Promise<string> {
  const form = new FormData();
  form.append('archivo', await optimizarImagen(archivo));
  const { url } = await apiClient.postForm<{ url: string }>('/api/admin/novedades/images', form);
  return url;
}
