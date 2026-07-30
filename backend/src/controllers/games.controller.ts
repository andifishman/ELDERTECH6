import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as gamesService from '../services/games/GamesService';
import { registrarPartidaSchema } from '../validators/games.validators';

export async function postRegistrarPartida(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'No autenticado.');
  const { juego, resultado } = registrarPartidaSchema.parse(req.body);
  await gamesService.registrarPartida(req.user, juego, resultado ?? null);
  res.status(204).end();
}
