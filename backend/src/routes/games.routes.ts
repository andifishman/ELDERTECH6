import { Router } from 'express';
import * as controller from '../controllers/games.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const gamesRouter = Router();

gamesRouter.use(requireAuth);
gamesRouter.post('/log', asyncHandler(controller.postRegistrarPartida));
gamesRouter.get('/:juego/estadisticas', asyncHandler(controller.getEstadisticasPuntaje));
gamesRouter.get('/:juego/top', asyncHandler(controller.getTopPuntajes));
