import { HttpError } from '../../middlewares/errorHandler';
import * as repo from '../../repositories/assistantRepository';
import * as chat from './AssistantChatService';
import type { MensajeContexto, RespuestaAsistente } from './types';

export async function crearSesion(residenteId: string): Promise<repo.SesionAsistente> {
  return repo.crearSesion(residenteId);
}

export async function getSesiones(residenteId: string, limit?: number): Promise<repo.SesionAsistente[]> {
  return repo.getSesionesRecientes(residenteId, limit);
}

export async function actualizarTituloSesion(residenteId: string, sesionId: string, titulo: string): Promise<void> {
  if (!(await repo.sesionPerteneceAResidente(sesionId, residenteId))) {
    throw new HttpError(404, 'Sesión no encontrada.');
  }
  await repo.actualizarTituloSesion(sesionId, titulo);
}

/** Solo genera el título con IA — no lo persiste (el cliente decide cuándo, igual que antes). */
export async function generarTituloSesion(primerMensaje: string): Promise<string> {
  return chat.generarTituloSesion(primerMensaje);
}

export async function getMensajes(residenteId: string, sesionId: string): Promise<repo.MensajeAsistente[]> {
  if (!(await repo.sesionPerteneceAResidente(sesionId, residenteId))) {
    throw new HttpError(404, 'Sesión no encontrada.');
  }
  return repo.getMensajesDeSesion(sesionId);
}

export async function getMensajesFavoritos(residenteId: string): Promise<repo.MensajeAsistente[]> {
  return repo.getMensajesFavoritos(residenteId);
}

export async function guardarMensaje(
  residenteId: string,
  sesionId: string,
  rol: 'usuario' | 'asistente',
  contenido: string,
): Promise<repo.MensajeAsistente> {
  if (!(await repo.sesionPerteneceAResidente(sesionId, residenteId))) {
    throw new HttpError(404, 'Sesión no encontrada.');
  }
  return repo.guardarMensaje(sesionId, residenteId, rol, contenido);
}

export async function toggleFavorito(residenteId: string, mensajeId: string, esFavorito: boolean): Promise<void> {
  if (!(await repo.mensajePerteneceAResidente(mensajeId, residenteId))) {
    throw new HttpError(404, 'Mensaje no encontrado.');
  }
  await repo.toggleFavoritoMensaje(mensajeId, esFavorito);
}

export async function getFaq(): Promise<repo.FaqAsistente[]> {
  return repo.getFaq();
}

export async function transcribir(audioBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
  return chat.transcribirAudio(audioBuffer, filename, mimeType);
}

/**
 * Solo la respuesta de la IA — NO persiste nada. El cliente persiste el
 * mensaje del usuario y el de la IA por separado (con sus propios timeouts
 * y fallback a mensaje local si Supabase está lento), igual que hacía antes
 * contra Supabase/Groq directo. Acá solo cambia a quién le pega: a este
 * backend en vez de a Groq con la key expuesta.
 */
export async function consultarIA(
  organizacionId: string | null,
  mensajeUsuario: string,
  historial: MensajeContexto[],
): Promise<RespuestaAsistente> {
  return chat.consultarIA(organizacionId, mensajeUsuario, historial);
}
