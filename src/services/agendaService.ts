// Servicio: Agenda — recordatorios personales. Habla con el backend propio
// (nunca con Supabase directo) para todo lo que sea lectura/escritura de datos.
import { apiClient } from './apiClient';

export type PrioridadRecordatorio = 'baja' | 'media' | 'alta' | 'urgente';
export type EstadoRecordatorio = 'pendiente' | 'realizado' | 'vencido' | 'cancelado';
export type TipoContenidoRecordatorio = 'texto' | 'audio' | 'ambos';
export type OrigenRecordatorio = 'manual' | 'rapido' | 'horarios';
export type RecurrenciaTipo = 'ninguna' | 'diaria' | 'laborables' | 'semanal' | 'mensual' | 'anual' | 'personalizada';
export type OffsetNotificacion = 0 | 10 | 30 | 60 | 1440;

export interface Recordatorio {
  id: string;
  residente_id: string;
  organizacion_id: string;
  creado_por: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string | null;
  prioridad: PrioridadRecordatorio;
  color: string | null;
  icono: string | null;
  estado: EstadoRecordatorio;
  completado_en: string | null;
  tipo_contenido: TipoContenidoRecordatorio;
  audio_url: string | null;
  audio_transcripcion: string | null;
  audio_duracion_segundos: number | null;
  recordatorio_offset_minutos: OffsetNotificacion | null;
  notificacion_enviada: boolean;
  origen: OrigenRecordatorio;
  actividad_origen_id: string | null;
  serie_id: string | null;
  es_plantilla: boolean;
  recurrencia_tipo: RecurrenciaTipo;
  recurrencia_dias_semana: number[] | null;
  recurrencia_hasta: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordatorioInput {
  titulo: string;
  descripcion?: string | null;
  fecha: string;
  hora?: string | null;
  prioridad: PrioridadRecordatorio;
  color?: string | null;
  icono?: string | null;
  recordatorio_offset_minutos?: OffsetNotificacion | null;
  origen?: 'manual' | 'rapido';
  recurrencia_tipo?: RecurrenciaTipo;
  recurrencia_dias_semana?: number[] | null;
  recurrencia_hasta?: string | null;
  audio_url?: string | null;
  audio_transcripcion?: string | null;
  audio_duracion_segundos?: number | null;
}

export interface ListarRecordatoriosOpciones {
  desde?: string;
  hasta?: string;
  estado?: EstadoRecordatorio;
  q?: string;
}

export interface AudioSubidoResultado {
  audio_url: string;
  audio_transcripcion: string | null;
  audio_duracion_segundos: number | null;
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

export async function subirAudioRecordatorio(audioUri: string, duracionSegundos: number): Promise<AudioSubidoResultado> {
  const form = new FormData();
  form.append('duracionSegundos', String(duracionSegundos));
  form.append('audio', { uri: audioUri, type: 'audio/m4a', name: 'audio.m4a' } as unknown as Blob);
  return apiClient.postForm<AudioSubidoResultado>('/api/agenda/audio', form);
}

export async function importarDeHorario(actividadId: string): Promise<Recordatorio> {
  return apiClient.post<Recordatorio>('/api/agenda/importar-horario', { actividadId });
}
