// Servicio: Novedades — noticias de la residencia que publica el personal
// desde el backoffice. Habla con el backend propio, nunca con Supabase directo.
import { apiClient } from './apiClient';

export interface Novedad {
  id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  visible_hasta: string;
  created_at: string;
  /** true si este residente ya la abrió — las no leídas muestran el cartel "Nueva" */
  leida: boolean;
}

/** Novedades vigentes para este residente, de la más nueva a la más vieja. */
export async function listarNovedades(): Promise<Novedad[]> {
  return apiClient.get<Novedad[]>('/api/novedades');
}

export async function marcarNovedadLeida(id: string): Promise<void> {
  await apiClient.post<void>(`/api/novedades/${id}/leida`);
}
