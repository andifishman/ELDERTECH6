import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { logger } from '../../logging/logger';
import * as repo from '../../repositories/familiaComunicacionRepository';
import * as storage from '../../repositories/familiaStorage';
import * as auditService from '../audit/AuditService';
import { exigirVinculo, type FamiliarContext } from '../../utils/familia';
import { requireResidenteContext } from '../../utils/validators';
import { validarImagen } from './FamiliaContenidoService';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

function noEncontrado(que: string): HttpError {
  return new HttpError(StatusCodes.NOT_FOUND, `${que} no encontrado.`);
}

// ─── Mensajes ────────────────────────────────────────────────────────────────

export interface MensajeVista {
  id: string;
  autor: repo.AutorMensaje;
  contenido: string | null;
  imagenUrl: string | null;
  leido: boolean;
  creadoEn: string;
}

async function aVista(mensajes: repo.Mensaje[]): Promise<MensajeVista[]> {
  const urls = await storage.firmarVarias(storage.BUCKETS_FAMILIA.mensajes, mensajes.flatMap((m) => (m.imagen_path ? [m.imagen_path] : [])));
  return mensajes.map((m) => ({
    id: m.id,
    autor: m.autor,
    contenido: m.contenido,
    imagenUrl: m.imagen_path ? (urls.get(m.imagen_path) ?? null) : null,
    leido: m.leido_en !== null,
    creadoEn: m.created_at,
  }));
}

export interface HiloFamiliar {
  vinculoId: string;
  residenteId: string;
  nombre: string;
  apellido: string;
  parentesco: string | null;
  ultimoMensaje: { autor: repo.AutorMensaje; vistaPrevia: string; creadoEn: string } | null;
  sinLeer: number;
}

function vistaPrevia(m: repo.Mensaje): string {
  if (m.contenido) return m.contenido.length > 80 ? `${m.contenido.slice(0, 79).trimEnd()}…` : m.contenido;
  return '📷 Foto';
}

export async function hilosDelFamiliar(ctx: FamiliarContext): Promise<HiloFamiliar[]> {
  const resumenes = await repo.resumirHilos(ctx.vinculos.map((v) => v.vinculoId), 'familiar');
  return ctx.vinculos.map((v) => {
    const r = resumenes.find((x) => x.vinculo_id === v.vinculoId);
    return {
      vinculoId: v.vinculoId,
      residenteId: v.residenteId,
      nombre: v.nombre,
      apellido: v.apellido,
      parentesco: v.parentesco,
      ultimoMensaje: r?.ultimo ? { autor: r.ultimo.autor, vistaPrevia: vistaPrevia(r.ultimo), creadoEn: r.ultimo.created_at } : null,
      sinLeer: r?.sin_leer ?? 0,
    };
  });
}

export async function mensajesDelFamiliar(ctx: FamiliarContext, residenteId: string): Promise<MensajeVista[]> {
  const vinculo = exigirVinculo(ctx, residenteId);
  const mensajes = await repo.listarMensajes(vinculo.vinculoId);
  await repo.marcarLeidos(vinculo.vinculoId, 'familiar');
  return aVista(mensajes);
}

export async function enviarMensajeFamiliar(ctx: FamiliarContext, residenteId: string, contenido: string, imagen: Buffer | null): Promise<MensajeVista> {
  const vinculo = exigirVinculo(ctx, residenteId);
  if (!contenido && !imagen) throw new HttpError(StatusCodes.BAD_REQUEST, 'Escribí un mensaje o elegí una foto.');
  let ruta: string | null = null;
  if (imagen) ruta = await storage.subir(storage.BUCKETS_FAMILIA.mensajes, ctx.organizacionId, imagen, validarImagen(imagen));
  try {
    const mensaje = await repo.crearMensaje(vinculo.vinculoId, 'familiar', contenido || null, ruta);
    return (await aVista([mensaje]))[0]!;
  } catch (err) {
    if (ruta) await storage.borrar(storage.BUCKETS_FAMILIA.mensajes, [ruta]).catch((e: unknown) => logger.warn('[familia] no se pudo limpiar la foto del mensaje', { e }));
    throw err;
  }
}

// Lado del residente (app de residentes): ve a sus familiares vinculados y les contesta.

export interface HiloResidente {
  vinculoId: string;
  familiar: string;
  parentesco: string | null;
  ultimoMensaje: { autor: repo.AutorMensaje; vistaPrevia: string; creadoEn: string } | null;
  sinLeer: number;
}

