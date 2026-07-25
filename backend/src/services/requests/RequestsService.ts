import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/requestsRepository';
import { transcribirAudio } from '../assistant/AssistantChatService';
import { logger } from '../../logging/logger';
import type { PedidoSugerenciaConResidente, TipoPedido } from '../../providers/requests/RequestTypes';

/** Porteo del módulo "Pedidos y Sugerencias" — lado residente (app móvil). */

function requireResidente(user: AuthUser): { residenteId: string; organizacionId: string } {
  if (!user.residenteId) throw new HttpError(403, 'Este usuario no tiene un residente asociado.');
  if (!user.organizacionId) throw new HttpError(403, 'Este usuario no tiene una organización asociada.');
  return { residenteId: user.residenteId, organizacionId: user.organizacionId };
}

export interface CrearInput {
  tipo: TipoPedido;
  titulo: string;
  descripcion?: string | null;
  audio?: { buffer: Buffer; mimeType: string; originalName: string; duracionSegundos?: number | null } | null;
}

export async function crear(user: AuthUser, input: CrearInput): Promise<PedidoSugerenciaConResidente> {
  const { residenteId, organizacionId } = requireResidente(user);

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
  const { residenteId } = requireResidente(user);
  return repo.listarPropios(residenteId);
}
