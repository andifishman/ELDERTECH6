import { Router } from 'express';
import * as controller from '../controllers/games.controller';
import * as jardinNivelesController from '../controllers/jardinNiveles.controller';
import * as palabrasController from '../controllers/palabras.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

export const gamesRouter = Router();

gamesRouter.use(requireAuth);
gamesRouter.post('/log', asyncHandler(controller.postRegistrarPartida));
gamesRouter.get('/jardin/niveles', asyncHandler(jardinNivelesController.getProgreso));
gamesRouter.post('/jardin/niveles/:nivel/completar', asyncHandler(jardinNivelesController.postCompletarNivel));
gamesRouter.get('/palabras/progreso', asyncHandler(palabrasController.getProgreso));
gamesRouter.post('/palabras/niveles/:nivel/completar', asyncHandler(palabrasController.postCompletarNivel));
gamesRouter.post('/palabras/pista', asyncHandler(palabrasController.postUsarPista));
gamesRouter.get('/:juego/estadisticas', asyncHandler(controller.getEstadisticasPuntaje));
gamesRouter.get('/:juego/top', asyncHandler(controller.getTopPuntajes));
