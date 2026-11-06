import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../middlewares/errorHandler';
import * as familiaService from '../services/familia/FamiliaService';
import * as contenidoService from '../services/familia/FamiliaContenidoService';
import * as comunicacionService from '../services/familia/FamiliaComunicacionService';
import {
  actualizarAlbumSchema,
  actualizarAvisoSchema,
  actualizarCategoriaSchema,
  actualizarEventoSchema,
  actualizarFamiliarSchema,
  actualizarVinculoSchema,
  categoriaSchema,
  crearAlbumSchema,
  crearAvisoSchema,
  crearEventoSchema,
  crearFamiliarSchema,
  crearVinculoSchema,
  documentoCamposSchema,
  estadoCasoSchema,
  responderPropuestaSchema,
  respuestaSchema,
} from '../validators/familia.validators';
import { requireUser, requireUuidParam } from '../utils/validators';

const user = requireUser;
const id = (req: Request, nombre = 'id') => requireUuidParam(req, nombre);
const sinContenido = (res: Response): void => void res.status(StatusCodes.NO_CONTENT).end();

// ─── Familiares y vínculos ───────────────────────────────────────────────────

export async function getFamiliares(req: Request, res: Response): Promise<void> {
  res.json(await familiaService.listarFamiliares(user(req)));
}

export async function getFamiliaresDeResidente(req: Request, res: Response): Promise<void> {
  res.json(await familiaService.listarFamiliaresDeResidente(user(req), id(req, 'residenteId')));
}

export async function postFamiliar(req: Request, res: Response): Promise<void> {
  const input = crearFamiliarSchema.parse(req.body);
  res.status(StatusCodes.CREATED).json(await familiaService.crearFamiliar(user(req), input));
}

export async function patchFamiliar(req: Request, res: Response): Promise<void> {
  res.json(await familiaService.actualizarFamiliar(user(req), id(req), actualizarFamiliarSchema.parse(req.body)));
}

export async function postReinvitar(req: Request, res: Response): Promise<void> {
  res.json(await familiaService.reinvitar(user(req), id(req)));
}

export async function postVinculo(req: Request, res: Response): Promise<void> {
  const { residenteId, parentesco } = crearVinculoSchema.parse(req.body);
  await familiaService.vincular(user(req), id(req), residenteId, parentesco);
  res.status(StatusCodes.CREATED).end();
}

export async function patchVinculo(req: Request, res: Response): Promise<void> {
  await familiaService.actualizarParentesco(user(req), id(req), actualizarVinculoSchema.parse(req.body).parentesco);
  sinContenido(res);
}

export async function postRevocarVinculo(req: Request, res: Response): Promise<void> {
  await familiaService.revocarVinculo(user(req), id(req));
  sinContenido(res);
}

export async function postReactivarVinculo(req: Request, res: Response): Promise<void> {
  await familiaService.reactivarVinculo(user(req), id(req));
  sinContenido(res);
}

// ─── Avisos ──────────────────────────────────────────────────────────────────

export async function getAvisos(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarAvisosAdmin(user(req)));
}

export async function postAviso(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(await contenidoService.crearAviso(user(req), crearAvisoSchema.parse(req.body)));
}

export async function patchAviso(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.actualizarAviso(user(req), id(req), actualizarAvisoSchema.parse(req.body)));
}

export async function deleteAviso(req: Request, res: Response): Promise<void> {
  await contenidoService.eliminarAviso(user(req), id(req));
  sinContenido(res);
}

export async function getLecturasAviso(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.lecturasDeAviso(user(req), id(req)));
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

export async function getEventos(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarEventosAdmin(user(req)));
}

export async function postEvento(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(await contenidoService.crearEvento(user(req), crearEventoSchema.parse(req.body)));
}

export async function patchEvento(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.actualizarEvento(user(req), id(req), actualizarEventoSchema.parse(req.body)));
}

export async function deleteEvento(req: Request, res: Response): Promise<void> {
  await contenidoService.eliminarEvento(user(req), id(req));
  sinContenido(res);
}

export async function getInscripciones(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.inscripcionesDeEvento(user(req), id(req)));
}

// ─── Documentos ──────────────────────────────────────────────────────────────

export async function getDocumentos(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarDocumentosAdmin(user(req)));
}

export async function postDocumento(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el archivo.');
  const campos = documentoCamposSchema.parse(req.body);
  const documento = await contenidoService.subirDocumento(user(req), campos, { buffer: req.file.buffer, nombre: req.file.originalname });
  res.status(StatusCodes.CREATED).json({ id: documento.id });
}

export async function deleteDocumento(req: Request, res: Response): Promise<void> {
  await contenidoService.eliminarDocumento(user(req), id(req));
  sinContenido(res);
}

// ─── Álbumes y fotos ─────────────────────────────────────────────────────────

export async function getAlbumes(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.listarAlbumesAdmin(user(req)));
}

export async function postAlbum(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(await contenidoService.crearAlbum(user(req), crearAlbumSchema.parse(req.body)));
}

export async function getAlbum(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.obtenerAlbumAdmin(user(req), id(req)));
}

export async function patchAlbum(req: Request, res: Response): Promise<void> {
  res.json(await contenidoService.actualizarAlbum(user(req), id(req), actualizarAlbumSchema.parse(req.body)));
}

export async function deleteAlbum(req: Request, res: Response): Promise<void> {
  await contenidoService.eliminarAlbum(user(req), id(req));
  sinContenido(res);
}

export async function postFotos(req: Request, res: Response): Promise<void> {
  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (archivos.length === 0) throw new HttpError(StatusCodes.BAD_REQUEST, 'Elegí al menos una foto.');
  const subidas = await contenidoService.subirFotos(user(req), id(req), archivos.map((a) => a.buffer));
  res.status(StatusCodes.CREATED).json({ subidas });
}

export async function deleteFoto(req: Request, res: Response): Promise<void> {
  await contenidoService.eliminarFoto(user(req), id(req));
  sinContenido(res);
}

export async function deleteComentario(req: Request, res: Response): Promise<void> {
  await contenidoService.moderarComentario(user(req), id(req));
  sinContenido(res);
}

// ─── Consultas, reclamos y propuestas ────────────────────────────────────────

export async function getCasos(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.listarCasosAdmin(user(req)));
}

export async function getCaso(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.obtenerCasoAdmin(user(req), id(req)));
}

export async function postRespuestaCaso(req: Request, res: Response): Promise<void> {
  await comunicacionService.responderCasoPersonal(user(req), id(req), respuestaSchema.parse(req.body).texto);
  res.status(StatusCodes.CREATED).end();
}

export async function patchEstadoCaso(req: Request, res: Response): Promise<void> {
  await comunicacionService.cambiarEstadoCaso(user(req), id(req), estadoCasoSchema.parse(req.body).estado);
  sinContenido(res);
}

export async function getCategorias(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.listarCategoriasAdmin(user(req)));
}

export async function postCategoria(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(await comunicacionService.crearCategoria(user(req), categoriaSchema.parse(req.body).nombre));
}

export async function patchCategoria(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.actualizarCategoria(user(req), id(req), actualizarCategoriaSchema.parse(req.body)));
}

export async function getPropuestas(req: Request, res: Response): Promise<void> {
  res.json(await comunicacionService.listarPropuestasAdmin(user(req)));
}

export async function patchPropuesta(req: Request, res: Response): Promise<void> {
  const { estado, respuesta } = responderPropuestaSchema.parse(req.body);
  res.json(await comunicacionService.responderPropuesta(user(req), id(req), estado, respuesta));
}
