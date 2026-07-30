// ========================================
// SERVICIO: Notificaciones
// ========================================
import { apiClient } from '@/lib/apiClient';

export type TipoNotificacion = 'informacion' | 'importante' | 'recordatorio' | 'urgente' | 'actividad' | 'tutorial' | 'general';
export type DestinoTipo = 'todos' | 'residentes' | 'especificos' | 'seccion' | 'habitacion' | 'intereses' | 'nivel_dificultad';
export type ProgramacionTipo = 'instantanea' | 'programada';
export type Recurrencia = 'ninguna' | 'diaria' | 'semanal' | 'mensual';
export type EstadoNotificacion = 'borrador' | 'programada' | 'enviando' | 'enviada' | 'fallida' | 'cancelada';
export type PrioridadNotificacion = 'alta' | 'normal' | 'baja';
export type EstadoDestinatario = 'pendiente' | 'enviado' | 'entregado' | 'fallido' | 'abierto';

export interface DestinoFiltro {
  seccion?: string;
  habitacion?: string;
  nivel_dificultad?: string;
  interes_ids?: string[];
  residente_ids?: string[];
}

export interface Notificacion {
  id: string;
  organizacion_id: string;
  titulo: string;
  mensaje: string;
  imagen_url: string | null;
  icono: string | null;
  tipo: TipoNotificacion;
  destino_tipo: DestinoTipo;
  destino_filtro: DestinoFiltro | null;
  excluir_residente_ids: string[] | null;
  incluir_residente_ids: string[] | null;
  programacion_tipo: ProgramacionTipo;
  programada_para: string | null;
  recurrencia: Recurrencia;
  estado: EstadoNotificacion;
  silenciosa: boolean;
  sonido: boolean;
  vibracion: boolean;
  prioridad: PrioridadNotificacion;
  pantalla_destino: string | null;
  actividad_id: string | null;
  creado_por: string | null;
  enviado_por: string | null;
  enviada_en: string | null;
  cancelada_en: string | null;
  created_at: string;
  updated_at: string;
  destinatarios_count: number;
}

export interface NotificacionInput {
  titulo: string;
  mensaje: string;
  imagen_url?: string | null;
  icono?: string | null;
  tipo: TipoNotificacion;
  destino_tipo: DestinoTipo;
  destino_filtro?: DestinoFiltro | null;
  excluir_residente_ids?: string[] | null;
  incluir_residente_ids?: string[] | null;
  programacion_tipo: ProgramacionTipo;
  programada_para?: string | null;
  recurrencia?: Recurrencia;
  silenciosa?: boolean;
  sonido?: boolean;
  vibracion?: boolean;
  prioridad?: PrioridadNotificacion;
  pantalla_destino?: string | null;
}

export interface ListarFiltros {
  estado?: EstadoNotificacion;
  busqueda?: string;
  orden?: 'recientes' | 'antiguas';
  pagina: number;
  porPagina: number;
}

export interface ListarResultado {
  items: Notificacion[];
  total: number;
}

export async function listarNotificaciones(filtros: ListarFiltros): Promise<ListarResultado> {
  const params = new URLSearchParams();
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
  if (filtros.orden) params.set('orden', filtros.orden);
  params.set('pagina', String(filtros.pagina));
  params.set('porPagina', String(filtros.porPagina));
  return apiClient.get<ListarResultado>(`/api/admin/notifications?${params.toString()}`);
}

export interface RecipientStats {
  alcanzados: number;
  enviados: number;
  entregados: number;
  abiertos: number;
  fallidos: number;
  pendientes: number;
}

export async function obtenerNotificacion(id: string): Promise<{ notification: Notificacion; stats: RecipientStats }> {
  return apiClient.get(`/api/admin/notifications/${id}`);
}

export interface DestinatarioDetalle {
  id: string;
  residente_id: string;
  estado: EstadoDestinatario;
  error_mensaje: string | null;
  enviado_en: string | null;
  entregado_en: string | null;
  abierto_en: string | null;
  residente: { id: string; nombre: string; apellido: string } | null;
}

export async function listarDestinatarios(id: string): Promise<DestinatarioDetalle[]> {
  return apiClient.get(`/api/admin/notifications/${id}/recipients`);
}

export interface NotificationLog {
  id: string;
  accion: string;
  descripcion: string | null;
  created_at: string;
}

export async function listarLogs(id: string): Promise<NotificationLog[]> {
  return apiClient.get(`/api/admin/notifications/${id}/logs`);
}

export async function previsualizarAudiencia(
  destinoTipo: DestinoTipo,
  destinoFiltro: DestinoFiltro | null,
  excluirResidenteIds: string[] | null,
  incluirResidenteIds?: string[] | null,
): Promise<{ total: number; ids: string[]; muestra: Array<{ id: string; nombre: string; apellido: string }> }> {
  return apiClient.post('/api/admin/notifications/preview-audience', {
    destino_tipo: destinoTipo,
    destino_filtro: destinoFiltro,
    excluir_residente_ids: excluirResidenteIds,
    incluir_residente_ids: incluirResidenteIds,
  });
}

export type AccionCreacion = 'borrador' | 'enviar' | 'programar';

export async function crearNotificacion(notificacion: NotificacionInput, accion: AccionCreacion): Promise<Notificacion> {
  return apiClient.post('/api/admin/notifications', { notificacion, accion });
}

export async function actualizarNotificacion(id: string, input: Partial<NotificacionInput>): Promise<Notificacion> {
  return apiClient.patch(`/api/admin/notifications/${id}`, input);
}

export async function eliminarNotificacion(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/notifications/${id}`);
}

export async function enviarAhora(id: string): Promise<Notificacion> {
  return apiClient.post(`/api/admin/notifications/${id}/send`);
}

export async function programarNotificacion(id: string, programadaPara: string, recurrencia?: Recurrencia): Promise<Notificacion> {
  return apiClient.post(`/api/admin/notifications/${id}/schedule`, { programada_para: programadaPara, recurrencia });
}

export async function cancelarProgramacion(id: string): Promise<void> {
  await apiClient.post(`/api/admin/notifications/${id}/cancel`);
}

export async function reenviarNotificacion(id: string): Promise<Notificacion> {
  return apiClient.post(`/api/admin/notifications/${id}/resend`);
}

export async function duplicarNotificacion(id: string): Promise<Notificacion> {
  return apiClient.post(`/api/admin/notifications/${id}/duplicate`);
}
