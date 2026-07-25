// Servicio: Pedidos y Sugerencias — habla con el backend propio (nunca con Supabase directo).
import { apiClient } from './apiClient';

export type TipoPedido = 'pedido' | 'comentario' | 'sugerencia' | 'actividad_propuesta' | 'recomendacion_pelicula';
export type EstadoPedido = 'pendiente' | 'en_proceso' | 'resuelta';

export interface PedidoSugerencia {
  id: string;
  tipo: TipoPedido;
  titulo: string;
  descripcion: string | null;
  audio_url: string | null;
  transcripcion: string | null;
  estado: EstadoPedido;
  created_at: string;
}

export interface EnviarPedidoInput {
  tipo: TipoPedido;
  titulo: string;
  descripcion?: string;
  audioUri?: string | null;
  duracionSegundos?: number;
}

export async function listarPedidos(): Promise<PedidoSugerencia[]> {
  return apiClient.get<PedidoSugerencia[]>('/api/requests');
}

export async function enviarPedido(input: EnviarPedidoInput): Promise<PedidoSugerencia> {
  const form = new FormData();
  form.append('tipo', input.tipo);
  form.append('titulo', input.titulo);
  if (input.descripcion) form.append('descripcion', input.descripcion);
  if (input.duracionSegundos != null) form.append('duracionSegundos', String(input.duracionSegundos));
  if (input.audioUri) {
    form.append('audio', { uri: input.audioUri, type: 'audio/m4a', name: 'audio.m4a' } as unknown as Blob);
  }
  return apiClient.postForm<PedidoSugerencia>('/api/requests', form);
}
