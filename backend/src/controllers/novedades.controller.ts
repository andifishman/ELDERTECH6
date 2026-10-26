import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../middlewares/errorHandler';
import * as novedadesService from '../services/novedades/NovedadesService';
import { actualizarNovedadSchema, crearCategoriaSchema, publicarBorradorSchema, publicarNovedadSchema } from '../validators/novedades.validators';
import { requireUser, requireUuidParam } from '../utils/validators';

// ─── Backoffice ─────────────────────────────────────────────────────────────

export async function getListadoAdmin(req: Request, res: Response): Promise<void> {
  res.json(await novedadesService.listarAdmin(requireUser(req)));
}

export async function getCategorias(req: Request, res: Response): Promise<void> {
  res.json(await novedadesService.listarCategorias(requireUser(req)));
}

export async function postCategoria(req: Request, res: Response): Promise<void> {
  const { nombre, emoji } = crearCategoriaSchema.parse(req.body);
  res.status(StatusCodes.CREATED).json(await novedadesService.crearCategoria(requireUser(req), nombre, emoji || null));
}

export async function getDetalleAdmin(req: Request, res: Response): Promise<void> {
  res.json(await novedadesService.obtenerAdmin(requireUuidParam(req, 'id')));
}

export async function postPublicar(req: Request, res: Response): Promise<void> {
  const input = publicarNovedadSchema.parse(req.body);
  const novedad = await novedadesService.publicar(requireUser(req), { ...input, imagenUrl: input.imagenUrl ?? null });
  res.status(StatusCodes.CREATED).json(novedad);
}

export async function postPublicarBorrador(req: Request, res: Response): Promise<void> {
  const input = publicarBorradorSchema.parse(req.body);
  res.json(await novedadesService.publicarBorrador(requireUser(req), requireUuidParam(req, 'id'), input));
}

export async function postReenviarAviso(req: Request, res: Response): Promise<void> {
  res.json(await novedadesService.reenviarAviso(requireUser(req), requireUuidParam(req, 'id')));
}

export async function patchActualizar(req: Request, res: Response): Promise<void> {
  const cambios = actualizarNovedadSchema.parse(req.body);
  res.json(await novedadesService.actualizar(requireUser(req), requireUuidParam(req, 'id'), cambios));
}

export async function deleteEliminar(req: Request, res: Response): Promise<void> {
  await novedadesService.eliminar(requireUser(req), requireUuidParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postImagen(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el archivo de la foto.');
  const url = await novedadesService.subirImagen(file.buffer, file.mimetype, file.originalname);
  res.json({ url });
}

// ─── App del residente ──────────────────────────────────────────────────────

export async function getListadoResidente(req: Request, res: Response): Promise<void> {
  res.json(await novedadesService.listarParaResidente(requireUser(req)));
}

export async function postMarcarLeida(req: Request, res: Response): Promise<void> {
  await novedadesService.marcarLeida(requireUser(req), requireUuidParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}
