import { apiClient } from '@/lib/apiClient';
import type { Faq } from '@/types/backoffice.types';

export interface FaqInput {
  pregunta: string;
  categoria?: string | null;
  emoji?: string | null;
  activo: boolean;
}

export async function listarFaqs(): Promise<Faq[]> {
  return apiClient.get<Faq[]>('/api/admin/assistant/faq');
}

export async function crearFaq(input: FaqInput): Promise<string> {
  const { id } = await apiClient.post<{ id: string }>('/api/admin/assistant/faq', input);
  return id;
}

export async function actualizarFaq(id: string, input: FaqInput): Promise<void> {
  await apiClient.patch<void>(`/api/admin/assistant/faq/${id}`, input);
}

export async function eliminarFaq(id: string, pregunta?: string): Promise<void> {
  const query = pregunta ? `?pregunta=${encodeURIComponent(pregunta)}` : '';
  await apiClient.delete<void>(`/api/admin/assistant/faq/${id}${query}`);
}

export async function reordenarFaq(faqs: { id: string; orden: number }[]): Promise<void> {
  await apiClient.post<void>('/api/admin/assistant/faq/reorder', { faqs });
}

export interface MensajeHistorial {
  id: string;
  contenido: string;
  created_at: string;
  residente_nombre: string | null;
  residente_apellido: string | null;
}

export async function obtenerHistorialMensajes(limite = 50): Promise<MensajeHistorial[]> {
  return apiClient.get<MensajeHistorial[]>(`/api/admin/assistant/history?limite=${limite}`);
}

export interface AsistenteStats {
  totalConsultas: number;
  sesionesHoy: number;
  topPreguntas: { pregunta: string; total: number }[];
}

export async function obtenerStatsAsistente(): Promise<AsistenteStats> {
  return apiClient.get<AsistenteStats>('/api/admin/assistant/stats');
}
