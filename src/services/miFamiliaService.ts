// Servicio: Mi familia — los mensajes entre el residente y los familiares que la residencia vinculó.
// Habla con el backend propio (nunca con Supabase directo). El residente lee y contesta; el familiar
// escribe desde la app de familiares (carpeta `familia/`).
import { apiClient } from './apiClient';

export interface ConversacionFamilia {
  vinculoId: string;
  /** Nombre y apellido del familiar */
  familiar: string;
  parentesco: string | null;
  ultimoMensaje: { autor: 'familiar' | 'residente'; vistaPrevia: string; creadoEn: string } | null;
  sinLeer: number;
}

export interface MensajeFamilia {
  id: string;
  autor: 'familiar' | 'residente';
  contenido: string | null;
  imagenUrl: string | null;
  leido: boolean;
  creadoEn: string;
}

export async function listarConversacionesFamilia(): Promise<ConversacionFamilia[]> {
  return apiClient.get<ConversacionFamilia[]>('/api/mi-familia/conversaciones');
}

/** Al pedir los mensajes el backend marca como leídos los del familiar. */
export async function listarMensajesFamilia(vinculoId: string): Promise<MensajeFamilia[]> {
  return apiClient.get<MensajeFamilia[]>(`/api/mi-familia/conversaciones/${vinculoId}/mensajes`);
}

export async function responderFamilia(vinculoId: string, contenido: string): Promise<MensajeFamilia> {
  return apiClient.post<MensajeFamilia>(`/api/mi-familia/conversaciones/${vinculoId}/mensajes`, { contenido });
}
