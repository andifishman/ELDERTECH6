import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { logger } from '../../logging/logger';
import * as repo from '../../repositories/familiaContenidoRepository';
import * as storage from '../../repositories/familiaStorage';
import * as auditService from '../audit/AuditService';
import type { FamiliarContext } from '../../utils/familia';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

function noEncontrado(que: string): HttpError {
  return new HttpError(StatusCodes.NOT_FOUND, `${que} no encontrado.`);
}

// ─── Archivos ────────────────────────────────────────────────────────────────

const TIPOS_IMAGEN: storage.TipoArchivo[] = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_DOCUMENTO: storage.TipoArchivo[] = [...TIPOS_IMAGEN, 'application/pdf'];

/** Verifica por los bytes (no por lo que diga el cliente) que el archivo sea de un tipo permitido. */
export function validarArchivo(buffer: Buffer, permitidos: storage.TipoArchivo[]): storage.TipoArchivo {
  const tipo = storage.detectarTipo(buffer);
  if (!tipo || !permitidos.includes(tipo)) {
    const lista = permitidos.includes('application/pdf') ? 'PDF, JPG, PNG o WebP' : 'JPG, PNG o WebP';
    throw new HttpError(StatusCodes.BAD_REQUEST, `El archivo no es válido. Se aceptan: ${lista}.`);
  }
  return tipo;
}

export const validarImagen = (buffer: Buffer): storage.TipoArchivo => validarArchivo(buffer, TIPOS_IMAGEN);
export const validarDocumento = (buffer: Buffer): storage.TipoArchivo => validarArchivo(buffer, TIPOS_DOCUMENTO);

// ─── App de familiares: avisos, noticias, documentos, eventos ────────────────

export async function listarAvisos(ctx: FamiliarContext): Promise<repo.AvisoParaFamiliar[]> {
  return repo.listarAvisosParaFamiliar(ctx.organizacionId, ctx.familiarId);
}

export async function confirmarAviso(ctx: FamiliarContext, avisoId: string): Promise<void> {
  const aviso = await repo.obtenerAvisoPublicado(avisoId, ctx.organizacionId);
  if (!aviso) throw noEncontrado('Aviso');
  await repo.marcarAvisoLeido(avisoId, ctx.familiarId);
}

export async function listarNoticias(ctx: FamiliarContext): Promise<repo.Noticia[]> {
  return repo.listarNoticias(ctx.organizacionId);
}

export async function listarDocumentos(ctx: FamiliarContext): Promise<Array<Omit<repo.Documento, 'archivo_path' | 'organizacion_id'> & { url: string | null }>> {
  const documentos = await repo.listarDocumentos(ctx.organizacionId);
  const urls = await storage.firmarVarias(storage.BUCKETS_FAMILIA.documentos, documentos.map((d) => d.archivo_path));
  return documentos.map(({ archivo_path, organizacion_id: _org, ...d }) => ({ ...d, url: urls.get(archivo_path) ?? null }));
}

export async function listarEventos(ctx: FamiliarContext): Promise<repo.EventoParaFamiliar[]> {
  return repo.listarEventos(ctx.organizacionId, ctx.familiarId, new Date().toISOString());
}

export async function inscribirse(ctx: FamiliarContext, eventoId: string, personas: number): Promise<void> {
  const evento = await repo.obtenerEvento(eventoId, ctx.organizacionId);
  if (!evento) throw noEncontrado('Evento');
  const resultado = await repo.inscribirEnEvento(eventoId, ctx.familiarId, personas);
  if (resultado === 'cerrado') throw new HttpError(StatusCodes.CONFLICT, 'La inscripción a este evento está cerrada.');
  if (resultado === 'sin_cupo') throw new HttpError(StatusCodes.CONFLICT, 'No quedan lugares suficientes para esa cantidad de personas.');
}

export async function cancelarInscripcion(ctx: FamiliarContext, eventoId: string): Promise<void> {
  const evento = await repo.obtenerEvento(eventoId, ctx.organizacionId);
  if (!evento) throw noEncontrado('Evento');
  await repo.cancelarInscripcion(eventoId, ctx.familiarId);
}

// ─── App de familiares: fotos ────────────────────────────────────────────────

