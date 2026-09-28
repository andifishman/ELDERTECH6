import type { Request, Response } from 'express';
import * as jardinNivelesService from '../services/games/JardinNivelesService';
import { completarNivelParamsSchema, completarNivelBodySchema } from '../validators/jardinNiveles.validators';
import { requireUser } from '../utils/validators';

export async function getProgreso(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  res.json(await jardinNivelesService.obtenerProgreso(user));
}

export async function postCompletarNivel(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { nivel } = completarNivelParamsSchema.parse(req.params);
  const { estrellas, movimientosUsados } = completarNivelBodySchema.parse(req.body);
  res.json(await jardinNivelesService.completarNivel(user, nivel, estrellas, movimientosUsados));
}
