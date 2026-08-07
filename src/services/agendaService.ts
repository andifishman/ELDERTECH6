// Servicio: Agenda — recordatorios personales. Habla con el backend propio
// (nunca con Supabase directo) para todo lo que sea lectura/escritura de datos.
import { apiClient } from './apiClient';

export type EstadoRecordatorio = 'pendiente' | 'realizado' | 'vencido' | 'cancelado';

export interface Recordatorio {
  id: string;
  residente_id: string;
  organizacion_id: string;
  creado_por: string;
  titulo: string;
  fecha: string;
  hora: string;
  estado: EstadoRecordatorio;
  completado_en: string | null;
  notificacion_enviada: boolean;
  notificacion_enviada_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordatorioInput {
  titulo: string;
  fecha: string;
  hora: string;
}

export interface ListarRecordatoriosOpciones {
  desde?: string;
  hasta?: string;
  estado?: EstadoRecordatorio;
}

function buildQuery(params: object): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v !== '') usp.set(k, v);
    else if (typeof v === 'number') usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export async function listarRecordatorios(opciones: ListarRecordatoriosOpciones = {}): Promise<Recordatorio[]> {
  return apiClient.get<Recordatorio[]>(`/api/agenda${buildQuery(opciones)}`);
}

export async function obtenerRecordatorio(id: string): Promise<Recordatorio> {
  return apiClient.get<Recordatorio>(`/api/agenda/${id}`);
}

export async function crearRecordatorio(input: RecordatorioInput): Promise<Recordatorio> {
  return apiClient.post<Recordatorio>('/api/agenda', input);
}

export async function editarRecordatorio(id: string, input: Partial<RecordatorioInput>): Promise<Recordatorio> {
  return apiClient.patch<Recordatorio>(`/api/agenda/${id}`, input);
}

export async function eliminarRecordatorio(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/agenda/${id}`);
}

export async function cambiarEstadoRecordatorio(id: string, estado: 'pendiente' | 'realizado' | 'cancelado'): Promise<Recordatorio> {
  return apiClient.patch<Recordatorio>(`/api/agenda/${id}/estado`, { estado });
}

export async function agendaDeHoy(): Promise<Recordatorio[]> {
  return apiClient.get<Recordatorio[]>('/api/agenda/today');
}

export async function agendaDeLaSemana(fecha?: string): Promise<Recordatorio[]> {
  return apiClient.get<Recordatorio[]>(`/api/agenda/week${buildQuery({ fecha })}`);
}

export async function agendaDelMes(fecha?: string): Promise<Recordatorio[]> {
  return apiClient.get<Recordatorio[]>(`/api/agenda/month${buildQuery({ fecha })}`);
}

export async function proximosRecordatorios(limit = 10): Promise<Recordatorio[]> {
  return apiClient.get<Recordatorio[]>(`/api/agenda/upcoming${buildQuery({ limit })}`);
}
