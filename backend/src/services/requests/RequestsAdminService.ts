import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/requestsRepository';
import { transcribirAudio } from '../assistant/AssistantChatService';
import * as auditService from '../audit/AuditService';
import type { EstadoPedido, PedidoSugerenciaConResidente } from '../../providers/requests/RequestTypes';

/** Porteo del módulo "Pedidos y Sugerencias" — lado admin (backoffice). */

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(403, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export type Ordenar = 'recientes' | 'antiguos' | 'usuario_asc' | 'usuario_desc';

export interface ListarInput {
  estado?: EstadoPedido;
  tipo?: string;
  seccion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  ordenar?: Ordenar;
}

function coincideBusqueda(pedido: PedidoSugerenciaConResidente, q: string): boolean {
  const texto = q.trim().toLowerCase();
  if (!texto) return true;
  const campos = [
    pedido.titulo,
    pedido.descripcion,
    pedido.transcripcion,
    pedido.residente?.nombre,
    pedido.residente?.apellido,
    pedido.residente?.habitacion,
  ];
  return campos.some((c) => c?.toLowerCase().includes(texto));
}

function ordenarPedidos(pedidos: PedidoSugerenciaConResidente[], criterio: Ordenar): PedidoSugerenciaConResidente[] {
  const copia = [...pedidos];
  switch (criterio) {
    case 'antiguos':
      return copia.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case 'usuario_asc':
      return copia.sort((a, b) => (a.residente?.apellido ?? '').localeCompare(b.residente?.apellido ?? ''));
    case 'usuario_desc':
      return copia.sort((a, b) => (b.residente?.apellido ?? '').localeCompare(a.residente?.apellido ?? ''));
    case 'recientes':
    default:
      return copia.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export async function listar(user: AuthUser, input: ListarInput): Promise<PedidoSugerenciaConResidente[]> {
  const organizacionId = requireOrganizacionId(user);
  const pedidos = await repo.listarAdmin(organizacionId, {
    estado: input.estado,
    tipo: input.tipo,
    seccion: input.seccion,
    fechaDesde: input.fechaDesde,
    fechaHasta: input.fechaHasta,
  });

  const filtrados = input.busqueda ? pedidos.filter((p) => coincideBusqueda(p, input.busqueda!)) : pedidos;
  return ordenarPedidos(filtrados, input.ordenar ?? 'recientes');
}

export async function obtenerDetalle(id: string): Promise<PedidoSugerenciaConResidente> {
  const pedido = await repo.obtenerPorId(id);
  if (!pedido) throw new HttpError(404, 'Solicitud no encontrada.');
  return pedido;
}

export async function actualizarEstado(user: AuthUser, id: string, estado: EstadoPedido): Promise<void> {
  await repo.actualizarEstado(id, estado, estado === 'resuelta' ? user.supabaseUserId : null);
  await auditService.registrarAuditoria(user, {
    accion: estado === 'resuelta' ? 'resolver' : 'editar',
    tabla: 'pedidos_sugerencias',
    registroId: id,
    descripcion: `Cambió el estado de una solicitud a "${estado}"`,
  });
}

export async function eliminar(user: AuthUser, id: string): Promise<void> {
  await repo.eliminar(id);
  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'pedidos_sugerencias',
    registroId: id,
    descripcion: 'Eliminó una solicitud',
  });
}

/** Vuelve a intentar transcribir el audio ya guardado — descarga el archivo desde su URL pública. */
export async function reintentarTranscripcion(id: string): Promise<PedidoSugerenciaConResidente> {
  const pedido = await repo.obtenerPorId(id);
  if (!pedido) throw new HttpError(404, 'Solicitud no encontrada.');
  if (!pedido.audio_url) throw new HttpError(400, 'Esta solicitud no tiene audio.');

  const res = await fetch(pedido.audio_url);
  if (!res.ok) throw new HttpError(502, 'No se pudo descargar el audio guardado.');
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') ?? 'audio/m4a';

  try {
    const texto = await transcribirAudio(buffer, 'audio.m4a', contentType);
    await repo.actualizarTranscripcion(id, texto, 'completada');
  } catch {
    await repo.actualizarTranscripcion(id, null, 'fallida');
    throw new HttpError(502, 'No se pudo transcribir el audio. Intentá de nuevo más tarde.');
  }

  return obtenerDetalle(id);
}
