import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/novedadesRepository';
import * as auditService from '../audit/AuditService';
import * as notificationsAdminService from '../notifications/NotificationsAdminService';
import { logger } from '../../logging/logger';
import { requireResidenteContext } from '../../utils/validators';

/** Cuánto tiempo se muestra una novedad en la app desde que se publica. */
const MESES_VISIBLE = 1;
/** Largo máximo del texto que se manda en el aviso al celular — el resto se lee al abrir la novedad. */
const LARGO_AVISO = 140;

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

function calcularVisibleHasta(desde: Date): string {
  const hasta = new Date(desde);
  hasta.setMonth(hasta.getMonth() + MESES_VISIBLE);
  return hasta.toISOString();
}

function resumirParaAviso(texto: string): string {
  return texto.length <= LARGO_AVISO ? texto : `${texto.slice(0, LARGO_AVISO - 1).trimEnd()}…`;
}

export async function listarAdmin(user: AuthUser): Promise<repo.NovedadAdmin[]> {
  return repo.listarParaAdmin(requireOrganizacionId(user));
}

export async function obtenerAdmin(id: string): Promise<repo.Novedad> {
  const novedad = await repo.obtener(id);
  if (!novedad) throw new HttpError(StatusCodes.NOT_FOUND, 'Novedad no encontrada.');
  return novedad;
}

export interface PublicarNovedadInput {
  titulo: string;
  texto: string;
  imagenUrl: string | null;
  /** Vacío = para todos los residentes */
  grupoIds: string[];
  notificar: boolean;
}

/**
 * Publica la novedad y, si se pidió, manda el aviso al celular reutilizando
 * el módulo de notificaciones (mismo envío, estadísticas y logs). Si el aviso
 * falla, la novedad queda publicada igual — se ve en la app aunque no llegue el push.
 */
export async function publicar(user: AuthUser, input: PublicarNovedadInput): Promise<repo.Novedad> {
  const organizacionId = requireOrganizacionId(user);
  const grupoIds = input.grupoIds.length > 0 ? input.grupoIds : null;

  const novedad = await repo.crear(organizacionId, user.supabaseUserId, {
    titulo: input.titulo,
    texto: input.texto,
    imagenUrl: input.imagenUrl,
    grupoIds,
    visibleHasta: calcularVisibleHasta(new Date()),
  });

  await auditService.registrarAuditoria(user, {
    accion: 'publicar',
    tabla: 'novedades',
    registroId: novedad.id,
    descripcion: `Publicó la novedad "${input.titulo}"${grupoIds ? ` para ${grupoIds.length} grupo(s)` : ' para todos'}`,
    datosNuevos: { titulo: input.titulo, grupoIds, notificar: input.notificar },
  });

  if (!input.notificar) return novedad;

  try {
    const notificacion = await notificationsAdminService.crear(
      user,
      {
        titulo: `Novedad: ${input.titulo}`,
        mensaje: resumirParaAviso(input.texto),
        imagen_url: input.imagenUrl,
        tipo: 'informacion',
        destino_tipo: grupoIds ? 'grupo' : 'todos',
        destino_filtro: grupoIds ? { grupo_ids: grupoIds } : null,
        programacion_tipo: 'instantanea',
        pantalla_destino: 'novedades',
      },
      'enviar',
    );
    await repo.vincularNotificacion(novedad.id, notificacion.id);
    return { ...novedad, notificacion_id: notificacion.id };
  } catch (err) {
    logger.error('[novedades] no se pudo mandar el aviso de la novedad', {
      novedadId: novedad.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return novedad;
  }
}

export async function actualizar(user: AuthUser, id: string, cambios: repo.ActualizarNovedadInput): Promise<repo.Novedad> {
  const actual = await obtenerAdmin(id);
  const actualizada = await repo.actualizar(id, cambios);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'novedades',
    registroId: id,
    descripcion: `Editó la novedad "${actual.titulo}"`,
    datosPrevios: { titulo: actual.titulo, texto: actual.texto, imagenUrl: actual.imagen_url },
    datosNuevos: { ...cambios },
  });
  return actualizada;
}

export async function eliminar(user: AuthUser, id: string): Promise<void> {
  const actual = await obtenerAdmin(id);
  await repo.eliminar(id);
  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'novedades',
    registroId: id,
    descripcion: `Eliminó la novedad "${actual.titulo}"`,
    datosPrevios: { titulo: actual.titulo },
  });
}

export async function subirImagen(buffer: Buffer, contentType: string, originalName: string): Promise<string> {
  return repo.subirImagen(buffer, contentType, originalName);
}

export async function listarParaResidente(user: AuthUser): Promise<repo.NovedadResidente[]> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  return repo.listarParaResidente(organizacionId, residenteId);
}

export async function marcarLeida(user: AuthUser, novedadId: string): Promise<void> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  const visibles = await repo.listarParaResidente(organizacionId, residenteId);
  if (!visibles.some((n) => n.id === novedadId)) throw new HttpError(StatusCodes.NOT_FOUND, 'Novedad no encontrada.');
  await repo.marcarLeida(novedadId, residenteId);
}
