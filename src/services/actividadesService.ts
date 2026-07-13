// Servicio de Actividades/Horarios — habla con nuestro backend (eldertech-api),
// nunca directo con Supabase. El algoritmo de visibilidad por sección +
// excepciones vive ahora server-side.
import { apiClient } from './apiClient';
import type { ActividadCompleta, ActividadConPrioridad } from '@/types/database.types';
import { toSupabaseDate } from '@/utils/dateUtils';

/**
 * Actividades del día sin personalizar — solo se usa como fallback cuando
 * todavía no hay un residente vinculado a la sesión. El backend resuelve la
 * organización a partir del residente autenticado, así que sin residente
 * no hay forma de saber qué organización mostrar (antes se resolvía con un
 * ORG_ID fijo del .env — ya no existe ese atajo del lado del cliente).
 */
export async function getActividadesPorFecha(fecha: Date): Promise<ActividadCompleta[]> {
  return apiClient.get<ActividadCompleta[]>(`/api/activities?fecha=${toSupabaseDate(fecha)}`);
}

export async function getActividadesPersonalizadas(
  fecha: Date,
  _residenteId: string,
  _miSeccion: string | null,
): Promise<ActividadConPrioridad[]> {
  // residenteId/miSeccion se ignoran acá — el backend los resuelve del token de sesión.
  return apiClient.get<ActividadConPrioridad[]>(`/api/activities?fecha=${toSupabaseDate(fecha)}`);
}

export async function getActividadById(id: string): Promise<ActividadCompleta | null> {
  return apiClient.get<ActividadCompleta>(`/api/activities/${id}`);
}
