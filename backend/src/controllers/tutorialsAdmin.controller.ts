import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as tutorialsAdminService from '../services/tutorials/TutorialsAdminService';
import {
  crearCategoriaSchema,
  eliminarQuerySchema,
  subirImagenQuerySchema,
  tutorialAdminInputSchema,
} from '../validators/tutorialsAdmin.validators';
import { requireParam, requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function getTodos(_req: Request, res: Response): Promise<void> {
  res.json(await tutorialsAdminService.listarTodos());
}

export async function getEliminados(_req: Request, res: Response): Promise<void> {
  res.json(await tutorialsAdminService.listarEliminados());
}

export async function postCategoria(req: Request, res: Response): Promise<void> {
  const { nombre, emoji } = crearCategoriaSchema.parse(req.body);
  const id = await tutorialsAdminService.crearCategoria(requireUser(req), nombre, emoji);
  res.status(StatusCodes.CREATED).json({ id });
}

export async function getPorId(req: Request, res: Response): Promise<void> {
  res.json(await tutorialsAdminService.obtenerPorId(requireParam(req, 'id')));
}

export async function getPasos(req: Request, res: Response): Promise<void> {
  res.json(await tutorialsAdminService.listarPasos(requireParam(req, 'id')));
}

export async function postTutorial(req: Request, res: Response): Promise<void> {
  const input = tutorialAdminInputSchema.parse(req.body);
  const id = await tutorialsAdminService.crear(requireUser(req), input);
  res.status(StatusCodes.CREATED).json({ id });
}

export async function patchTutorial(req: Request, res: Response): Promise<void> {
  const input = tutorialAdminInputSchema.parse(req.body);
  await tutorialsAdminService.actualizar(requireUser(req), requireParam(req, 'id'), input);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function deleteTutorial(req: Request, res: Response): Promise<void> {
  const { titulo } = eliminarQuerySchema.parse(req.query);
  await tutorialsAdminService.eliminar(requireUser(req), requireParam(req, 'id'), titulo);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postRestaurar(req: Request, res: Response): Promise<void> {
  const { titulo } = eliminarQuerySchema.parse(req.query);
  await tutorialsAdminService.restaurar(requireUser(req), requireParam(req, 'id'), titulo);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function deletePermanente(req: Request, res: Response): Promise<void> {
  const { titulo } = eliminarQuerySchema.parse(req.query);
  await tutorialsAdminService.eliminarDefinitivo(requireUser(req), requireParam(req, 'id'), titulo);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postImagen(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el archivo de la imagen.');
  const { carpeta } = subirImagenQuerySchema.parse(req.query);
  const url = await tutorialsAdminService.subirImagen(carpeta, file.buffer, file.mimetype, file.originalname);
  res.json({ url });
}

export async function postAudio(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el archivo de audio.');
  const url = await tutorialsAdminService.subirAudio(file.buffer, file.mimetype, file.originalname);
  res.json({ url });
}
