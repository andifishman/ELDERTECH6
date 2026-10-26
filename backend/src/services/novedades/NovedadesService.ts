import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/novedadesRepository';
import * as auditService from '../audit/AuditService';
import * as notificationsAdminService from '../notifications/NotificationsAdminService';
import { logger } from '../../logging/logger';
import { requireResidenteContext } from '../../utils/validators';

/** Cuántos días se muestra una novedad desde que se publica, si no se elige otra duración. */
const DIAS_VISIBLE_POR_DEFECTO = 30;
/** Largo máximo del texto que se manda en el aviso al celular — el resto se lee al abrir la novedad. */
const LARGO_AVISO = 140;

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

function sumarDias(desde: Date, dias: number): string {
  return new Date(desde.getTime() + dias * 86_400_000).toISOString();
}

/** La fecha de publicación pedida, o "ahora" si no se pidió ninguna. Una fecha ya pasada también cuenta como ahora. */
function resolverPublicarEn(publicarEn: string | null | undefined): Date {
  const ahora = new Date();
  if (!publicarEn) return ahora;
  const fecha = new Date(publicarEn);
  return fecha.getTime() > ahora.getTime() + 60_000 ? fecha : ahora;
}

function resumirParaAviso(texto: string): string {
  return texto.length <= LARGO_AVISO ? texto : `${texto.slice(0, LARGO_AVISO - 1).trimEnd()}…`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La categoría tiene que ser una fija o una propia de esta residencia. */
async function validarCategoria(organizacionId: string, categoria: string | undefined): Promise<void> {
  if (categoria === undefined || repo.CATEGORIAS_FIJAS[categoria]) return;
  const propias = UUID.test(categoria) ? await repo.listarCategorias(organizacionId) : [];
  if (!propias.some((c) => c.id === categoria)) throw new HttpError(StatusCodes.BAD_REQUEST, 'La categoría elegida no existe.');
}

export async function listarCategorias(user: AuthUser): Promise<repo.CategoriaPropia[]> {
  return repo.listarCategorias(requireOrganizacionId(user));
}

export async function crearCategoria(user: AuthUser, nombre: string, emoji: string | null): Promise<repo.CategoriaPropia> {
  const organizacionId = requireOrganizacionId(user);
  const repetida = Object.values(repo.CATEGORIAS_FIJAS).some((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
  const categoria = repetida ? null : await repo.crearCategoria(organizacionId, nombre, emoji);
  if (!categoria) throw new HttpError(StatusCodes.CONFLICT, `Ya existe una categoría llamada "${nombre}".`);
  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'novedad_categorias',
    registroId: categoria.id,
    descripcion: `Creó la categoría de novedades "${nombre}"`,
    datosNuevos: { nombre, emoji },
  });
  return categoria;
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
  categoria?: repo.CategoriaNovedad;
  fijada?: boolean;
  /** null/ausente = ahora; a futuro = queda programada */
  publicarEn?: string | null;
  duracionDias?: number;
  /** Si viene, manda sobre duracionDias */
  visibleHasta?: string;
  fechaEvento?: string | null;
  /** Guardarla sin publicar */
  borrador?: boolean;
}

/**
 * Manda el aviso al celular reutilizando el módulo de notificaciones (mismo envío,
 * estadísticas y logs). Si la novedad está programada a futuro, el aviso queda
 * programado para el mismo momento. Si falla, la novedad queda igual — se ve en la
 * app aunque no llegue el push.
 */
async function enviarAviso(user: AuthUser, novedad: repo.Novedad): Promise<repo.Novedad> {
  const programada = new Date(novedad.publicar_en).getTime() > Date.now();
  try {
    const notificacion = await notificationsAdminService.crear(
      user,
      {
        titulo: `Novedad: ${novedad.titulo}`,
        mensaje: resumirParaAviso(novedad.texto),
        imagen_url: novedad.imagen_url,
        tipo: 'informacion',
        destino_tipo: novedad.grupo_ids ? 'grupo' : 'todos',
        destino_filtro: novedad.grupo_ids ? { grupo_ids: novedad.grupo_ids } : null,
        programacion_tipo: programada ? 'programada' : 'instantanea',
        programada_para: programada ? novedad.publicar_en : null,
        pantalla_destino: 'novedades',
      },
      programada ? 'programar' : 'enviar',
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

/**
 * Publica la novedad (ahora o programada a una fecha y hora), o la guarda como
 * borrador. Con aviso, manda la notificación al celular.
 */
export async function publicar(user: AuthUser, input: PublicarNovedadInput): Promise<repo.Novedad> {
  const organizacionId = requireOrganizacionId(user);
  const grupoIds = input.grupoIds.length > 0 ? input.grupoIds : null;
  const publicarEn = resolverPublicarEn(input.publicarEn);
  const esBorrador = input.borrador ?? false;
  await validarCategoria(organizacionId, input.categoria);

  const novedad = await repo.crear(organizacionId, user.supabaseUserId, {
    titulo: input.titulo,
    texto: input.texto,
    imagenUrl: input.imagenUrl,
    grupoIds,
    visibleHasta: input.visibleHasta ?? sumarDias(publicarEn, input.duracionDias ?? DIAS_VISIBLE_POR_DEFECTO),
    publicarEn: publicarEn.toISOString(),
    esBorrador,
    fijada: input.fijada ?? false,
    categoria: input.categoria ?? 'general',
    fechaEvento: input.fechaEvento ?? null,
  });

  const programada = !esBorrador && publicarEn.getTime() > Date.now();
  await auditService.registrarAuditoria(user, {
    accion: esBorrador ? 'crear' : 'publicar',
    tabla: 'novedades',
    registroId: novedad.id,
    descripcion: `${esBorrador ? 'Guardó como borrador' : programada ? 'Programó' : 'Publicó'} la novedad "${input.titulo}"${grupoIds ? ` para ${grupoIds.length} grupo(s)` : ' para todos'}`,
    datosNuevos: { titulo: input.titulo, grupoIds, notificar: input.notificar, publicarEn: novedad.publicar_en, categoria: novedad.categoria },
  });

  if (esBorrador || !input.notificar) return novedad;
  return enviarAviso(user, novedad);
}

export interface PublicarBorradorInput {
  notificar: boolean;
  publicarEn?: string | null;
  duracionDias?: number;
  visibleHasta?: string;
}

/** Pasa un borrador a publicada (ahora o programada), con o sin aviso. */
export async function publicarBorrador(user: AuthUser, id: string, input: PublicarBorradorInput): Promise<repo.Novedad> {
  const actual = await obtenerAdmin(id);
  if (!actual.es_borrador) throw new HttpError(StatusCodes.BAD_REQUEST, 'Esta novedad ya está publicada.');
  const publicarEn = resolverPublicarEn(input.publicarEn);
  const publicada = await repo.actualizar(id, {
    esBorrador: false,
    publicarEn: publicarEn.toISOString(),
    visibleHasta: input.visibleHasta ?? sumarDias(publicarEn, input.duracionDias ?? DIAS_VISIBLE_POR_DEFECTO),
  });
  await auditService.registrarAuditoria(user, {
    accion: 'publicar',
    tabla: 'novedades',
    registroId: id,
    descripcion: `Publicó el borrador "${actual.titulo}"`,
    datosNuevos: { publicarEn: publicada.publicar_en, notificar: input.notificar },
  });
  return input.notificar ? enviarAviso(user, publicada) : publicada;
}

/** Vuelve a mandar el aviso al celular de una novedad que ya está publicada. */
export async function reenviarAviso(user: AuthUser, id: string): Promise<repo.Novedad> {
  const actual = await obtenerAdmin(id);
  if (actual.es_borrador) throw new HttpError(StatusCodes.BAD_REQUEST, 'Primero hay que publicar la novedad.');
  if (new Date(actual.visible_hasta).getTime() <= Date.now()) throw new HttpError(StatusCodes.BAD_REQUEST, 'La novedad ya venció.');
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'novedades',
    registroId: id,
    descripcion: `Reenvió el aviso de la novedad "${actual.titulo}"`,
  });
  return enviarAviso(user, actual);
}

export async function actualizar(user: AuthUser, id: string, cambios: repo.ActualizarNovedadInput): Promise<repo.Novedad> {
  const actual = await obtenerAdmin(id);
  await validarCategoria(actual.organizacion_id, cambios.categoria);
  const actualizada = await repo.actualizar(id, cambios);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'novedades',
    registroId: id,
    descripcion: `Editó la novedad "${actual.titulo}"`,
    datosPrevios: { titulo: actual.titulo, texto: actual.texto, imagenUrl: actual.imagen_url, fijada: actual.fijada, categoria: actual.categoria, visibleHasta: actual.visible_hasta },
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
