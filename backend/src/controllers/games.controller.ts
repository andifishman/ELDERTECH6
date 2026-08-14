import type { Request, Response } from 'express';
import * as gamesService from '../services/games/GamesService';
import { registrarPartidaSchema, estadisticasParamsSchema } from '../validators/games.validators';
import { requireUser } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function postRegistrarPartida(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { juego, resultado, puntos } = registrarPartidaSchema.parse(req.body);
  await gamesService.registrarPartida(user, juego, resultado ?? null, puntos ?? null);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function getEstadisticasPuntaje(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { juego } = estadisticasParamsSchema.parse(req.params);
  res.json(await gamesService.obtenerEstadisticasPuntaje(user, juego));
}
