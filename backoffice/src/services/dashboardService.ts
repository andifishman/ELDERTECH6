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

export async function obtenerTutorialesMasVistos(limite = 6): Promise<{ titulo: string; vistas: number }[]> {
  return apiClient.get<{ titulo: string; vistas: number }[]>(`/api/admin/dashboard/tutorials-top?limite=${limite}`);
}

export async function obtenerActividadReciente(limite = 6): Promise<AuditLog[]> {
  return apiClient.get<AuditLog[]>(`/api/admin/dashboard/audit-recent?limite=${limite}`);
}

export async function obtenerActividadesPorCategoria(): Promise<{ nombre: string; total: number }[]> {
  return apiClient.get<{ nombre: string; total: number }[]>('/api/admin/dashboard/activities-by-category');
}
