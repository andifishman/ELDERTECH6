import { Router } from 'express';
import * as controller from '../controllers/gamesAdmin.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { asyncHandler } from '../utils/asyncHandler';

export const gamesAdminRouter = Router();

gamesAdminRouter.use(requireAuth, requireAdmin);

gamesAdminRouter.get('/resumen', requirePermission('juegos', 'ver'), asyncHandler(controller.getResumen));
gamesAdminRouter.get('/ranking/:juego', requirePermission('juegos', 'ver'), asyncHandler(controller.getRanking));