export async function listarAlbumes(ctx: FamiliarContext): Promise<Array<Omit<repo.AlbumResumen, 'portada_path' | 'organizacion_id'> & { portada_url: string | null }>> {
  const albumes = await repo.listarAlbumesPublicados(ctx.organizacionId);
  const urls = await storage.firmarVarias(storage.BUCKETS_FAMILIA.fotos, albumes.flatMap((a) => (a.portada_path ? [a.portada_path] : [])));
  return albumes.map(({ portada_path, organizacion_id: _org, ...a }) => ({ ...a, portada_url: portada_path ? (urls.get(portada_path) ?? null) : null }));
}

export interface FotoParaFamiliar extends Omit<repo.FotoConInteracciones, 'imagen_path'> {
  url: string | null;
}

export async function obtenerAlbum(ctx: FamiliarContext, albumId: string): Promise<{ album: Omit<repo.Album, 'organizacion_id'>; fotos: FotoParaFamiliar[] }> {
  const album = await repo.obtenerAlbumPublicado(albumId, ctx.organizacionId);
  if (!album) throw noEncontrado('Álbum');
  const fotos = await repo.listarFotosConInteracciones(albumId, ctx.familiarId);
  const urls = await storage.firmarVarias(storage.BUCKETS_FAMILIA.fotos, fotos.map((f) => f.imagen_path));
  const { organizacion_id: _org, ...publico } = album;
  return { album: publico, fotos: fotos.map(({ imagen_path, ...f }) => ({ ...f, url: urls.get(imagen_path) ?? null })) };
}

async function fotoVisible(ctx: FamiliarContext, fotoId: string): Promise<repo.Foto> {
  const foto = await repo.obtenerFotoPublicada(fotoId, ctx.organizacionId);
  if (!foto) throw noEncontrado('Foto');
  return foto;
}

export async function reaccionar(ctx: FamiliarContext, fotoId: string, tipo: repo.TipoReaccion | null): Promise<void> {
  await fotoVisible(ctx, fotoId);
  await repo.guardarReaccion(fotoId, ctx.familiarId, tipo);
}

export async function listarComentarios(ctx: FamiliarContext, fotoId: string): Promise<Array<repo.Comentario & { mio: boolean }>> {
  await fotoVisible(ctx, fotoId);
  return (await repo.listarComentarios(fotoId)).map((c) => ({ ...c, mio: c.familiar_id === ctx.familiarId }));
}

export async function comentar(ctx: FamiliarContext, fotoId: string, texto: string): Promise<void> {
  await fotoVisible(ctx, fotoId);
  await repo.crearComentario(fotoId, ctx.organizacionId, ctx.familiarId, texto);
}

export async function borrarComentarioPropio(ctx: FamiliarContext, comentarioId: string): Promise<void> {
  if (!(await repo.eliminarComentarioPropio(comentarioId, ctx.familiarId))) throw noEncontrado('Comentario');
}

// ─── Backoffice: avisos ──────────────────────────────────────────────────────

export async function listarAvisosAdmin(user: AuthUser): Promise<repo.AvisoAdmin[]> {
  return repo.listarAvisosAdmin(requireOrganizacionId(user));
}

export async function crearAviso(user: AuthUser, input: { titulo: string; texto: string; importante: boolean; publicarEn?: string }): Promise<repo.Aviso> {
  const organizacionId = requireOrganizacionId(user);
  const aviso = await repo.crearAviso(organizacionId, user.supabaseUserId, { ...input, publicarEn: input.publicarEn ?? new Date().toISOString() });
  await auditService.registrarAuditoria(user, { accion: 'publicar', tabla: 'familia_avisos', registroId: aviso.id, descripcion: `Publicó el aviso para familias "${aviso.titulo}"`, datosNuevos: { importante: aviso.importante } });
  return aviso;
}

export async function actualizarAviso(user: AuthUser, id: string, cambios: { titulo?: string; texto?: string; importante?: boolean; publicarEn?: string }): Promise<repo.Aviso> {
  const aviso = await repo.actualizarAviso(id, requireOrganizacionId(user), cambios);
  if (!aviso) throw noEncontrado('Aviso');
  await auditService.registrarAuditoria(user, { accion: 'editar', tabla: 'familia_avisos', registroId: id, descripcion: `Editó el aviso para familias "${aviso.titulo}"` });
  return aviso;
}

