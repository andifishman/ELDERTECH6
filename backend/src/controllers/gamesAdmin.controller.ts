import type { Request, Response } from 'express';
import { z } from 'zod';
import * as rankingService from '../services/games/GamesRankingService';
import { JUEGOS } from '../repositories/gamesRepository';
import { requireUser } from '../utils/validators';

const querySchema = z.object({
  periodo: z.enum(['todo', 'semana', 'mes']).default('todo'),
  fresh: z.enum(['1', 'true']).optional(),
});
const rankingParamsSchema = z.object({ juego: z.enum(JUEGOS) });

export async function getResumen(req: Request, res: Response): Promise<void> {
  const { periodo, fresh } = querySchema.parse(req.query);
  res.json(await rankingService.resumen(requireUser(req), periodo, !!fresh));
}

export async function getRanking(req: Request, res: Response): Promise<void> {
  const { juego } = rankingParamsSchema.parse(req.params);
  const { periodo, fresh } = querySchema.parse(req.query);
  res.json(await rankingService.ranking(requireUser(req), juego, periodo, !!fresh));
}