export async function hilosDelResidente(user: AuthUser): Promise<HiloResidente[]> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  const vinculos = await repo.listarVinculosDeResidente(organizacionId, residenteId);
  const resumenes = await repo.resumirHilos(vinculos.map((v) => v.vinculo_id), 'residente');
  return vinculos.map((v) => {
    const r = resumenes.find((x) => x.vinculo_id === v.vinculo_id);
    return {
      vinculoId: v.vinculo_id,
      familiar: `${v.familiar_nombre} ${v.familiar_apellido}`.trim(),
      parentesco: v.parentesco,
      ultimoMensaje: r?.ultimo ? { autor: r.ultimo.autor, vistaPrevia: vistaPrevia(r.ultimo), creadoEn: r.ultimo.created_at } : null,
      sinLeer: r?.sin_leer ?? 0,
    };
  });
}

async function vinculoDelResidente(user: AuthUser, vinculoId: string): Promise<void> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  const vinculos = await repo.listarVinculosDeResidente(organizacionId, residenteId);
  if (!vinculos.some((v) => v.vinculo_id === vinculoId)) throw noEncontrado('Conversación');
}

export async function mensajesDelResidente(user: AuthUser, vinculoId: string): Promise<MensajeVista[]> {
  await vinculoDelResidente(user, vinculoId);
  const mensajes = await repo.listarMensajes(vinculoId);
  await repo.marcarLeidos(vinculoId, 'residente');
  return aVista(mensajes);
}

export async function responderResidente(user: AuthUser, vinculoId: string, contenido: string): Promise<MensajeVista> {
  await vinculoDelResidente(user, vinculoId);
  if (!contenido) throw new HttpError(StatusCodes.BAD_REQUEST, 'Escribí un mensaje.');
  const mensaje = await repo.crearMensaje(vinculoId, 'residente', contenido, null);
  return (await aVista([mensaje]))[0]!;
}

// ─── Consultas, sugerencias y reclamos ───────────────────────────────────────

export async function listarCategorias(organizacionId: string): Promise<repo.Categoria[]> {
  return repo.listarCategorias(organizacionId, true);
}

export async function listarCasos(ctx: FamiliarContext): Promise<repo.CasoConDatos[]> {
  return repo.listarCasosDeFamiliar(ctx.familiarId);
}

export async function crearCaso(
  ctx: FamiliarContext,
  input: { tipo: repo.TipoCaso; categoriaId?: string | null; residenteId?: string | null; asunto: string; descripcion: string },
): Promise<string> {
  if (input.residenteId) exigirVinculo(ctx, input.residenteId);
  let categoriaId: string | null = null;
  if (input.categoriaId) {
    const categoria = await repo.obtenerCategoria(input.categoriaId, ctx.organizacionId);
    if (!categoria || !categoria.activa) throw new HttpError(StatusCodes.BAD_REQUEST, 'La categoría elegida no existe.');
    categoriaId = categoria.id;
  }
  return repo.crearCaso({
    organizacionId: ctx.organizacionId,
    familiarId: ctx.familiarId,
    residenteId: input.residenteId ?? null,
    tipo: input.tipo,
    categoriaId,
    asunto: input.asunto,
    descripcion: input.descripcion,
  });
}

async function casoDelFamiliar(ctx: FamiliarContext, id: string): Promise<repo.CasoConDatos> {
  const caso = await repo.obtenerCaso(id);
  // Si es de otra familia o de otra institución, para este usuario NO existe.
  if (!caso || caso.familiar_id !== ctx.familiarId || caso.organizacion_id !== ctx.organizacionId) throw noEncontrado('Consulta');
  return caso;
}

export async function obtenerCaso(ctx: FamiliarContext, id: string): Promise<{ caso: repo.CasoConDatos; mensajes: repo.MensajeCaso[] }> {
  const caso = await casoDelFamiliar(ctx, id);
  return { caso, mensajes: await repo.listarMensajesCaso(id) };
}

export async function responderCasoFamiliar(ctx: FamiliarContext, id: string, texto: string): Promise<void> {
  const caso = await casoDelFamiliar(ctx, id);
  await repo.crearMensajeCaso(id, 'familiar', ctx.familiarId, texto);
  // Si ya estaba resuelta y la familia vuelve a escribir, se reabre para que el personal la vea.
  if (caso.estado === 'resuelta') await repo.cambiarEstadoCaso(id, 'pendiente', ctx.familiarId);
}

// ─── Propuestas ──────────────────────────────────────────────────────────────

export async function listarPropuestas(ctx: FamiliarContext): Promise<repo.Propuesta[]> {
  return repo.listarPropuestasDeFamiliar(ctx.familiarId);
}

