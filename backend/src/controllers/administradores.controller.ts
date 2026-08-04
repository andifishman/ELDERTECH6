import type { Request, Response } from 'express';
import * as administradoresService from '../services/administradores/AdministradoresService';
import { cambiarRolSchema } from '../validators/administradores.validators';
import { requireParam, requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function getAdministradores(req: Request, res: Response): Promise<void> {
  res.json(await administradoresService.listar(requireUser(req)));
}

export async function patchRol(req: Request, res: Response): Promise<void> {
  const { rol } = cambiarRolSchema.parse(req.body);
  await administradoresService.cambiarRol(requireUser(req), requireParam(req, 'id'), rol);
  res.status(StatusCodes.NO_CONTENT).end();
}