export async function eliminarAviso(user: AuthUser, id: string): Promise<void> {
  const organizacionId = requireOrganizacionId(user);
  const aviso = await repo.obtenerAviso(id, organizacionId);
  if (!aviso) throw noEncontrado('Aviso');
  await repo.eliminarAviso(id, organizacionId);
  await auditService.registrarAuditoria(user, { accion: 'eliminar', tabla: 'familia_avisos', registroId: id, descripcion: `Eliminó el aviso para familias "${aviso.titulo}"` });
}

export async function lecturasDeAviso(user: AuthUser, id: string): Promise<repo.LecturaAviso[]> {
  const organizacionId = requireOrganizacionId(user);
  if (!(await repo.obtenerAviso(id, organizacionId))) throw noEncontrado('Aviso');
  return repo.listarLecturasAviso(id, organizacionId);
}

// ─── Backoffice: eventos ─────────────────────────────────────────────────────

export async function listarEventosAdmin(user: AuthUser): Promise<repo.EventoParaFamiliar[]> {
  return repo.listarEventosAdmin(requireOrganizacionId(user));
}

export async function crearEvento(user: AuthUser, input: repo.EventoInput): Promise<repo.Evento> {
  const evento = await repo.crearEvento(requireOrganizacionId(user), user.supabaseUserId, input);
  await auditService.registrarAuditoria(user, { accion: 'crear', tabla: 'familia_eventos', registroId: evento.id, descripcion: `Creó el evento para familias "${evento.titulo}"` });
  return evento;
}

export async function actualizarEvento(user: AuthUser, id: string, cambios: Partial<repo.EventoInput>): Promise<repo.Evento> {
  const organizacionId = requireOrganizacionId(user);
  const actual = await repo.obtenerEvento(id, organizacionId);
  if (!actual) throw noEncontrado('Evento');
  const iniciaEn = cambios.iniciaEn ?? actual.inicia_en;
  const terminaEn = cambios.terminaEn === undefined ? actual.termina_en : cambios.terminaEn;
  if (terminaEn && new Date(terminaEn) < new Date(iniciaEn)) throw new HttpError(StatusCodes.BAD_REQUEST, 'El evento no puede terminar antes de empezar.');
  const evento = await repo.actualizarEvento(id, organizacionId, cambios);
  if (!evento) throw noEncontrado('Evento');
  await auditService.registrarAuditoria(user, { accion: 'editar', tabla: 'familia_eventos', registroId: id, descripcion: `Editó el evento para familias "${evento.titulo}"` });
  return evento;
}

export async function eliminarEvento(user: AuthUser, id: string): Promise<void> {
  const organizacionId = requireOrganizacionId(user);
  const evento = await repo.obtenerEvento(id, organizacionId);
  if (!evento) throw noEncontrado('Evento');
  await repo.eliminarEvento(id, organizacionId);
  await auditService.registrarAuditoria(user, { accion: 'eliminar', tabla: 'familia_eventos', registroId: id, descripcion: `Eliminó el evento para familias "${evento.titulo}"` });
}

export async function inscripcionesDeEvento(user: AuthUser, id: string): Promise<repo.Inscripcion[]> {
  if (!(await repo.obtenerEvento(id, requireOrganizacionId(user)))) throw noEncontrado('Evento');
  return repo.listarInscripciones(id);
}

// ─── Backoffice: documentos ──────────────────────────────────────────────────

export async function listarDocumentosAdmin(user: AuthUser): Promise<Array<Omit<repo.Documento, 'archivo_path' | 'organizacion_id'> & { url: string | null }>> {
  const documentos = await repo.listarDocumentos(requireOrganizacionId(user));
  const urls = await storage.firmarVarias(storage.BUCKETS_FAMILIA.documentos, documentos.map((d) => d.archivo_path));
  return documentos.map(({ archivo_path, organizacion_id: _org, ...d }) => ({ ...d, url: urls.get(archivo_path) ?? null }));
}