export async function crearPropuesta(ctx: FamiliarContext, input: { tipo: 'proponer' | 'ofrecerse'; titulo: string; descripcion: string }): Promise<repo.Propuesta> {
  return repo.crearPropuesta({ organizacionId: ctx.organizacionId, familiarId: ctx.familiarId, ...input });
}

// ─── Backoffice ──────────────────────────────────────────────────────────────

export async function listarCasosAdmin(user: AuthUser): Promise<repo.CasoConDatos[]> {
  return repo.listarCasosAdmin(requireOrganizacionId(user));
}

async function casoDeLaInstitucion(user: AuthUser, id: string): Promise<repo.CasoConDatos> {
  const caso = await repo.obtenerCaso(id);
  if (!caso || caso.organizacion_id !== requireOrganizacionId(user)) throw noEncontrado('Consulta');
  return caso;
}

export async function obtenerCasoAdmin(user: AuthUser, id: string): Promise<{ caso: repo.CasoConDatos; mensajes: repo.MensajeCaso[] }> {
  const caso = await casoDeLaInstitucion(user, id);
  return { caso, mensajes: await repo.listarMensajesCaso(id) };
}

export async function responderCasoPersonal(user: AuthUser, id: string, texto: string): Promise<void> {
  const caso = await casoDeLaInstitucion(user, id);
  await repo.crearMensajeCaso(id, 'personal', user.supabaseUserId, texto);
  if (caso.estado === 'pendiente') await repo.cambiarEstadoCaso(id, 'en_proceso', user.supabaseUserId);
  await auditService.registrarAuditoria(user, { accion: 'resolver', tabla: 'familia_casos', registroId: id, descripcion: `Respondió la ${caso.tipo} "${caso.asunto}" de una familia` });
}

export async function cambiarEstadoCaso(user: AuthUser, id: string, estado: repo.EstadoCaso): Promise<void> {
  const caso = await casoDeLaInstitucion(user, id);
  await repo.cambiarEstadoCaso(id, estado, user.supabaseUserId);
  await auditService.registrarAuditoria(user, {
    accion: estado === 'resuelta' ? 'resolver' : 'editar',
    tabla: 'familia_casos',
    registroId: id,
    descripcion: `Pasó la ${caso.tipo} "${caso.asunto}" a "${estado}"`,
    datosPrevios: { estado: caso.estado },
    datosNuevos: { estado },
  });
}

export async function listarCategoriasAdmin(user: AuthUser): Promise<repo.Categoria[]> {
  return repo.listarCategorias(requireOrganizacionId(user), false);
}

export async function crearCategoria(user: AuthUser, nombre: string): Promise<repo.Categoria> {
  const categoria = await repo.crearCategoria(requireOrganizacionId(user), nombre);
  if (!categoria) throw new HttpError(StatusCodes.CONFLICT, `Ya existe una categoría llamada "${nombre}".`);
  await auditService.registrarAuditoria(user, { accion: 'crear', tabla: 'familia_categorias', registroId: categoria.id, descripcion: `Creó la categoría de consultas "${nombre}"` });
  return categoria;
}

export async function actualizarCategoria(user: AuthUser, id: string, cambios: { nombre?: string; activa?: boolean }): Promise<repo.Categoria> {
  const resultado = await repo.actualizarCategoria(id, requireOrganizacionId(user), cambios);
  if (resultado === 'duplicada') throw new HttpError(StatusCodes.CONFLICT, 'Ya existe una categoría con ese nombre.');
  if (!resultado) throw noEncontrado('Categoría');
  await auditService.registrarAuditoria(user, { accion: 'editar', tabla: 'familia_categorias', registroId: id, descripcion: `Editó la categoría de consultas "${resultado.nombre}"`, datosNuevos: cambios });
  return resultado;
}

export async function listarPropuestasAdmin(user: AuthUser): Promise<repo.Propuesta[]> {
  return repo.listarPropuestasAdmin(requireOrganizacionId(user));
}

export async function responderPropuesta(user: AuthUser, id: string, estado: repo.EstadoPropuesta, respuesta: string | null): Promise<repo.Propuesta> {
  const propuesta = await repo.responderPropuesta(id, requireOrganizacionId(user), user.supabaseUserId, estado, respuesta);
  if (!propuesta) throw noEncontrado('Propuesta');
  await auditService.registrarAuditoria(user, { accion: 'resolver', tabla: 'familia_propuestas', registroId: id, descripcion: `Respondió la propuesta "${propuesta.titulo}" (${estado})` });
  return propuesta;
}
