// ========================================
// SERVICIO: Grupos
// DESCRIPCIÓN:
// Agrupan residentes (por sección o a mano) para usarlos como destinatarios
// en notificaciones y otras funciones. Los grupos de sección (tipo='seccion')
// se mantienen sincronizados solos — no se crean, editan ni eliminan acá.
// ========================================
import { apiClient } from '@/lib/apiClient';

export type TipoGrupo = 'seccion' | 'personalizado';

export interface Grupo {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoGrupo;
  seccion: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrupoConCantidad extends Grupo {
  cantidad_residentes: number;
}

export interface ResidenteDeGrupo {
  id: string;
  nombre: string;
  apellido: string;
  seccion: string | null;
  habitacion: string | null;
  activo: boolean;
}

export interface GrupoDetalle {
  grupo: Grupo;
  miembros: ResidenteDeGrupo[];
}

export async function listarGrupos(): Promise<GrupoConCantidad[]> {
  return apiClient.get<GrupoConCantidad[]>('/api/admin/grupos');
}

export async function obtenerGrupo(id: string): Promise<GrupoDetalle> {
  return apiClient.get<GrupoDetalle>(`/api/admin/grupos/${id}`);
}

export async function residentesDisponibles(grupoId: string): Promise<ResidenteDeGrupo[]> {
  return apiClient.get<ResidenteDeGrupo[]>(`/api/admin/grupos/${grupoId}/disponibles`);
}

export async function crearGrupo(input: { nombre: string; descripcion?: string | null; residenteIds: string[] }): Promise<Grupo> {
  return apiClient.post<Grupo>('/api/admin/grupos', input);
}

export async function actualizarGrupo(id: string, input: { nombre?: string; descripcion?: string | null }): Promise<Grupo> {
  return apiClient.patch<Grupo>(`/api/admin/grupos/${id}`, input);
}

export async function eliminarGrupo(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/admin/grupos/${id}`);
}

export async function agregarMiembros(grupoId: string, residenteIds: string[]): Promise<void> {
  await apiClient.post<void>(`/api/admin/grupos/${grupoId}/miembros`, { residenteIds });
}

export async function quitarMiembro(grupoId: string, residenteId: string): Promise<void> {
  await apiClient.delete<void>(`/api/admin/grupos/${grupoId}/miembros/${residenteId}`);
}
