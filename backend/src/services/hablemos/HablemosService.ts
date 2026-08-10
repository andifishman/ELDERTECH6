import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { requireResidenteContext } from '../../utils/validators';
import * as repo from '../../repositories/hablemosRepository';
import * as residentsService from '../residents/ResidentsService';
import * as deviceTokensService from '../notifications/DeviceTokensService';
import { sendPushMessages } from '../../providers/notifications/ExpoPushProvider';
import { logger } from '../../logging/logger';
import type {
  ConversacionConDetalle,
  ListarMensajesOpciones,
  MensajeHablemos,
} from '../../providers/hablemos/HablemosTypes';
import type { ResidenteBusquedaResumen } from '../../repositories/residentsRepository';

const LIMITE_MENSAJES_DEFAULT = 30;

/** Módulo "Hablemos" — mensajería 1:1 entre residentes de la misma organización. */

async function validarOtroResidente(organizacionId: string, residenteId: string, otroResidenteId: string): Promise<void> {
  if (otroResidenteId === residenteId) {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'No podés iniciar una conversación con vos mismo.');
  }
  // Service→Service: nunca se consulta residentsRepository directo desde acá.
  const contexto = await residentsService.getResidenteContext(otroResidenteId);
  if (!contexto.organizacionId || contexto.organizacionId !== organizacionId) {
    throw new HttpError(StatusCodes.NOT_FOUND, 'No se encontró el residente.');
  }
}

export async function buscarResidentes(user: AuthUser, query: string): Promise<ResidenteBusquedaResumen[]> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  return residentsService.buscarPorNombre(organizacionId, query, residenteId);
}

/** Devuelve la conversación existente entre el usuario y `otroResidenteId`, o crea una nueva. */
export async function iniciarConversacion(user: AuthUser, otroResidenteId: string): Promise<ConversacionConDetalle> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  await validarOtroResidente(organizacionId, residenteId, otroResidenteId);

  let conversacion = await repo.buscarConversacionEntreResidentes(residenteId, otroResidenteId);
  if (!conversacion) {
    conversacion = await repo.crearConversacion(organizacionId, residenteId, otroResidenteId);
  }

  const detalle = await repo.obtenerConversacionConDetalle(conversacion.id, residenteId);
  if (!detalle) throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'No se pudo iniciar la conversación.');
  return detalle;
}

export async function listarConversaciones(user: AuthUser): Promise<ConversacionConDetalle[]> {
  const { residenteId } = requireResidenteContext(user);
  return repo.listarConversaciones(residenteId);
}

async function requireParticipante(residenteId: string, conversacionId: string) {
  const conversacion = await repo.obtenerConversacionSiParticipa(conversacionId, residenteId);
  if (!conversacion) throw new HttpError(StatusCodes.NOT_FOUND, 'No se encontró la conversación.');
  return conversacion;
}

export async function listarMensajes(user: AuthUser, conversacionId: string, opciones: ListarMensajesOpciones): Promise<MensajeHablemos[]> {
  const { residenteId } = requireResidenteContext(user);
  await requireParticipante(residenteId, conversacionId);
  return repo.listarMensajes(conversacionId, { ...opciones, limit: opciones.limit || LIMITE_MENSAJES_DEFAULT });
}

/** Envía la notificación push del mensaje al otro participante — best-effort, nunca bloquea el envío del mensaje. */
async function notificarNuevoMensaje(conversacionId: string, remitenteId: string, preview: string): Promise<void> {
  try {
    const [detalle, remitente] = await Promise.all([
      repo.obtenerConversacionConDetalle(conversacionId, remitenteId),
      residentsService.obtenerNombreCompleto(remitenteId),
    ]);
    const otroResidenteId = detalle?.otroParticipante?.id;
    if (!otroResidenteId) return;

    const tokens = await deviceTokensService.findTokensActivosPorResidentes([otroResidenteId]);
    if (tokens.length === 0) return;

    const nombreRemitente = remitente ? (remitente.nombre_completo || `${remitente.nombre} ${remitente.apellido}`) : null;
    const titulo = nombreRemitente ? `Mensaje de ${nombreRemitente}` : 'Nuevo mensaje';

    await sendPushMessages(
      tokens.map((t) => ({
        to: t.expo_push_token,
        title: titulo,
        body: preview,
        sound: 'default',
        data: { pantallaDestino: 'hablemos', conversationId: conversacionId },
      })),
    );
  } catch (err) {
    logger.warn('[hablemos] no se pudo enviar la notificación push', { conversacionId, error: err instanceof Error ? err.message : String(err) });
  }
}

export interface EnviarMensajeTextoInput {
  conversacionId: string;
  contenido: string;
}

export async function enviarMensajeTexto(user: AuthUser, input: EnviarMensajeTextoInput): Promise<MensajeHablemos> {
  const { residenteId } = requireResidenteContext(user);
  await requireParticipante(residenteId, input.conversacionId);

  const mensaje = await repo.crearMensajeTexto({ conversacionId: input.conversacionId, remitenteId: residenteId, contenido: input.contenido });
  void notificarNuevoMensaje(input.conversacionId, residenteId, input.contenido);
  return mensaje;
}

export interface EnviarMensajeAudioInput {
  conversacionId: string;
  audio: { buffer: Buffer; mimeType: string; originalName: string; duracionSegundos: number | null };
}

export async function enviarMensajeAudio(user: AuthUser, input: EnviarMensajeAudioInput): Promise<MensajeHablemos> {
  const { residenteId } = requireResidenteContext(user);
  await requireParticipante(residenteId, input.conversacionId);

  const audioUrl = await repo.subirAudio(input.conversacionId, residenteId, input.audio.buffer, input.audio.mimeType, input.audio.originalName);
  const mensaje = await repo.crearMensajeAudio({
    conversacionId: input.conversacionId,
    remitenteId: residenteId,
    audioUrl,
    audioDuracionSegundos: input.audio.duracionSegundos,
  });
  void notificarNuevoMensaje(input.conversacionId, residenteId, '🎤 Te envió un mensaje de voz');
  return mensaje;
}

export async function marcarRecibidos(user: AuthUser, conversacionId: string): Promise<void> {
  const { residenteId } = requireResidenteContext(user);
  await requireParticipante(residenteId, conversacionId);
  await repo.marcarRecibidos(conversacionId, residenteId);
}

export async function marcarLeidos(user: AuthUser, conversacionId: string): Promise<void> {
  const { residenteId } = requireResidenteContext(user);
  await requireParticipante(residenteId, conversacionId);
  await repo.marcarLeidos(conversacionId, residenteId);
}
