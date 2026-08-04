import type { Request, Response } from 'express';
import * as gamesService from '../services/games/GamesService';
import { registrarPartidaSchema } from '../validators/games.validators';
import { requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function postRegistrarPartida(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { juego, resultado } = registrarPartidaSchema.parse(req.body);
  await gamesService.registrarPartida(user, juego, resultado ?? null);
  res.status(StatusCodes.NO_CONTENT).end();
}
