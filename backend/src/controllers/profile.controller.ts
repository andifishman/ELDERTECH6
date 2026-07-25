import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as profileService from '../services/profile/ProfileService';
import { actualizarPerfilSchema } from '../validators/profile.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

export async function patchPerfil(req: Request, res: Response): Promise<void> {
  const input = actualizarPerfilSchema.parse(req.body);
  await profileService.actualizar(requireUser(req), input);
  res.status(204).end();
}

export async function postAvatar(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const file = req.file;
  if (!file) throw new HttpError(400, 'Falta el archivo de la foto.');
  const url = await profileService.subirAvatar(user, file.buffer, file.mimetype, file.originalname);
  res.json({ url });
}
