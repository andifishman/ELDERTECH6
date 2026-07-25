import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as configuracionService from '../services/configuracion/ConfiguracionService';
import { actualizarConfiguracionSchema } from '../validators/configuracion.validators';

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  return req.user;
}

export async function getConfiguracion(req: Request, res: Response): Promise<void> {
  res.json(await configuracionService.obtener(requireUser(req)));
}

export async function putConfiguracion(req: Request, res: Response): Promise<void> {
  const input = actualizarConfiguracionSchema.parse(req.body);
  await configuracionService.actualizar(requireUser(req), {
    nombre: input.nombre,
    direccion: input.direccion || null,
    telefono: input.telefono || null,
    email: input.email || null,
    logo_url: input.logo_url || null,
  });
  res.status(204).end();
}
