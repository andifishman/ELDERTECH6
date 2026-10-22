import type { Request, Response } from 'express';
import { z } from 'zod';
import * as palabrasService from '../services/games/PalabrasService';
import { requireUser } from '../utils/validators';

const completarParamsSchema = z.object({
  nivel: z.coerce.number().int().min(1).max(palabrasService.TOTAL_NIVELES_PALABRAS),
});
const completarBodySchema = z.object({
  pistasUsadas: z.number().int().min(0).max(50).optional(),
});

export async function getProgreso(req: Request, res: Response): Promise<void> {
  res.json(await palabrasService.obtenerProgreso(requireUser(req)));
}

export async function postCompletarNivel(req: Request, res: Response): Promise<void> {
  const { nivel } = completarParamsSchema.parse(req.params);
  const { pistasUsadas } = completarBodySchema.parse(req.body ?? {});
  res.json(await palabrasService.completarNivel(requireUser(req), nivel, pistasUsadas ?? 0));
}

export async function postUsarPista(req: Request, res: Response): Promise<void> {
  res.json(await palabrasService.usarPista(requireUser(req)));
}
