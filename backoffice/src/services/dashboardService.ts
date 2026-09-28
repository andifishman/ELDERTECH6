import { apiClient } from '@/lib/apiClient';
import type { AuditLog, DashboardKpis } from '@/types/backoffice.types';
import type { ActividadCompleta, Residente } from '@/types/database.types';

export interface ResidenteConConexion extends Residente {
  ultima_conexion: string | null;
}

export async function obtenerKpis(): Promise<DashboardKpis> {
  return apiClient.get<DashboardKpis>('/api/admin/dashboard/kpis');
}

export async function obtenerActividadesHoy(): Promise<ActividadCompleta[]> {
  return apiClient.get<ActividadCompleta[]>('/api/admin/dashboard/activities-today');
}

export async function obtenerResidentesRecientes(limite = 5): Promise<ResidenteConConexion[]> {
  return apiClient.get<ResidenteConConexion[]>(`/api/admin/dashboard/residents-recent?limite=${limite}`);
}

export interface TutorialConVistas {
  id: string;
  titulo: string;
  formato: string;
  activo: boolean;
  categoria: string | null;
  vistas: number;
}

/** Sin `limite`, trae el listado completo (todos los tutoriales, publicados y borradores) — lo usa la
 * pantalla "Tutoriales vistos". Con `limite`, trae solo el top N — lo usa el gráfico del Dashboard. */
export async function obtenerTutorialesMasVistos(limite?: number): Promise<TutorialConVistas[]> {
  const query = typeof limite === 'number' ? `?limite=${limite}` : '';
  return apiClient.get<TutorialConVistas[]>(`/api/admin/dashboard/tutorials-top${query}`);
}

export async function obtenerActividadReciente(limite = 6): Promise<AuditLog[]> {
  return apiClient.get<AuditLog[]>(`/api/admin/dashboard/audit-recent?limite=${limite}`);
}

export async function obtenerActividadesPorCategoria(): Promise<{ nombre: string; total: number }[]> {
  return apiClient.get<{ nombre: string; total: number }[]>('/api/admin/dashboard/activities-by-category');
}
