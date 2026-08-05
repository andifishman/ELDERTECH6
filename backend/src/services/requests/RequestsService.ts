import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/requestsRepository';
import { transcribirAudio } from '../assistant/AssistantChatService';
import { logger } from '../../logging/logger';
import { HttpError } from '../../middlewares/errorHandler';
import { requireResidenteContext } from '../../utils/validators';
import type { PedidoSugerenciaConResidente, TipoPedido } from '../../providers/requests/RequestTypes';
import { StatusCodes } from 'http-status-codes';

/** Porteo del módulo "Pedidos y Sugerencias" — lado residente (app móvil). */

export interface CrearInput {
  tipo: TipoPedido;
  titulo: string;
  descripcion?: string | null;
  audio?: { buffer: Buffer; mimeType: string; originalName: string; duracionSegundos?: number | null } | null;
}

export async function crear(user: AuthUser, input: CrearInput): Promise<PedidoSugerenciaConResidente> {
  const { residenteId, organizacionId } = requireResidenteContext(user);

  let audioUrl: string | null = null;
  let transcripcion: string | null = null;
  let transcripcionEstado: 'pendiente' | 'completada' | 'fallida' | null = null;

  if (input.audio) {
    audioUrl = await repo.subirAudio(residenteId, input.audio.buffer, input.audio.mimeType, input.audio.originalName);
    try {
      transcripcion = await transcribirAudio(input.audio.buffer, input.audio.originalName, input.audio.mimeType);
      transcripcionEstado = 'completada';
    } catch (err) {
      // El audio ya quedó guardado — la transcripción se puede reintentar después desde el backoffice.
      logger.warn('[pedidos] no se pudo transcribir el audio', { error: err instanceof Error ? err.message : String(err) });
      transcripcionEstado = 'fallida';
    }
  }

  return repo.crearPedido({
    organizacionId,
    residenteId,
    tipo: input.tipo,
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    audioUrl,
    audioDuracionSegundos: input.audio?.duracionSegundos ?? null,
    transcripcion,
    transcripcionEstado,
  });
}

export async function listarPropios(user: AuthUser): Promise<PedidoSugerenciaConResidente[]> {
  const { residenteId } = requireResidenteContext(user);
  return repo.listarPropios(residenteId);
}

export interface EditarInput {
  titulo: string;
  descripcion?: string | null;
}

export async function editarPropio(user: AuthUser, id: string, input: EditarInput): Promise<PedidoSugerenciaConResidente> {
  const { residenteId } = requireResidenteContext(user);
  const actualizado = await repo.actualizarPropio(id, residenteId, input);
  if (!actualizado) {
    throw new HttpError(StatusCodes.NOT_FOUND, 'No se encontró la solicitud, no te pertenece, o ya no se puede editar porque el personal ya la está atendiendo.');
  }
  return actualizado;
}
