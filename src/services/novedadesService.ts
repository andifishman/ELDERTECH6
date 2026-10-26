// Servicio: Novedades — noticias de la residencia que publica el personal
// desde el backoffice. Habla con el backend propio, nunca con Supabase directo.
import { apiClient } from './apiClient';

/** Clave de una categoría fija, o el id de una que creó la residencia desde el backoffice. */
export type CategoriaNovedad = string;

export interface Novedad {
  id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  visible_hasta: string;
  created_at: string;
  /** Cuándo se publicó (o empezó a verse, si estaba programada) */
  publicar_en: string;
  /** Las fijadas van primero en la lista */
  fijada: boolean;
  categoria: CategoriaNovedad;
  /** Nombre y emoji de la categoría, ya resueltos por el backend (sirven también para las propias). */
  categoria_nombre?: string;
  categoria_emoji?: string;
  /** Si es de un evento, cuándo es */
  fecha_evento: string | null;
  /** true si este residente ya la abrió — las no leídas muestran el cartel "Nueva" */
  leida: boolean;
}

/** Novedades vigentes para este residente, las fijadas primero y después de la más nueva a la más vieja. */
export async function listarNovedades(): Promise<Novedad[]> {
  return apiClient.get<Novedad[]>('/api/novedades');
}

export async function marcarNovedadLeida(id: string): Promise<void> {
  await apiClient.post<void>(`/api/novedades/${id}/leida`);
}
