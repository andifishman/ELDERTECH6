// ========================================
// SERVICIO: Actividades (Horarios)
// ========================================
import { apiClient } from '@/lib/apiClient';
import type { ActividadCompleta, PatronRecurrencia } from '@/types/database.types';

export interface ResidenteOverrideInput {
  residente_id: string;
  incluido: boolean;
}

export interface ActividadInput {
  nombre: string;
  descripcion?: string | null;
  tipo_actividad_id?: string | null;
  ubicacion_id?: string | null;
  responsable_id?: string | null;
  emoji_icono?: string | null;
  fecha: string; // 'YYYY-MM-DD' — fecha de inicio (o fecha de la ocurrencia en edición)
  hora_inicio: string; // 'HH:MM'
  hora_fin?: string | null;
  es_recurrente: boolean;
  patron_recurrencia?: PatronRecurrencia | null;
  secciones_objetivo?: string[] | null;
  residentesOverride?: ResidenteOverrideInput[];
  notificar_al_crear?: boolean;
  recordatorio_minutos_antes?: number | null;
}

// Extrae el mensaje de un error (ApiError extiende Error)
export function extraerMensajeError(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return undefined;
}

// Lista actividades de una fecha (o todas si no se pasa fecha).
export async function listarActividades(fecha?: string): Promise<ActividadCompleta[]> {
  const query = fecha ? `?fecha=${fecha}` : '';
  return apiClient.get<ActividadCompleta[]>(`/api/admin/activities${query}`);
}

export async function crearActividad(input: ActividadInput): Promise<string> {
  const { id } = await apiClient.post<{ id: string }>('/api/admin/activities', input);
  return id;
}

export async function actualizarActividad(id: string, input: ActividadInput): Promise<void> {
  await apiClient.patch<void>(`/api/admin/activities/${id}`, input);
}

export async function setActivoActividad(id: string, activo: boolean, nombre?: string): Promise<void> {
  await apiClient.patch<void>(`/api/admin/activities/${id}/active`, { activo, nombre });
}

export async function eliminarActividad(id: string, nombre?: string): Promise<void> {
  const query = nombre ? `?nombre=${encodeURIComponent(nombre)}` : '';
  await apiClient.delete<void>(`/api/admin/activities/${id}${query}`);
}

export async function obtenerActividad(id: string): Promise<ActividadCompleta | null> {
  return apiClient.get<ActividadCompleta>(`/api/admin/activities/${id}`);
}
