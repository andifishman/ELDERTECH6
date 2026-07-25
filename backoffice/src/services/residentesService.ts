// ========================================
// SERVICIO: Residentes / Usuarios
// DESCRIPCIÓN:
// CRUD de residentes del geriátrico. El alta de un usuario
// nuevo (con acceso a la app) se hace vía Edge Function
// admin-usuarios, ya que crea también el usuario de auth
// (username + DNI como contraseña, sin email). Desactivar
// un residente le quita acceso a la app.
// ========================================
import { apiClient } from '@/lib/apiClient';
import type { ContactoResumen, Residente, SeccionResidente } from '@/types/database.types';

export interface ResidenteInput {
  nombre: string;
  apellido: string;
  seccion?: SeccionResidente | null;
  notas?: string | null;
}

export interface CrearUsuarioInput extends ResidenteInput {
  username: string;
  dni: string;
}

export type ResidenteConCuenta = Residente & { tiene_cuenta: boolean };

export async function listarResidentes(): Promise<ResidenteConCuenta[]> {
  return apiClient.get<ResidenteConCuenta[]>('/api/admin/residents');
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<{ id: string; username: string }> {
  return apiClient.post<{ id: string; username: string }>('/api/admin/residents', input);
}

export async function actualizarResidente(id: string, input: ResidenteInput): Promise<void> {
  await apiClient.patch<void>(`/api/admin/residents/${id}`, input);
}

export async function resetearPassword(residenteId: string, dni: string): Promise<void> {
  await apiClient.post<void>(`/api/admin/residents/${residenteId}/reset-password`, { dni });
}

export interface ResidenteDetalle {
  residente: Residente;
  mensajes: { id: string; contenido: string; created_at: string }[];
  intereses: { nombre: string; emoji: string | null }[];
  tutorialesCompletados: { titulo: string; thumbnail_url: string | null; completado_at: string | null }[];
  ciudadesClima: string[];
  contactos: ContactoResumen[];
}

export async function obtenerResidenteDetalle(id: string): Promise<ResidenteDetalle> {
  return apiClient.get<ResidenteDetalle>(`/api/admin/residents/${id}`);
}

export async function setActivoResidente(id: string, activo: boolean, nombre?: string): Promise<void> {
  await apiClient.patch<void>(`/api/admin/residents/${id}/active`, { activo, nombre });
}
