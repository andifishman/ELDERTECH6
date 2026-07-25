import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as administradoresService from '../services/administradores/AdministradoresService';
import { cambiarRolSchema } from '../validators/administradores.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Falta el parámetro ${name}.`);
  return value;
}

export async function getAdministradores(req: Request, res: Response): Promise<void> {
  res.json(await administradoresService.listar(requireUser(req)));
}

export async function patchRol(req: Request, res: Response): Promise<void> {
  const { rol } = cambiarRolSchema.parse(req.body);
  await administradoresService.cambiarRol(requireUser(req), requireParam(req, 'id'), rol);
  res.status(204).end();
}
