import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as tutorialsAdminService from '../services/tutorials/TutorialsAdminService';
import {
  crearCategoriaSchema,
  eliminarQuerySchema,
  subirImagenQuerySchema,
  tutorialAdminInputSchema,
} from '../validators/tutorialsAdmin.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Falta el parámetro ${name}.`);
  return value;
}

export async function getTodos(_req: Request, res: Response): Promise<void> {
  res.json(await tutorialsAdminService.listarTodos());
}

export async function getEliminados(_req: Request, res: Response): Promise<void> {
  res.json(await tutorialsAdminService.listarEliminados());
}

export async function postCategoria(req: Request, res: Response): Promise<void> {
  const { nombre, emoji } = crearCategoriaSchema.parse(req.body);
  const id = await tutorialsAdminService.crearCategoria(requireUser(req), nombre, emoji);
  res.status(201).json({ id });
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
  res.status(201).json({ id });
}

export async function patchTutorial(req: Request, res: Response): Promise<void> {
  const input = tutorialAdminInputSchema.parse(req.body);
  await tutorialsAdminService.actualizar(requireUser(req), requireParam(req, 'id'), input);
  res.status(204).end();
}

export async function deleteTutorial(req: Request, res: Response): Promise<void> {
  const { titulo } = eliminarQuerySchema.parse(req.query);
  await tutorialsAdminService.eliminar(requireUser(req), requireParam(req, 'id'), titulo);
  res.status(204).end();
}

export async function postRestaurar(req: Request, res: Response): Promise<void> {
  const { titulo } = eliminarQuerySchema.parse(req.query);
  await tutorialsAdminService.restaurar(requireUser(req), requireParam(req, 'id'), titulo);
  res.status(204).end();
}

export async function deletePermanente(req: Request, res: Response): Promise<void> {
  const { titulo } = eliminarQuerySchema.parse(req.query);
  await tutorialsAdminService.eliminarDefinitivo(requireUser(req), requireParam(req, 'id'), titulo);
  res.status(204).end();
}

export async function postImagen(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(400, 'Falta el archivo de la imagen.');
  const { carpeta } = subirImagenQuerySchema.parse(req.query);
  const url = await tutorialsAdminService.subirImagen(carpeta, file.buffer, file.mimetype, file.originalname);
  res.json({ url });
}

export async function postAudio(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(400, 'Falta el archivo de audio.');
  const url = await tutorialsAdminService.subirAudio(file.buffer, file.mimetype, file.originalname);
  res.json({ url });
}
