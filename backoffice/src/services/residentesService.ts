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
import type { ContactoResumen, Residente, SeccionResidente, TipoCelular } from '@/types/database.types';

export interface ResidenteInput {
  nombre: string;
  apellido: string;
  seccion?: SeccionResidente | null;
  notas?: string | null;
  // Nombre para mostrar en Hablemos (búsqueda, chat, notificaciones) en vez de
  // "nombre apellido" — opcional.
  nombre_completo?: string | null;
  // Con qué dispositivo se filtran los tutoriales que ve este residente.
  tipo_celular?: TipoCelular;
  // Puesto del empleado (solo sección EMPLEADO LEDOR VADOR).
  rol_empleado?: string | null;
  // IDs del catálogo de intereses — si viene, reemplaza los del usuario.
  intereses?: string[];
}

export interface CrearUsuarioInput extends ResidenteInput {
  username: string;
  dni: string;
}

export type ResidenteConCuenta = Residente & { tiene_cuenta: boolean; intereses_ids: string[] };

export async function listarResidentes(): Promise<ResidenteConCuenta[]> {
  return apiClient.get<ResidenteConCuenta[]>('/api/admin/residents');
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<{ id: string; username: string }> {
  return apiClient.post<{ id: string; username: string }>('/api/admin/residents', input);
}

export async function actualizarResidente(id: string, input: ResidenteInput): Promise<void> {
  await apiClient.patch<void>(`/api/admin/residents/${id}`, input);
}

export async function eliminarResidente(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/admin/residents/${id}`);
}

export async function resetearPassword(residenteId: string, dni: string): Promise<void> {
  await apiClient.post<void>(`/api/admin/residents/${residenteId}/reset-password`, { dni });
}

export interface ResumenJuego {
  juego: string;
  partidas: number;
  ganadas: number;
  perdidas: number;
  mejorPuntaje: number | null;
  ultimaPartida: string | null;
}

export interface ResidenteDetalle {
  residente: Residente;
  mensajes: { id: string; contenido: string; created_at: string }[];
  intereses: { id: string; nombre: string; emoji: string | null }[];
  tutoriales: { titulo: string; thumbnail_url: string | null; completado: boolean; favorito: boolean; ultima_vista: string | null }[];
  sugerencias: { id: string; tipo: string; titulo: string; estado: string; created_at: string }[];
  agenda: { id: string; titulo: string; fecha: string; hora: string; estado: string }[];
  progresoNiveles: { jardin: { niveles: number; estrellas: number }; palabras: { niveles: number; nivelMaximo: number } };
  hablemosMensajesEnviados: number;
  ciudadesClima: string[];
  contactos: ContactoResumen[];
  juegos: ResumenJuego[];
  dispositivoDetectado: { modelo: string | null; plataforma: string; ultimaConexion: string } | null;
}

export async function obtenerResidenteDetalle(id: string): Promise<ResidenteDetalle> {
  return apiClient.get<ResidenteDetalle>(`/api/admin/residents/${id}`);
}

export async function setActivoResidente(id: string, activo: boolean, nombre?: string): Promise<void> {
  await apiClient.patch<void>(`/api/admin/residents/${id}/active`, { activo, nombre });
}
