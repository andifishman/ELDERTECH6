// ========================================
// SERVICIO: Pedidos y Sugerencias
// ========================================
import { apiClient } from '@/lib/apiClient';

export type TipoPedido = 'pedido' | 'comentario' | 'sugerencia' | 'actividad_propuesta' | 'recomendacion_pelicula';
export type EstadoPedido = 'pendiente' | 'en_proceso' | 'resuelta';
export type TranscripcionEstado = 'pendiente' | 'completada' | 'fallida';

export interface ResidenteResumenPedido {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
  seccion: string | null;
}

export interface PedidoSugerencia {
  id: string;
  organizacion_id: string;
  residente_id: string;
  tipo: TipoPedido;
  titulo: string;
  descripcion: string | null;
  audio_url: string | null;
  audio_duracion_segundos: number | null;
  transcripcion: string | null;
  transcripcion_estado: TranscripcionEstado | null;
  estado: EstadoPedido;
  resuelto_por: string | null;
  resuelto_en: string | null;
  created_at: string;
  updated_at: string;
  residente: ResidenteResumenPedido | null;
}

export interface ListarPedidosFiltros {
  estado?: EstadoPedido | 'todos';
  tipo?: TipoPedido | 'todos';
  seccion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  ordenar?: 'recientes' | 'antiguos' | 'usuario_asc' | 'usuario_desc';
}

function buildQuery(filtros: ListarPedidosFiltros): string {
  const params = new URLSearchParams();
  if (filtros.estado && filtros.estado !== 'todos') params.set('estado', filtros.estado);
  if (filtros.tipo && filtros.tipo !== 'todos') params.set('tipo', filtros.tipo);
  if (filtros.seccion) params.set('seccion', filtros.seccion);
  if (filtros.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
  if (filtros.ordenar) params.set('ordenar', filtros.ordenar);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listarPedidos(filtros: ListarPedidosFiltros): Promise<PedidoSugerencia[]> {
  return apiClient.get<PedidoSugerencia[]>(`/api/admin/requests${buildQuery(filtros)}`);
}

export async function obtenerPedido(id: string): Promise<PedidoSugerencia> {
  return apiClient.get<PedidoSugerencia>(`/api/admin/requests/${id}`);
}

export async function actualizarEstadoPedido(id: string, estado: EstadoPedido): Promise<void> {
  await apiClient.patch<void>(`/api/admin/requests/${id}/status`, { estado });
}

export async function eliminarPedido(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/admin/requests/${id}`);
}

export async function reintentarTranscripcion(id: string): Promise<PedidoSugerencia> {
  return apiClient.post<PedidoSugerencia>(`/api/admin/requests/${id}/retry-transcription`);
}