export async function subirDocumento(
  user: AuthUser,
  campos: { titulo: string; descripcion: string | null },
  archivo: { buffer: Buffer; nombre: string },
): Promise<repo.Documento> {
  const organizacionId = requireOrganizacionId(user);
  const tipo = validarDocumento(archivo.buffer);
  const ruta = await storage.subir(storage.BUCKETS_FAMILIA.documentos, organizacionId, archivo.buffer, tipo);
  try {
    const documento = await repo.crearDocumento(organizacionId, user.supabaseUserId, {
      titulo: campos.titulo,
      descripcion: campos.descripcion,
      archivoPath: ruta,
      nombreArchivo: archivo.nombre.slice(0, 160),
      mime: tipo,
      tamanoBytes: archivo.buffer.length,
    });
    await auditService.registrarAuditoria(user, { accion: 'crear', tabla: 'familia_documentos', registroId: documento.id, descripcion: `Subió el documento "${documento.titulo}" al tablón de familias` });
    return documento;
  } catch (err) {
    await storage.borrar(storage.BUCKETS_FAMILIA.documentos, [ruta]).catch((e: unknown) => logger.warn('[familia] no se pudo limpiar el archivo huérfano', { e }));
    throw err;
  }
}

export async function eliminarDocumento(user: AuthUser, id: string): Promise<void> {
  const ruta = await repo.eliminarDocumento(id, requireOrganizacionId(user));
  if (!ruta) throw noEncontrado('Documento');
  await storage.borrar(storage.BUCKETS_FAMILIA.documentos, [ruta]).catch((e: unknown) => logger.warn('[familia] no se pudo borrar el archivo del documento', { e }));
  await auditService.registrarAuditoria(user, { accion: 'eliminar', tabla: 'familia_documentos', registroId: id, descripcion: 'Eliminó un documento del tablón de familias' });
}

// ─── Backoffice: álbumes y fotos ─────────────────────────────────────────────

export async function listarAlbumesAdmin(user: AuthUser): Promise<Array<Omit<repo.AlbumResumen, 'portada_path' | 'organizacion_id'> & { portada_url: string | null }>> {
  const albumes = await repo.listarAlbumesAdmin(requireOrganizacionId(user));
  const urls = await storage.firmarVarias(storage.BUCKETS_FAMILIA.fotos, albumes.flatMap((a) => (a.portada_path ? [a.portada_path] : [])));
  return albumes.map(({ portada_path, organizacion_id: _org, ...a }) => ({ ...a, portada_url: portada_path ? (urls.get(portada_path) ?? null) : null }));
}

export async function obtenerAlbumAdmin(user: AuthUser, id: string): Promise<{ album: repo.Album; fotos: Array<{ id: string; orden: number; url: string | null }>; comentarios: repo.Comentario[] }> {
  const organizacionId = requireOrganizacionId(user);
  const album = await repo.obtenerAlbum(id, organizacionId);
  if (!album) throw noEncontrado('Álbum');
  const fotos = await repo.listarFotosDeAlbum(id);
  const urls = await storage.firmarVarias(storage.BUCKETS_FAMILIA.fotos, fotos.map((f) => f.imagen_path));
  const comentarios = await repo.listarComentariosDelAlbumAdmin(id, organizacionId);
  return { album, fotos: fotos.map((f) => ({ id: f.id, orden: f.orden, url: urls.get(f.imagen_path) ?? null })), comentarios };
}

export async function crearAlbum(user: AuthUser, input: { titulo: string; actividad: string | null; fecha?: string; publicar: boolean }): Promise<repo.Album> {
  const fecha = input.fecha ?? new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
  const album = await repo.crearAlbum(requireOrganizacionId(user), user.supabaseUserId, { titulo: input.titulo, actividad: input.actividad, fecha, publicadoEn: input.publicar ? new Date().toISOString() : null });
  await auditService.registrarAuditoria(user, { accion: 'crear', tabla: 'familia_albumes', registroId: album.id, descripcion: `Creó el álbum de fotos "${album.titulo}"${input.publicar ? ' y lo publicó' : ' (borrador)'}` });
  return album;
}

export async function actualizarAlbum(
  user: AuthUser,
  id: string,
  cambios: { titulo?: string; actividad?: string | null; fecha?: string; publicar?: boolean },
): Promise<repo.Album> {
  const organizacionId = requireOrganizacionId(user);
  const actual = await repo.obtenerAlbum(id, organizacionId);
  if (!actual) throw noEncontrado('Álbum');
  const { publicar, ...resto } = cambios;
  // Publicar un álbum ya publicado no cambia la fecha de publicación; despublicar lo vuelve a borrador.
  const publicadoEn = publicar === undefined ? undefined : publicar ? (actual.publicado_en ?? new Date().toISOString()) : null;
  const album = await repo.actualizarAlbum(id, organizacionId, { ...resto, ...(publicadoEn !== undefined ? { publicadoEn } : {}) });
  if (!album) throw noEncontrado('Álbum');
  await auditService.registrarAuditoria(user, {
    accion: publicar === undefined ? 'editar' : publicar ? 'publicar' : 'pausar',
    tabla: 'familia_albumes',
    registroId: id,
    descripcion: `${publicar === undefined ? 'Editó' : publicar ? 'Publicó' : 'Despublicó'} el álbum "${album.titulo}"`,
  });
  return album;
}

export async function eliminarAlbum(user: AuthUser, id: string): Promise<void> {
  const organizacionId = requireOrganizacionId(user);
  const album = await repo.obtenerAlbum(id, organizacionId);
  if (!album) throw noEncontrado('Álbum');
  const rutas = await repo.eliminarAlbum(id, organizacionId);
  if (rutas) await storage.borrar(storage.BUCKETS_FAMILIA.fotos, rutas).catch((e: unknown) => logger.warn('[familia] no se pudieron borrar las fotos del álbum', { e }));
  await auditService.registrarAuditoria(user, { accion: 'eliminar', tabla: 'familia_albumes', registroId: id, descripcion: `Eliminó el álbum "${album.titulo}"` });
}

export async function subirFotos(user: AuthUser, albumId: string, archivos: Buffer[]): Promise<number> {
  const organizacionId = requireOrganizacionId(user);
  const album = await repo.obtenerAlbum(albumId, organizacionId);
  if (!album) throw noEncontrado('Álbum');
  // Se valida TODO antes de subir nada, así un archivo malo no deja el álbum a medias.
  const tipos = archivos.map((b) => validarImagen(b));
  const existentes = await repo.listarFotosDeAlbum(albumId);
  let orden = existentes.reduce((m, f) => Math.max(m, f.orden), -1) + 1;
  let subidas = 0;
  for (const [i, buffer] of archivos.entries()) {
    const ruta = await storage.subir(storage.BUCKETS_FAMILIA.fotos, organizacionId, buffer, tipos[i]!);
    try {
      await repo.agregarFoto(albumId, organizacionId, ruta, orden++);
      subidas += 1;
    } catch (err) {
      await storage.borrar(storage.BUCKETS_FAMILIA.fotos, [ruta]).catch(() => undefined);
      throw err;
    }
  }
  await auditService.registrarAuditoria(user, { accion: 'crear', tabla: 'familia_fotos', registroId: albumId, descripcion: `Subió ${subidas} foto(s) al álbum "${album.titulo}"` });
  return subidas;
}

export async function eliminarFoto(user: AuthUser, fotoId: string): Promise<void> {
  const ruta = await repo.eliminarFoto(fotoId, requireOrganizacionId(user));
  if (!ruta) throw noEncontrado('Foto');
  await storage.borrar(storage.BUCKETS_FAMILIA.fotos, [ruta]).catch((e: unknown) => logger.warn('[familia] no se pudo borrar la foto del bucket', { e }));
  await auditService.registrarAuditoria(user, { accion: 'eliminar', tabla: 'familia_fotos', registroId: fotoId, descripcion: 'Eliminó una foto de un álbum para familias' });
}

export async function moderarComentario(user: AuthUser, comentarioId: string): Promise<void> {
  const borrado = await repo.eliminarComentarioModeracion(comentarioId, requireOrganizacionId(user), user.supabaseUserId);
  if (!borrado) throw noEncontrado('Comentario');
  await auditService.registrarAuditoria(user, { accion: 'eliminar', tabla: 'familia_foto_comentarios', registroId: comentarioId, descripcion: 'Borró un comentario de una foto' });
}
